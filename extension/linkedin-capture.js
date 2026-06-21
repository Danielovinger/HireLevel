(function () {
  const wrapperId = "hirelevel-capture-wrapper";
  const buttonId = "hirelevel-capture";
  const selectId = "hirelevel-board-select";
  const statusSelectId = "hirelevel-status-select";
  let selectedBoardMemory = "";
  let selectedStatusMemory = "applied";
  let latestCaptureId = "";

  init();

  async function init() {
    await addCaptureControls();
    chrome.storage.onChanged.addListener(handleStorageChange);
    observePageChanges();
  }

  async function addCaptureControls() {
    if (document.getElementById(buttonId)) return;
    if (!document.body) {
      window.setTimeout(addCaptureControls, 300);
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.id = wrapperId;
    const position = await getPosition();
    const theme = await getTheme();
    wrapper.style.cssText = [
      "position:fixed",
      `left:${position.left}px`,
      `top:${position.top}px`,
      "z-index:2147483647",
      "display:grid",
      "gap:8px",
      "width:220px",
      "font:600 14px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    ].join(";");

    const handle = document.createElement("div");
    handle.textContent = "HireLevel";
    handle.title = "Drag to move";
    handle.style.cssText = [
      `border:1px solid ${theme.line}`,
      "border-radius:8px",
      `background:${theme.panel}`,
      `color:${theme.accentDark}`,
      "min-height:40px",
      "line-height:20px",
      "padding:9px 12px",
      `box-shadow:${theme.shadow}`,
      "cursor:move",
      "user-select:none",
      "text-align:center",
    ].join(";");
    handle.addEventListener("pointerdown", (event) => startDrag(event, wrapper));
    wrapper.appendChild(handle);

    const boards = await getBoards();
    if (boards.length > 1) {
      wrapper.appendChild(createFieldLabel("Select board", theme));
      const select = document.createElement("select");
      select.id = selectId;
      select.style.cssText = getSelectStyles(theme).join(";");
      boards.forEach((board) => {
        const option = document.createElement("option");
        option.value = board.id;
        option.textContent = board.name;
        select.appendChild(option);
      });
      if (boards.some((board) => board.id === selectedBoardMemory)) select.value = selectedBoardMemory;
      select.addEventListener("change", () => {
        selectedBoardMemory = select.value;
      });
      wrapper.appendChild(select);
    }

    wrapper.appendChild(createFieldLabel("Add to", theme));
    const statusSelect = document.createElement("select");
    statusSelect.id = statusSelectId;
    statusSelect.title = "Choose whether to save or apply";
    statusSelect.style.cssText = getSelectStyles(theme).join(";");
    [
      { value: "applied", label: "Applied" },
      { value: "saved", label: "Saved Jobs" },
    ].forEach((status) => {
      const option = document.createElement("option");
      option.value = status.value;
      option.textContent = status.label;
      statusSelect.appendChild(option);
    });
    statusSelect.value = selectedStatusMemory;
    statusSelect.addEventListener("change", () => {
      selectedStatusMemory = getSelectedInitialStatus();
    });
    wrapper.appendChild(statusSelect);

    const button = document.createElement("button");
    button.id = buttonId;
    button.type = "button";
    button.textContent = "Add to HireLevel";
    button.style.cssText = [
      `border:1px solid ${theme.accentDark}`,
      "border-radius:8px",
      `background:${theme.accent}`,
      "color:white",
      "width:220px",
      "min-height:44px",
      "line-height:20px",
      "padding:10px 14px",
      `box-shadow:${theme.shadow}`,
      "cursor:pointer",
    ].join(";");

    button.addEventListener("click", captureCurrentJob);
    wrapper.appendChild(button);
    document.body.appendChild(wrapper);
  }

  function observePageChanges() {
    let lastUrl = location.href;
    let restoreTimer = null;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        document.getElementById(wrapperId)?.remove();
        addCaptureControls();
        return;
      }
      if (document.getElementById(buttonId)) return;
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(addCaptureControls, 300);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function captureCurrentJob() {
    const button = document.getElementById(buttonId);
    const captureId = createCaptureId();
    latestCaptureId = captureId;
    const boards = await getBoards();
    const selectedBoardId = document.getElementById(selectId)?.value || (boards.length === 1 ? boards[0].id : null);
    selectedBoardMemory = selectedBoardId || selectedBoardMemory;
    const selectedBoard = boards.find((board) => board.id === selectedBoardId);
    const status = getSelectedInitialStatus();
    selectedStatusMemory = status;
    const job = { ...scrapeLinkedInJob(), captureId, boardId: selectedBoardId, boardName: selectedBoard?.name || "", status };
    await writeDebugLog({ type: "capture-clicked", source: "linkedin", captureId, url: location.href, job });

    if (!job.title || !job.company) {
      await writeDebugLog({
        type: "capture-failed",
        reason: "missing-title-or-company",
        url: location.href,
        job,
        candidates: collectDebugCandidates(),
      });
      flash(button, "Could not read job", "#b42318");
      return;
    }

    if (selectedBoard?.jobIdentities?.includes(getCaptureIdentity(job))) {
      await writeDebugLog({ type: "capture-duplicate", source: "linkedin", captureId, url: location.href, job });
      flash(button, "Job already exists", "#b42318");
      return;
    }

    try {
      const stored = await safeStorageSet({ [getPendingJobKey(captureId)]: job });
      if (!stored) throw new Error("Extension storage is unavailable. Reload the page after reloading the extension.");
      await writeDebugLog({ type: "capture-succeeded", source: "linkedin", captureId, url: location.href, job });
      flash(button, selectedBoard ? `Captured for ${selectedBoard.name}` : "Captured. Open tracker.", "#176c42");
    } catch (error) {
      await writeDebugLog({ type: "capture-storage-failed", source: "linkedin", captureId, url: location.href, message: error?.message || String(error), job });
      flash(button, "Storage failed", "#b42318");
    }
  }

  async function getBoards() {
    const { hireLevelBoards = [] } = await safeStorageGet("hireLevelBoards");
    return Array.isArray(hireLevelBoards) ? hireLevelBoards : [];
  }

  async function getTheme() {
    const { hireLevelTheme } = await safeStorageGet("hireLevelTheme");
    return {
      panel: hireLevelTheme?.panel || "white",
      ink: hireLevelTheme?.ink || "#1d2433",
      line: hireLevelTheme?.line || "#c8dfc2",
      accent: hireLevelTheme?.accent || "#2f9b61",
      accentDark: hireLevelTheme?.accentDark || "#176c42",
      accentSoft: hireLevelTheme?.accentSoft || "#d8f1dd",
      shadow: hireLevelTheme?.shadow || "0 10px 28px rgba(0,0,0,.14)",
    };
  }

  function getSelectStyles(theme) {
    return [
      `border:1px solid ${theme.accentDark}`,
      "border-radius:8px",
      `background:${theme.panel}`,
      `color:${theme.ink}`,
      "width:220px",
      "max-width:220px",
      "height:44px",
      "min-height:44px",
      "line-height:20px",
      "padding:10px 12px",
      `box-shadow:${theme.shadow}`,
      "box-sizing:border-box",
      "font-size:14px",
    ];
  }

  function createFieldLabel(text, theme) {
    const label = document.createElement("div");
    label.textContent = text;
    label.style.cssText = [
      `color:${theme.accentDark}`,
      "font-size:12px",
      "font-weight:800",
      "line-height:14px",
      "margin:2px 0 -4px",
      "padding:0 2px",
      "letter-spacing:0",
    ].join(";");
    return label;
  }

  function getSelectedInitialStatus() {
    const status = document.getElementById(statusSelectId)?.value;
    return status === "saved" ? "saved" : "applied";
  }

  async function getPosition() {
    const { hireLevelCapturePosition } = await safeStorageGet("hireLevelCapturePosition");
    if (hireLevelCapturePosition && Number.isFinite(hireLevelCapturePosition.left) && Number.isFinite(hireLevelCapturePosition.top)) {
      return {
        left: Math.max(12, Math.min(window.innerWidth - 240, hireLevelCapturePosition.left)),
        top: Math.max(12, Math.min(window.innerHeight - 90, hireLevelCapturePosition.top)),
      };
    }
    return { left: Math.max(12, window.innerWidth - 250), top: Math.max(12, window.innerHeight - 130) };
  }

  function startDrag(event, wrapper) {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const rect = wrapper.getBoundingClientRect();
    const startLeft = rect.left;
    const startTop = rect.top;

    const move = (moveEvent) => {
      const left = Math.max(12, Math.min(window.innerWidth - wrapper.offsetWidth - 12, startLeft + moveEvent.clientX - startX));
      const top = Math.max(12, Math.min(window.innerHeight - wrapper.offsetHeight - 12, startTop + moveEvent.clientY - startY));
      wrapper.style.left = `${left}px`;
      wrapper.style.top = `${top}px`;
    };

    const stop = async () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
      const rect = wrapper.getBoundingClientRect();
      await safeStorageSet({ hireLevelCapturePosition: { left: rect.left, top: rect.top } });
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
  }

  function scrapeLinkedInJob() {
    const selectedCard = getSelectedJobCard();
    const detailPane = getDetailPane();
    const title = firstLikelyJobTitle([
      ...textsFromSelectorsIn(detailPane, [
        ".job-details-jobs-unified-top-card__job-title h1",
        ".job-details-jobs-unified-top-card__job-title",
        ".jobs-unified-top-card__job-title h1",
        ".jobs-unified-top-card__job-title",
        ".job-details-jobs-unified-top-card__job-title-link",
        ".job-details-jobs-unified-top-card__title",
        ".jobs-details-top-card__job-title",
        "h1",
      ]),
      inferTitleFromCard(selectedCard),
      inferTitleFromPane(detailPane),
    ]);
    const company = cleanCompany(
      textFromSelectorsIn(detailPane, [
        ".job-details-jobs-unified-top-card__company-name a",
        ".job-details-jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name",
        ".job-details-jobs-unified-top-card__primary-description a",
        ".jobs-unified-top-card__primary-description a",
        "a[href*='/company/']",
      ])
    ) || inferCompanyFromPane(detailPane) || inferCompanyFromCard(selectedCard);
    const description = textFromSelectorsIn(detailPane, [
      ".jobs-description__content",
      ".jobs-box__html-content",
      "#job-details",
      ".jobs-description-content__text",
    ]) || inferDescriptionFromPane(detailPane);
    const companyLogoUrl = inferCompanyLogoUrl(detailPane, selectedCard);
    return { title, company, description, companyLogoUrl, url: location.href, capturedAt: new Date().toISOString(), source: "linkedin" };
  }

  function getSelectedJobCard() {
    const currentJobId = getCurrentLinkedInJobId();
    if (currentJobId) {
      const cardById =
        document.querySelector(`[data-occludable-job-id="${currentJobId}"]`) ||
        document.querySelector(`[data-job-id="${currentJobId}"]`) ||
        document.querySelector(`a[href*="/jobs/view/${currentJobId}"]`)?.closest("li, .job-card-container, .jobs-search-results__list-item");
      if (cardById) return cardById;
    }
    return (
      document.querySelector(".jobs-search-results-list__list-item--active") ||
      document.querySelector(".job-card-container--clickable[aria-current='true']") ||
      document.querySelector(".job-card-container--clickable.jobs-card-container--active") ||
      document.querySelector(".jobs-search-results-list__list-item")
    );
  }

  function getDetailPane() {
    return (
      document.querySelector(".jobs-search__job-details") ||
      document.querySelector(".scaffold-layout__detail") ||
      document.querySelector(".jobs-details") ||
      document.querySelector(".job-view-layout") ||
      document.querySelector("main")
    );
  }

  function inferTitleFromPane(pane) {
    if (!pane) return "";
    return firstLikelyJobTitle(
      Array.from(pane.querySelectorAll("[data-test-job-title], h1, h2"), (heading) => cleanText(heading.innerText || heading.textContent || ""))
    );
  }

  function inferCompanyFromPane(pane) {
    if (!pane) return "";
    const companyLink = pane.querySelector("a[href*='/company/']");
    if (companyLink) return cleanCompany(companyLink.innerText);
    const lines = getCleanLines(pane).slice(0, 8);
    const title = inferTitleFromPane(pane);
    const afterTitleIndex = lines.findIndex((line) => line === title);
    const companyLine = lines.slice(Math.max(0, afterTitleIndex + 1)).find(isLikelyCompanyLine);
    return cleanCompany(companyLine || "");
  }

  function inferTitleFromCard(card) {
    if (!card) return "";
    return firstLikelyJobTitle([
      card.querySelector(".job-card-list__title--link")?.innerText,
      card.querySelector(".job-card-list__title")?.innerText,
      card.querySelector("a[href*='/jobs/view/']")?.innerText,
      card.querySelector("strong")?.innerText,
    ]);
  }

  function getCurrentLinkedInJobId() {
    const url = new URL(location.href);
    const queryId = url.searchParams.get("currentJobId");
    if (queryId && /^\d+$/.test(queryId)) return queryId;
    return url.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] || "";
  }

  function firstLikelyJobTitle(candidates) {
    return candidates.map(cleanText).find(isLikelyJobTitle) || "";
  }

  function isLikelyJobTitle(title) {
    const lower = cleanText(title).toLowerCase().replace(/[?!]+$/, "");
    if (!lower || lower.length > 180) return false;
    const blockedTitles = [
      "are these results helpful",
      "is this information helpful",
      "about the job",
      "similar jobs",
      "people you can reach out to",
      "meet the hiring team",
      "candidates who clicked apply",
      "did you finish applying",
    ];
    if (blockedTitles.includes(lower)) return false;
    if (/^(are|were) these (search )?results helpful\b/.test(lower)) return false;
    if (lower.startsWith("job match is ") || lower.startsWith("see how you compare")) return false;
    return true;
  }

  function inferCompanyFromCard(card) {
    if (!card) return "";
    const lines = getCleanLines(card);
    const title = inferTitleFromCard(card);
    return cleanCompany(lines.find((line) => line !== title && isLikelyCompanyLine(line)) || "");
  }

  function inferDescriptionFromPane(pane) {
    if (!pane) return "";
    const lines = getCleanLines(pane);
    const start = lines.findIndex((line) => line.toLowerCase() === "about the job");
    if (start === -1) return "";
    return lines.slice(start + 1).filter(isLikelyDescriptionLine).join("\n");
  }

  function inferCompanyLogoUrl(detailPane, selectedCard) {
    const image =
      detailPane?.querySelector("img[alt*='logo' i], img[class*='logo' i], img[src*='media.licdn.com']") ||
      selectedCard?.querySelector("img[alt*='logo' i], img[class*='logo' i], img[src*='media.licdn.com']");
    const src = image?.currentSrc || image?.src || "";
    if (!src || src.startsWith("data:")) return "";
    return src;
  }

  function getCleanLines(element) {
    return cleanText(element?.innerText || element?.textContent || "")
      .split(/\n|(?<=\.)\s+(?=[A-Z])/)
      .map((line) => cleanText(line))
      .filter(Boolean);
  }

  function isLikelyCompanyLine(line) {
    const lower = cleanText(line).toLowerCase();
    if (!line || line.length > 90) return false;
    if (lower.includes("applicant") || lower.includes("promoted") || lower.includes("easy apply")) return false;
    if (lower.includes("tel aviv") || lower.includes("israel") || lower.includes("hybrid") || lower.includes("remote")) return false;
    if (lower.includes("applied") || lower.includes("week ago") || lower.includes("month ago")) return false;
    return true;
  }

  function isLikelyDescriptionLine(line) {
    const lower = line.toLowerCase();
    if (["show more", "show less", "apply", "easy apply", "save"].includes(lower)) return false;
    if (lower.startsWith("people you can reach out to") || lower.startsWith("meet the hiring team")) return false;
    return true;
  }

  function collectDebugCandidates() {
    const selectedCard = getSelectedJobCard();
    const detailPane = getDetailPane();
    return {
      titleSelectors: [
        textFromSelectorsIn(detailPane, [".job-details-jobs-unified-top-card__job-title", ".jobs-unified-top-card__job-title", "h1"]),
        inferTitleFromPane(detailPane),
        inferTitleFromCard(selectedCard),
      ].filter(Boolean),
      companySelectors: [
        textFromSelectorsIn(detailPane, [".job-details-jobs-unified-top-card__company-name", ".jobs-unified-top-card__company-name", "a[href*='/company/']"]),
        inferCompanyFromPane(detailPane),
        inferCompanyFromCard(selectedCard),
      ].filter(Boolean),
      selectedCardText: getCleanLines(selectedCard).slice(0, 12),
      detailPaneText: getCleanLines(detailPane).slice(0, 20),
    };
  }

  async function writeDebugLog(entry) {
    const { hireLevelDebugLog = [] } = await safeStorageGet("hireLevelDebugLog");
    const nextLog = Array.isArray(hireLevelDebugLog) ? hireLevelDebugLog.slice(-24) : [];
    nextLog.push({ ...entry, at: new Date().toISOString() });
    await safeStorageSet({ hireLevelDebugLog: nextLog });
  }

  async function safeStorageGet(keys) {
    try {
      if (typeof chrome === "undefined" || !chrome.runtime?.id) return {};
      return await chrome.storage.local.get(keys);
    } catch {
      return {};
    }
  }

  async function safeStorageSet(values) {
    try {
      if (typeof chrome === "undefined" || !chrome.runtime?.id) return false;
      await chrome.storage.local.set(values);
      return true;
    } catch {
      return false;
    }
  }

  async function handleStorageChange(changes, areaName) {
    if (areaName !== "local") return;
    const resultKey = latestCaptureId ? `hireLevelCaptureResult_${latestCaptureId}` : "";
    const result = resultKey ? changes[resultKey]?.newValue : null;
    if (result) {
      if (result.action === "existing") flash(document.getElementById(buttonId), "Job already exists", "#b42318");
      try {
        await chrome.storage.local.remove(resultKey);
      } catch {}
    }
    if (!changes.hireLevelBoards && !changes.hireLevelTheme) return;
    document.getElementById(wrapperId)?.remove();
    addCaptureControls();
  }

  function textFromSelectorsIn(root, selectors) {
    if (!root) return "";
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      const text = cleanText(element?.innerText || element?.textContent || "");
      if (text) return text;
    }
    return "";
  }

  function textsFromSelectorsIn(root, selectors) {
    if (!root) return [];
    return selectors
      .map((selector) => {
        const element = root.querySelector(selector);
        return cleanText(element?.innerText || element?.textContent || "");
      })
      .filter(Boolean);
  }

  function cleanCompany(text) {
    return cleanText(text.split(" · ")[0].split(" | ")[0]);
  }

  function cleanText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function createCaptureId() {
    return `capture-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function getPendingJobKey(captureId) {
    return `pendingHireLevelJob_${captureId}`;
  }

  function getCaptureIdentity(job) {
    return job?.source && job?.externalId ? `${job.source}:${job.externalId}` : job?.url || "";
  }

  function flash(button, text, color) {
    if (!button) return;
    if (!button.dataset.hireLevelDefaultText) {
      button.dataset.hireLevelDefaultText = button.textContent;
      button.dataset.hireLevelDefaultBackground = button.style.background;
    }
    window.clearTimeout(button.hireLevelFlashTimer);
    button.textContent = text;
    button.style.background = color;
    button.hireLevelFlashTimer = window.setTimeout(() => {
      button.textContent = button.dataset.hireLevelDefaultText;
      button.style.background = button.dataset.hireLevelDefaultBackground;
    }, 1800);
  }
})();
