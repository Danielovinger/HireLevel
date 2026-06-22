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
    const detailPane = getDetailPane();
    const companyFromPane = cleanCompany(
      textFromSelectorsIn(detailPane, [
        ".job-details-jobs-unified-top-card__company-name a",
        ".job-details-jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name",
        ".job-details-jobs-unified-top-card__primary-description a",
        ".jobs-unified-top-card__primary-description a",
        "a[href*='/company/']",
      ])
    ) || inferCompanyFromPane(detailPane);
    const selectedCard = getSelectedJobCard(companyFromPane);
    const company = companyFromPane || inferCompanyFromCard(selectedCard);
    const title = firstLikelyJobTitle([
      inferTitleFromCard(selectedCard),
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
      inferTitleFromPane(detailPane, company),
      inferTitleFromDocumentMetadata(),
    ]);
    const descriptionElement = getDescriptionElement();
    const description = textFromSelectorsIn(detailPane, [
      ".jobs-description__content",
      ".jobs-box__html-content",
      "#job-details",
      ".jobs-description-content__text",
    ]) || getCleanLines(descriptionElement).join("\n") || inferDescriptionFromPane(detailPane);
    const companyLogoUrl = inferCompanyLogoUrl(detailPane, selectedCard, company);
    return {
      title,
      company,
      description,
      companyLogoUrl,
      externalId: getCurrentLinkedInJobId(),
      url: location.href,
      capturedAt: new Date().toISOString(),
      source: "linkedin",
    };
  }

  function getSelectedJobCard(company = "") {
    const currentJobId = getCurrentLinkedInJobId();
    if (currentJobId) {
      const cardById = findJobCardById(currentJobId);
      if (cardById) return cardById;
    }

    const activeCard =
      document.querySelector(".jobs-search-results-list__list-item--active") ||
      document.querySelector(".job-card-container--clickable[aria-current='true']") ||
      document.querySelector(".job-card-container--clickable[aria-selected='true']") ||
      document.querySelector(".job-card-container--clickable.jobs-card-container--active");
    if (activeCard && (!company || elementContainsText(activeCard, company))) return activeCard;

    if (company) {
      const cards = Array.from(
        new Set(
          document.querySelectorAll(
            ".jobs-search-results-list__list-item, .jobs-search-results__list-item, .job-card-container, [data-occludable-job-id]"
          )
        )
      );
      const companyCard = cards.find((card) => elementContainsText(card, company));
      if (companyCard) return companyCard;
    }

    return activeCard || document.querySelector(".jobs-search-results-list__list-item, .jobs-search-results__list-item, .job-card-container");
  }

  function getDetailPane() {
    const knownPane =
      document.querySelector(".jobs-search__job-details") ||
      document.querySelector(".jobs-search__job-details--container") ||
      document.querySelector(".jobs-search__job-details--wrapper") ||
      document.querySelector(".scaffold-layout__detail") ||
      document.querySelector(".jobs-details") ||
      document.querySelector(".job-view-layout");
    if (knownPane) return knownPane;

    const descriptionElement = getDescriptionElement();
    let candidate = descriptionElement;
    let fallback = null;
    for (let depth = 0; candidate && depth < 10; depth += 1, candidate = candidate.parentElement) {
      if (candidate.matches?.("main")) break;
      const lines = getCleanLines(candidate);
      const aboutIndex = lines.findIndex((line) => line.toLowerCase() === "about the job");
      const hasCompany = Boolean(candidate.querySelector?.("a[href*='/company/']"));
      const hasHeading = Boolean(candidate.querySelector?.("h1, h2, [data-test-job-title]"));
      if (aboutIndex > 0 && hasHeading) fallback = candidate;
      if (aboutIndex > 0 && hasCompany) return candidate;
    }
    return fallback;
  }

  function getDescriptionElement() {
    return document.querySelector(
      ".jobs-description__content, .jobs-box__html-content, #job-details, .jobs-description-content__text"
    );
  }

  function findJobCardById(jobId) {
    const resultsRoot =
      document.querySelector(".jobs-search-results-list") ||
      document.querySelector(".scaffold-layout__list") ||
      document.querySelector("[class*='jobs-search-results']");
    const roots = [resultsRoot, document].filter(Boolean);
    const selectors = [
      `[data-occludable-job-id="${jobId}"]`,
      `[data-job-id="${jobId}"]`,
      `[data-entity-urn*="${jobId}"]`,
      `a[href*="/jobs/view/${jobId}"]`,
      `a[href*="currentJobId=${jobId}"]`,
      `a[href*="${jobId}"]`,
    ];

    for (const root of roots) {
      for (const selector of selectors) {
        const match = root.querySelector?.(selector);
        if (!match) continue;
        const card = findCardContainer(match);
        if (card) return card;
      }
    }
    return null;
  }

  function findCardContainer(element) {
    const knownCard = element.closest?.(
      ".jobs-search-results-list__list-item, .jobs-search-results__list-item, .job-card-container, [data-view-name='job-card'], [data-occludable-job-id], [data-job-id], li[role='listitem']"
    );
    if (knownCard) return knownCard;

    let candidate = element;
    let best = null;
    for (let depth = 0; candidate && depth < 7; depth += 1, candidate = candidate.parentElement) {
      const textLength = cleanText(candidate.innerText || candidate.textContent || "").length;
      if (textLength > 1800) break;
      if (textLength >= 10) best = candidate;
    }
    return best;
  }

  function inferTitleFromPane(pane, company = "") {
    if (!pane) return "";
    const lines = getCleanLines(pane).slice(0, 24);
    const companyKey = normalizeMatchText(company);
    const companyIndex = companyKey ? lines.findIndex((line) => normalizeMatchText(line).includes(companyKey)) : -1;
    const titleAfterCompany =
      companyIndex >= 0
        ? lines.slice(companyIndex + 1, companyIndex + 6).find((line) => isLikelyPaneTitleLine(line, company))
        : "";
    return firstLikelyJobTitle(
      [
        titleAfterCompany,
        ...Array.from(pane.querySelectorAll("[data-test-job-title], h1, h2"), (heading) => cleanText(heading.innerText || heading.textContent || "")),
      ]
    );
  }

  function inferCompanyFromPane(pane) {
    if (!pane) return "";
    const companyLink = pane.querySelector("a[href*='/company/']");
    if (companyLink) return cleanCompany(companyLink.innerText);
    const lines = getCleanLines(pane).slice(0, 8);
    const title = inferTitleFromPane(pane);
    const titleIndex = lines.findIndex((line) => line === title);
    const companyBeforeTitle = titleIndex > 0 ? lines.slice(Math.max(0, titleIndex - 3), titleIndex).reverse().find(isLikelyCompanyLine) : "";
    const companyAfterTitle = lines.slice(Math.max(0, titleIndex + 1)).find(isLikelyCompanyLine);
    const companyLine = companyBeforeTitle || companyAfterTitle || lines.find(isLikelyCompanyLine);
    return cleanCompany(companyLine || "");
  }

  function inferTitleFromCard(card) {
    if (!card) return "";
    return firstLikelyJobTitle([
      card.querySelector(".job-card-list__title--link")?.innerText,
      card.querySelector(".job-card-list__title")?.innerText,
      card.querySelector("[data-view-name='job-card'] a")?.innerText,
      card.querySelector("a[href*='/jobs/view/']")?.innerText,
      card.querySelector("a[href*='currentJobId=']")?.innerText,
      card.querySelector("strong")?.innerText,
    ]);
  }

  function inferTitleFromDocumentMetadata() {
    const metadataTitle = cleanText(
      document.querySelector("meta[property='og:title']")?.content ||
        document.querySelector("meta[name='twitter:title']")?.content ||
        ""
    );
    const pageTitle = cleanText(document.title || "").replace(/\s*\|\s*LinkedIn\s*$/i, "");
    return firstLikelyJobTitle([metadataTitle, pageTitle]);
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
      "take the next step in your job search",
      "application status",
      "application submitted",
      "premium",
      "how promoted jobs are ranked",
    ];
    if (blockedTitles.includes(lower)) return false;
    if (/^(are|were) these (search )?results helpful\b/.test(lower)) return false;
    if (/^\d+\+?\s+results?$/.test(lower)) return false;
    if (lower.startsWith("job match is ") || lower.startsWith("see how you compare") || lower.startsWith("take the next step")) return false;
    if (lower.startsWith("exclusive job seeker insights about ")) return false;
    if (lower.includes(" jobs in ") || lower.includes("job search")) return false;
    return true;
  }

  function isLikelyPaneTitleLine(line, company = "") {
    const lower = cleanText(line).toLowerCase();
    if (!isLikelyJobTitle(line)) return false;
    if (company && normalizeMatchText(line) === normalizeMatchText(company)) return false;
    if (line.includes("\u00b7")) return false;
    if (lower.includes("applicant") || lower.includes("promoted by") || lower.includes("actively reviewing")) return false;
    if (/\b\d+\s+(day|week|month|year)s?\s+ago\b/.test(lower)) return false;
    if (["on-site", "hybrid", "remote", "full-time", "part-time", "contract", "practice for an interview"].includes(lower)) return false;
    if (isLikelyLocationOnly(line)) return false;
    return true;
  }

  function isLikelyLocationOnly(line) {
    if (!line.includes(",") || line.length > 70) return false;
    const lower = cleanText(line).toLowerCase();
    const roleWords = [
      "engineer",
      "developer",
      "manager",
      "specialist",
      "architect",
      "designer",
      "analyst",
      "consultant",
      "director",
      "lead",
      "support",
      "sales",
      "product",
      "data",
      "software",
    ];
    return !roleWords.some((word) => lower.includes(word));
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

  function inferCompanyLogoUrl(detailPane, selectedCard, company = "") {
    const cardImage = selectedCard?.querySelector("img[src], img[data-delayed-url]");
    const cardSrc = getImageSource(cardImage);
    if (cardSrc) return cardSrc;

    const companyKey = normalizeMatchText(company);
    const paneImages = Array.from(detailPane?.querySelectorAll?.("img[src], img[data-delayed-url]") || []);
    const matchingImage = paneImages.find((image) => {
      const label = normalizeMatchText(`${image.alt || ""} ${image.title || ""}`);
      return companyKey && label.includes(companyKey);
    });
    return getImageSource(matchingImage);
  }

  function getImageSource(image) {
    const src = image?.currentSrc || image?.src || image?.dataset?.delayedUrl || "";
    if (!src || src.startsWith("data:")) return "";
    return src;
  }

  function getCleanLines(element) {
    return String(element?.innerText || element?.textContent || "")
      .split(/\r?\n/)
      .map((line) => cleanText(line))
      .filter(Boolean);
  }

  function elementContainsText(element, text) {
    const needle = normalizeMatchText(text);
    return Boolean(needle) && normalizeMatchText(element?.innerText || element?.textContent || "").includes(needle);
  }

  function normalizeMatchText(text) {
    return cleanText(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function isLikelyCompanyLine(line) {
    const lower = cleanText(line).toLowerCase();
    if (!line || line.length > 90) return false;
    if (line.includes("\u00b7")) return false;
    if (lower.includes("applicant") || lower.includes("promoted") || lower.includes("easy apply")) return false;
    if (lower.includes("tel aviv") || lower.includes("israel") || lower.includes("hybrid") || lower.includes("remote")) return false;
    if (lower.includes("applied") || lower.includes("week ago") || lower.includes("month ago")) return false;
    if (["premium", "application status", "application submitted", "on-site", "full-time", "part-time", "contract"].includes(lower)) return false;
    return true;
  }

  function isLikelyDescriptionLine(line) {
    const lower = line.toLowerCase();
    if (["show more", "show less", "apply", "easy apply", "save"].includes(lower)) return false;
    if (lower.startsWith("people you can reach out to") || lower.startsWith("meet the hiring team")) return false;
    return true;
  }

  function collectDebugCandidates() {
    const detailPane = getDetailPane();
    const companyFromPane = cleanCompany(
      textFromSelectorsIn(detailPane, [
        ".job-details-jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__company-name",
        "a[href*='/company/']",
      ])
    ) || inferCompanyFromPane(detailPane);
    const selectedCard = getSelectedJobCard(companyFromPane);
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
    const boardChoicesChanged = changes.hireLevelBoards && haveBoardChoicesChanged(changes.hireLevelBoards);
    if (!boardChoicesChanged && !changes.hireLevelTheme) return;
    document.getElementById(wrapperId)?.remove();
    addCaptureControls();
  }

  function haveBoardChoicesChanged(change) {
    const summarize = (boards) =>
      (Array.isArray(boards) ? boards : []).map((board) => ({ id: board.id || "", name: board.name || "" }));
    return JSON.stringify(summarize(change.oldValue)) !== JSON.stringify(summarize(change.newValue));
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
    }, 2500);
  }
})();
