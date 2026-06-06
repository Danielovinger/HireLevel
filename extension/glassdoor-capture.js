(function () {
  const wrapperId = "hirelevel-capture-wrapper";
  const buttonId = "hirelevel-capture";
  const selectId = "hirelevel-board-select";
  const statusSelectId = "hirelevel-status-select";
  let lastSelectedCard = null;
  let selectedBoardMemory = "";
  let selectedStatusMemory = "applied";

  init();

  async function init() {
    await addCaptureControls();
    document.addEventListener("click", handleDocumentClick, true);
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || (!changes.hireLevelBoards && !changes.hireLevelTheme)) return;
      document.getElementById(wrapperId)?.remove();
      addCaptureControls();
    });
    observePageChanges();
  }

  function handleDocumentClick(event) {
    const button = event.target?.closest?.(`#${buttonId}`);
    if (!button) {
      const card = findClosestJobCard(event.target);
      if (card) lastSelectedCard = card;
      return;
    }
    event.preventDefault();
    captureCurrentJob();
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
      "box-sizing:border-box",
    ].join(";");
    handle.addEventListener("pointerdown", (event) => startDrag(event, wrapper));
    wrapper.appendChild(handle);

    const boards = await getBoards();
    if (boards.length > 1) {
      wrapper.appendChild(createFieldLabel("Select board", theme));
      const select = document.createElement("select");
      select.id = selectId;
      select.title = "Choose HireLevel board";
      select.style.cssText = getSelectStyles(theme).join(";");
      boards.forEach((board) => {
        const option = document.createElement("option");
        option.value = board.id;
        option.textContent = board.name;
        option.title = board.name;
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
      "box-sizing:border-box",
    ].join(";");

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
    if (button?.dataset.busy === "true") return;
    if (button) button.dataset.busy = "true";
    const captureId = createCaptureId();
    const boards = await getBoards();
    const selectedBoardId = document.getElementById(selectId)?.value || (boards.length === 1 ? boards[0].id : null);
    selectedBoardMemory = selectedBoardId || selectedBoardMemory;
    const selectedBoard = boards.find((board) => board.id === selectedBoardId);
    const status = getSelectedInitialStatus();
    selectedStatusMemory = status;
    const job = { ...scrapeGlassdoorJob(), captureId, boardId: selectedBoardId, boardName: selectedBoard?.name || "", status };
    await writeDebugLog({ type: "capture-clicked", source: "glassdoor", captureId, url: location.href, job });

    if (!job.title || !job.company) {
      await writeDebugLog({
        type: "capture-failed",
        source: "glassdoor",
        reason: "missing-title-or-company",
        url: location.href,
        job,
        candidates: collectDebugCandidates(),
      });
      flash(button, "Could not read job", "#b42318");
      return;
    }

    try {
      const stored = await safeStorageSet({ [getPendingJobKey(captureId)]: job });
      if (!stored) throw new Error("Extension storage is unavailable. Reload the page after reloading the extension.");
      await writeDebugLog({ type: "capture-succeeded", source: "glassdoor", captureId, url: location.href, job });
      flash(button, selectedBoard ? `Captured for ${selectedBoard.name}` : "Captured. Open tracker.", "#176c42");
    } catch (error) {
      await writeDebugLog({ type: "capture-storage-failed", source: "glassdoor", captureId, url: location.href, message: error?.message || String(error), job });
      flash(button, "Storage failed", "#b42318");
    } finally {
      if (button) button.dataset.busy = "false";
    }
  }

  function scrapeGlassdoorJob() {
    const detailPane = getDetailPane();
    const titleFromPane =
      textFromSelectorsIn(detailPane, [
        "[data-test='job-title']",
        "[data-test='jobTitle']",
        "[data-test='job-title-header']",
        "[class*='JobDetails_jobTitle']",
        "h1",
      ]) || inferTitleFromPane(detailPane);
    const companyFromPane = cleanCompany(
      textFromSelectorsIn(detailPane, [
        "[data-test='employer-name']",
        "[data-test='employerName']",
        "[data-test='employer-name-header']",
        "a[href*='/Overview/Working-at']",
        "a[href*='/Overview/']",
      ]) || inferCompanyFromPane(detailPane, titleFromPane)
    );
    const selectedCard = getSelectedJobCard(titleFromPane, companyFromPane);
    const titleFromCard =
      textFromSelectorsIn(selectedCard, ["[data-test='job-title']", "[data-test='jobTitle']", "a[href*='jobListingId']"]) ||
      inferTitleFromCard(selectedCard);
    const title =
      titleFromPane ||
      titleFromCard;
    const company = cleanCompany(
      companyFromPane ||
        textFromSelectorsIn(selectedCard, [
          "[data-test='employer-name']",
          "[data-test='employerName']",
          "a[href*='/Overview/Working-at']",
          "a[href*='/Overview/']",
        ]) ||
        inferCompanyFromCard(selectedCard, title)
    );
    const description =
      textFromSelectorsIn(detailPane, [
        "[data-test='jobDescriptionContent']",
        "[data-test='job-description']",
        "#JobDescriptionContainer",
        "[class*='JobDetails_jobDescription']",
      ]) || inferDescriptionFromPane(detailPane);
    const companyLogoUrl = inferCompanyLogoUrl(detailPane, selectedCard);
    const externalId = inferExternalId(detailPane, selectedCard, title, company);
    const url = inferJobUrl(detailPane, selectedCard, externalId);
    return { title, company, description, companyLogoUrl, externalId, url, capturedAt: new Date().toISOString(), source: "glassdoor" };
  }

  function getDetailPane() {
    return (
      document.querySelector("[data-test='job-details']") ||
      document.querySelector("[data-test='jobDetails']") ||
      document.querySelector("#JobDescriptionContainer")?.closest("section") ||
      document.querySelector("main")
    );
  }

  function getSelectedJobCard(title = "", company = "") {
    if (isVisible(lastSelectedCard)) return lastSelectedCard;

    const explicit =
      document.querySelector("[data-test='jobListing'][aria-selected='true']") ||
      document.querySelector("[data-test='jobListing'][aria-current='true']") ||
      document.querySelector("[data-test='jobListing'][data-selected='true']") ||
      document.querySelector("[data-test='jobListing'].selected") ||
      document.querySelector("[data-test='jobListing'][class*='selected' i]") ||
      document.querySelector("[data-test='jobListing'][class*='active' i]");
    if (explicit && cardMatchesJob(explicit, title, company)) return explicit;

    const titleNeedle = cleanText(title).toLowerCase();
    const companyNeedle = cleanCompany(company).toLowerCase();
    const cards = Array.from(
      document.querySelectorAll("[data-test='jobListing'], li[class*='JobsList'], div[class*='JobCard'], div[class*='jobCard']")
    ).filter(isVisible);
    let bestCard = null;
    let bestScore = 0;
    cards.forEach((card) => {
      const text = cleanText(card.innerText || card.textContent || "").toLowerCase();
      const className = String(card.className || "").toLowerCase();
      let score = 0;
      if (className.includes("selected") || className.includes("active")) score += 80;
      if (titleNeedle && text.includes(titleNeedle)) score += 40;
      if (companyNeedle && text.includes(companyNeedle)) score += 25;
      if (card.querySelector("a[href*='jobListingId'], a[href*='jl='], a[href*='job-listing']")) score += 10;
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    });

    return bestScore > 0 ? bestCard : null;
  }

  function findClosestJobCard(target) {
    const element = target?.closest?.("[data-test='jobListing'], li, article, div");
    if (!element || element.closest(`#${wrapperId}`)) return null;

    const candidates = [element, ...Array.from(element.closest("li, article, div")?.parentElement?.children || [])];
    const directCard = candidates.find(isLikelyJobCard);
    if (directCard) return directCard;

    let current = element;
    while (current && current !== document.body) {
      if (isLikelyJobCard(current)) return current;
      current = current.parentElement;
    }
    return null;
  }

  function isLikelyJobCard(element) {
    if (!element || !isVisible(element)) return false;
    const text = cleanText(element.innerText || element.textContent || "");
    if (text.length < 20 || text.length > 1200) return false;
    if (!/easy apply|glassdoor est|employer provided|\d+d\+?|save/i.test(text)) return false;
    if (!element.querySelector("a[href], button, [role='button'], svg")) return false;
    return true;
  }

  function inferTitleFromPane(pane) {
    if (!pane) return "";
    return cleanText(pane.querySelector("h1")?.innerText || pane.querySelector("h2")?.innerText || "");
  }

  function inferCompanyFromPane(pane, title = "") {
    if (!pane) return "";
    const companyLink = pane.querySelector("a[href*='/Overview/']");
    if (companyLink) return cleanCompany(companyLink.innerText);
    return cleanCompany(getCleanLines(pane).slice(0, 12).find((line) => line !== title && isLikelyCompanyLine(line)) || "");
  }

  function inferTitleFromCard(card) {
    if (!card) return "";
    return cleanText(card.querySelector("[data-test='job-title'], [data-test='jobTitle'], a[href*='jobListingId']")?.innerText || card.querySelector("a")?.innerText || "");
  }

  function inferCompanyFromCard(card, title = "") {
    if (!card) return "";
    const lines = getCleanLines(card);
    const normalLine = lines.find((line) => line !== title && isLikelyCompanyLine(line));
    if (normalLine) return cleanCompany(normalLine);
    return cleanCompanyFromPackedLine(lines[0] || "", title);
  }

  function cleanCompanyFromPackedLine(line, title) {
    const text = cleanText(line);
    if (!text) return "";
    if (title && text.includes(title)) {
      const beforeTitle = cleanText(text.slice(0, text.indexOf(title)));
      return cleanCompany(beforeTitle.replace(/\s+\d+(\.\d+)?$/, ""));
    }
    return cleanCompany(text.replace(/\s+\d+(\.\d+)?\s+.*$/, ""));
  }

  function inferExternalId(detailPane, selectedCard, title, company) {
    const fromDetailPane = getGlassdoorIdFromElement(detailPane);
    if (fromDetailPane) return fromDetailPane;
    const href = getJobHrefFromCard(selectedCard);
    const fromHref = getGlassdoorIdFromUrl(href);
    if (fromHref) return fromHref;
    const fromCurrentUrl = getGlassdoorIdFromUrl(location.href);
    if (fromCurrentUrl) return fromCurrentUrl;
    return `glassdoor-${cleanText(company).toLowerCase()}-${cleanText(title).toLowerCase()}`.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function inferJobUrl(detailPane, selectedCard, externalId) {
    const detailHref = getJobHrefFromElement(detailPane);
    if (detailHref) return detailHref;
    const href = getJobHrefFromCard(selectedCard);
    if (href) return href;
    if (externalId) return `${location.origin}${location.pathname}#${externalId}`;
    return location.href;
  }

  function getJobHrefFromCard(card) {
    return (
      card?.querySelector("a[href*='jl=']")?.href ||
      card?.querySelector("a[href*='jobListingId']")?.href ||
      card?.querySelector("a[href*='job-listing']")?.href ||
      card?.querySelector("a[href]")?.href ||
      ""
    );
  }

  function getJobHrefFromElement(element) {
    if (!element) return "";
    if (element.matches?.("a[href*='jl='], a[href*='jobListingId'], a[href*='job-listing']")) return element.href;
    const link = element.querySelector("a[href*='jl='], a[href*='jobListingId'], a[href*='job-listing']");
    return link?.href || "";
  }

  function getGlassdoorIdFromElement(element) {
    if (!element) return "";
    const hrefId = getGlassdoorIdFromUrl(getJobHrefFromElement(element));
    if (hrefId) return hrefId;

    const elementWithId = element.matches?.("[data-job-id], [data-jobid], [data-job-listing-id], [data-joblistingid], [data-listing-id], [data-id]")
      ? element
      : element.querySelector(
      "[data-job-id], [data-jobid], [data-job-listing-id], [data-joblistingid], [data-listing-id], [data-id]"
    );
    return (
      elementWithId?.dataset?.jobId ||
      elementWithId?.dataset?.jobid ||
      elementWithId?.dataset?.jobListingId ||
      elementWithId?.dataset?.joblistingid ||
      elementWithId?.dataset?.listingId ||
      elementWithId?.dataset?.id ||
      ""
    );
  }

  function getGlassdoorIdFromUrl(url) {
    try {
      const parsed = new URL(url, location.href);
      return parsed.searchParams.get("jl") || parsed.searchParams.get("jobListingId") || parsed.searchParams.get("currentJobId") || "";
    } catch {
      return "";
    }
  }

  function inferDescriptionFromPane(pane) {
    if (!pane) return "";
    const descriptionNode = pane.querySelector("#JobDescriptionContainer") || pane;
    const lines = getCleanLines(descriptionNode);
    const start = lines.findIndex((line) => ["job description", "about the role", "about the job"].includes(line.toLowerCase()));
    return (start >= 0 ? lines.slice(start + 1) : lines).filter(isLikelyDescriptionLine).join("\n");
  }

  function inferCompanyLogoUrl(detailPane, selectedCard) {
    const image =
      detailPane?.querySelector("img[alt*='logo' i], img[src*='gstatic'], img[src*='glassdoor']") ||
      selectedCard?.querySelector("img[alt*='logo' i], img[src*='gstatic'], img[src*='glassdoor']");
    const src = image?.currentSrc || image?.src || "";
    if (!src || src.startsWith("data:")) return "";
    return src;
  }

  function collectDebugCandidates() {
    const detailPane = getDetailPane();
    const inferredTitle = inferTitleFromPane(detailPane);
    const inferredCompany = inferCompanyFromPane(detailPane, inferredTitle);
    const selectedCard = getSelectedJobCard(inferredTitle, inferredCompany);
    return {
      titleSelectors: [
        textFromSelectorsIn(detailPane, ["[data-test='job-title']", "[data-test='jobTitle']", "h1"]),
        inferTitleFromPane(detailPane),
        inferTitleFromCard(selectedCard),
      ].filter(Boolean),
      companySelectors: [
        textFromSelectorsIn(detailPane, ["[data-test='employer-name']", "[data-test='employerName']", "a[href*='/Overview/']"]),
        inferCompanyFromPane(detailPane, inferredTitle),
        inferCompanyFromCard(selectedCard, inferredTitle),
      ].filter(Boolean),
      selectedCardText: getCleanLines(selectedCard).slice(0, 12),
      detailPaneText: getCleanLines(detailPane).slice(0, 24),
    };
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
      "height:48px",
      "min-height:48px",
      "line-height:normal",
      "padding:0 12px",
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

  function textFromSelectors(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = cleanText(element?.innerText || element?.textContent || "");
      if (text) return text;
    }
    return "";
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

  function isVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function cardMatchesJob(card, title = "", company = "") {
    const text = cleanText(card?.innerText || card?.textContent || "").toLowerCase();
    const titleNeedle = cleanText(title).toLowerCase();
    const companyNeedle = cleanCompany(company).toLowerCase();
    if (titleNeedle && !text.includes(titleNeedle)) return false;
    if (companyNeedle && !text.includes(companyNeedle)) return false;
    return Boolean(titleNeedle || companyNeedle);
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
    if (lower.includes("rating") || lower.includes("review") || lower.includes("salary") || lower.includes("apply")) return false;
    if (lower.includes("remote") || lower.includes("hybrid") || lower.includes("full-time") || lower.includes("part-time")) return false;
    return true;
  }

  function isLikelyDescriptionLine(line) {
    const lower = line.toLowerCase();
    if (["show more", "show less", "apply", "easy apply", "save"].includes(lower)) return false;
    if (lower.startsWith("similar jobs") || lower.startsWith("company overview")) return false;
    return true;
  }

  function cleanCompany(text) {
    return cleanText(text)
      .split(" · ")[0]
      .split(" | ")[0]
      .replace(/\s+\d+(\.\d+)?$/, "")
      .trim();
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

  function flash(button, text, color) {
    const originalText = button.textContent;
    const originalBackground = button.style.background;
    button.textContent = text;
    button.style.background = color;
    window.setTimeout(() => {
      button.textContent = originalText;
      button.style.background = originalBackground;
    }, 1800);
  }
})();
