(function () {
  const wrapperId = "hirelevel-capture-wrapper";
  const buttonId = "hirelevel-capture";
  const selectId = "hirelevel-board-select";

  init();

  async function init() {
    await addCaptureControls();
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes.hireLevelBoards) return;
      document.getElementById(wrapperId)?.remove();
      addCaptureControls();
    });
    observePageChanges();
  }

  async function addCaptureControls() {
    if (document.getElementById(buttonId)) return;

    const wrapper = document.createElement("div");
    wrapper.id = wrapperId;
    const position = await getPosition();
    wrapper.style.cssText = [
      "position:fixed",
      `left:${position.left}px`,
      `top:${position.top}px`,
      "z-index:2147483647",
      "display:grid",
      "gap:8px",
      "font:600 14px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    ].join(";");

    const handle = document.createElement("div");
    handle.textContent = "HireLevel";
    handle.title = "Drag to move";
    handle.style.cssText = [
      "border:1px solid #c8dfc2",
      "border-radius:8px",
      "background:white",
      "color:#176c42",
      "padding:7px 10px",
      "box-shadow:0 10px 28px rgba(0,0,0,.10)",
      "cursor:move",
      "user-select:none",
      "text-align:center",
    ].join(";");
    handle.addEventListener("pointerdown", (event) => startDrag(event, wrapper));
    wrapper.appendChild(handle);

    const boards = await getBoards();
    if (boards.length > 1) {
      const select = document.createElement("select");
      select.id = selectId;
      select.style.cssText = [
        "border:1px solid #176c42",
        "border-radius:8px",
        "background:white",
        "color:#1d2433",
        "padding:9px 10px",
        "box-shadow:0 10px 28px rgba(0,0,0,.12)",
      ].join(";");
      boards.forEach((board) => {
        const option = document.createElement("option");
        option.value = board.id;
        option.textContent = board.name;
        select.appendChild(option);
      });
      wrapper.appendChild(select);
    }

    const button = document.createElement("button");
    button.id = buttonId;
    button.type = "button";
    button.textContent = "Add to HireLevel";
    button.style.cssText = [
      "border:1px solid #176c42",
      "border-radius:8px",
      "background:#2f9b61",
      "color:white",
      "padding:10px 14px",
      "box-shadow:0 10px 28px rgba(0,0,0,.18)",
      "cursor:pointer",
    ].join(";");

    button.addEventListener("click", captureCurrentJob);
    wrapper.appendChild(button);
    document.body.appendChild(wrapper);
  }

  function observePageChanges() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        document.getElementById(wrapperId)?.remove();
        addCaptureControls();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function captureCurrentJob() {
    const button = document.getElementById(buttonId);
    const boards = await getBoards();
    const selectedBoardId = document.getElementById(selectId)?.value || (boards.length === 1 ? boards[0].id : null);
    const selectedBoard = boards.find((board) => board.id === selectedBoardId);
    const job = { ...scrapeLinkedInJob(), boardId: selectedBoardId, boardName: selectedBoard?.name || "" };

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

    const { pendingHireLevelJobs = [] } = await chrome.storage.local.get("pendingHireLevelJobs");
    pendingHireLevelJobs.push(job);
    await chrome.storage.local.set({ pendingHireLevelJobs });
    await writeDebugLog({ type: "capture-succeeded", url: location.href, job });
    flash(button, selectedBoard ? `Captured for ${selectedBoard.name}` : "Captured. Open tracker.", "#176c42");
  }

  async function getBoards() {
    const { hireLevelBoards = [] } = await chrome.storage.local.get("hireLevelBoards");
    return Array.isArray(hireLevelBoards) ? hireLevelBoards : [];
  }

  async function getPosition() {
    const { hireLevelCapturePosition } = await chrome.storage.local.get("hireLevelCapturePosition");
    if (hireLevelCapturePosition && Number.isFinite(hireLevelCapturePosition.left) && Number.isFinite(hireLevelCapturePosition.top)) {
      return {
        left: Math.max(12, Math.min(window.innerWidth - 180, hireLevelCapturePosition.left)),
        top: Math.max(12, Math.min(window.innerHeight - 90, hireLevelCapturePosition.top)),
      };
    }
    return { left: Math.max(12, window.innerWidth - 220), top: Math.max(12, window.innerHeight - 110) };
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
      await chrome.storage.local.set({ hireLevelCapturePosition: { left: rect.left, top: rect.top } });
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
  }

  function scrapeLinkedInJob() {
    const selectedCard = getSelectedJobCard();
    const detailPane = getDetailPane();
    const title = textFromSelectors([
      ".job-details-jobs-unified-top-card__job-title h1",
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title h1",
      ".jobs-unified-top-card__job-title",
      ".job-details-jobs-unified-top-card__job-title-link",
      ".job-details-jobs-unified-top-card__title",
      ".jobs-details-top-card__job-title",
      ".job-view-layout h1",
      "h1",
    ]) || inferTitleFromPane(detailPane) || inferTitleFromCard(selectedCard);
    const company = cleanCompany(
      textFromSelectors([
        ".job-details-jobs-unified-top-card__company-name a",
        ".job-details-jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name",
        ".job-details-jobs-unified-top-card__primary-description a",
        ".jobs-unified-top-card__primary-description a",
        ".job-view-layout a[href*='/company/']",
        "a[href*='/company/']",
      ])
    ) || inferCompanyFromPane(detailPane) || inferCompanyFromCard(selectedCard);
    const description = textFromSelectors([
      ".jobs-description__content",
      ".jobs-box__html-content",
      "#job-details",
      ".jobs-description-content__text",
    ]) || inferDescriptionFromPane(detailPane);
    return { title, company, description, url: location.href, capturedAt: new Date().toISOString(), source: "linkedin" };
  }

  function getSelectedJobCard() {
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
      document.querySelector(".jobs-details") ||
      document.querySelector(".job-view-layout") ||
      document.querySelector("main")
    );
  }

  function inferTitleFromPane(pane) {
    if (!pane) return "";
    return cleanText(
      pane.querySelector("h1")?.innerText ||
        pane.querySelector("h2")?.innerText ||
        pane.querySelector("[data-test-job-title]")?.innerText ||
        ""
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
    return cleanText(
      card.querySelector(".job-card-list__title--link")?.innerText ||
        card.querySelector(".job-card-list__title")?.innerText ||
        card.querySelector("a[href*='/jobs/view/']")?.innerText ||
        card.querySelector("strong")?.innerText ||
        ""
    );
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
        textFromSelectors([".job-details-jobs-unified-top-card__job-title", ".jobs-unified-top-card__job-title", "h1"]),
        inferTitleFromPane(detailPane),
        inferTitleFromCard(selectedCard),
      ].filter(Boolean),
      companySelectors: [
        textFromSelectors([".job-details-jobs-unified-top-card__company-name", ".jobs-unified-top-card__company-name", "a[href*='/company/']"]),
        inferCompanyFromPane(detailPane),
        inferCompanyFromCard(selectedCard),
      ].filter(Boolean),
      selectedCardText: getCleanLines(selectedCard).slice(0, 12),
      detailPaneText: getCleanLines(detailPane).slice(0, 20),
    };
  }

  async function writeDebugLog(entry) {
    const { hireLevelDebugLog = [] } = await chrome.storage.local.get("hireLevelDebugLog");
    const nextLog = Array.isArray(hireLevelDebugLog) ? hireLevelDebugLog.slice(-24) : [];
    nextLog.push({ ...entry, at: new Date().toISOString() });
    await chrome.storage.local.set({ hireLevelDebugLog: nextLog });
  }

  function textFromSelectors(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = cleanText(element?.innerText || element?.textContent || "");
      if (text) return text;
    }
    return "";
  }

  function cleanCompany(text) {
    return cleanText(text.split(" · ")[0].split(" | ")[0]);
  }

  function cleanText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
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
