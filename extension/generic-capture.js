(function () {
  if (window.top !== window) return;

  const wrapperId = "hirelevel-capture-wrapper";
  const buttonId = "hirelevel-capture";
  const selectId = "hirelevel-board-select";
  const statusSelectId = "hirelevel-status-select";
  let selectedBoardMemory = "";
  let selectedStatusMemory = "applied";
  let latestCaptureId = "";
  let forceWidget = false;

  init();

  async function init() {
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    chrome.storage.onChanged.addListener(handleStorageChange);
    if (isLikelyJobPage()) await addCaptureControls();
    observePageChanges();
  }

  function handleRuntimeMessage(message, _sender, sendResponse) {
    if (message?.type !== "HIRELEVEL_SHOW_CAPTURE") return undefined;
    forceWidget = true;
    addCaptureControls().then(() => sendResponse({ ok: true }));
    return true;
  }

  async function addCaptureControls() {
    if (document.getElementById(buttonId) || !document.body) return;
    const theme = await getTheme();
    const wrapper = document.createElement("div");
    const position = await getPosition();
    wrapper.id = wrapperId;
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
    ].forEach(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
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
    button.addEventListener("click", captureCurrentJob);
    wrapper.appendChild(button);
    document.body.appendChild(wrapper);
  }

  function observePageChanges() {
    let lastUrl = location.href;
    let timer = null;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        forceWidget = false;
        document.getElementById(wrapperId)?.remove();
      }
      if (document.getElementById(wrapperId)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (forceWidget || isLikelyJobPage()) addCaptureControls();
      }, 500);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function captureCurrentJob() {
    const button = document.getElementById(buttonId);
    if (button?.dataset.busy === "true") return;
    if (button) button.dataset.busy = "true";

    const captureId = createCaptureId();
    latestCaptureId = captureId;
    const boards = await getBoards();
    const selectedBoardId = document.getElementById(selectId)?.value || (boards.length === 1 ? boards[0].id : null);
    selectedBoardMemory = selectedBoardId || selectedBoardMemory;
    const selectedBoard = boards.find((board) => board.id === selectedBoardId);
    const status = getSelectedInitialStatus();
    selectedStatusMemory = status;
    const scrapedJob = scrapeGenericJob();
    const companyLogoDataUrl = await cacheCompanyLogo(scrapedJob.companyLogoUrl);
    const job = {
      ...scrapedJob,
      companyLogoDataUrl,
      captureId,
      boardId: selectedBoardId,
      boardName: selectedBoard?.name || "",
      status,
    };
    await writeDebugLog({ type: "capture-clicked", source: job.source, captureId, url: location.href, job });

    if (!job.title || !job.company) {
      await writeDebugLog({
        type: "capture-failed",
        source: job.source,
        reason: "missing-title-or-company",
        url: location.href,
        job,
        candidates: collectDebugCandidates(),
      });
      flash(button, "Could not read job", "#b42318");
      if (button) button.dataset.busy = "false";
      return;
    }

    if (selectedBoard?.jobIdentities?.includes(getCaptureIdentity(job))) {
      await writeDebugLog({ type: "capture-duplicate", source: job.source, captureId, url: location.href, job });
      flash(button, "Job already exists", "#b42318");
      if (button) button.dataset.busy = "false";
      return;
    }

    try {
      const stored = await safeStorageSet({ [getPendingJobKey(captureId)]: job });
      if (!stored) throw new Error("Extension storage is unavailable. Reload the page after reloading the extension.");
      await writeDebugLog({ type: "capture-succeeded", source: job.source, captureId, url: location.href, job });
      flash(button, selectedBoard ? `Captured for ${selectedBoard.name}` : "Captured. Open tracker.", "#176c42");
    } catch (error) {
      await writeDebugLog({
        type: "capture-storage-failed",
        source: job.source,
        captureId,
        url: location.href,
        message: error?.message || String(error),
        job,
      });
      flash(button, "Storage failed", "#b42318");
    } finally {
      if (button) button.dataset.busy = "false";
    }
  }

  function scrapeGenericJob() {
    const posting = findStructuredJobPosting();
    const organization = posting?.hiringOrganization || posting?.organization || {};
    const root = findJobRoot();
    const title = firstMeaningfulText([
      posting?.title,
      textFromSelectors(root, [
        "[itemprop='title']",
        "[data-testid*='job-title' i]",
        "[data-test*='job-title' i]",
        "[class*='job-title' i]",
        "h1",
      ]),
      getMetaContent("og:title"),
      document.title,
    ], cleanJobTitle);
    const company = firstMeaningfulText([
      getStructuredValue(organization, "name"),
      textFromSelectors(root, [
        "[itemprop='hiringOrganization'] [itemprop='name']",
        "[itemprop='hiringOrganization']",
        "[data-testid*='company-name' i]",
        "[data-test*='company-name' i]",
        "[class*='company-name' i]",
        "a[href*='/company/']",
      ]),
      getMetaContent("og:site_name"),
      companyFromHostname(),
    ], cleanCompany);
    const description = cleanDescription(
      posting?.description ||
        textFromSelectors(root, [
          "[itemprop='description']",
          "[data-testid*='job-description' i]",
          "[data-test*='job-description' i]",
          "[class*='job-description' i]",
          "#job-description",
          "#jobDescription",
          "article",
        ]) ||
        getMetaContent("og:description") ||
        getMetaContent("description")
    );
    const companyLogoUrl = firstUrl([
      getStructuredLogo(organization),
      imageFromSelectors(root, [
        "[itemprop='hiringOrganization'] img",
        "img[class*='company-logo' i]",
        "img[alt*='company logo' i]",
        "img[alt*='logo' i]",
      ]),
      document.querySelector("link[rel~='icon']")?.href,
      `${location.origin}/favicon.ico`,
    ]);
    const url = firstUrl([
      getStructuredValue(posting, "url"),
      document.querySelector("link[rel='canonical']")?.href,
      location.href,
    ]);
    const externalId = cleanText(
      getStructuredIdentifier(posting?.identifier) ||
        getUrlIdentifier(url)
    );
    return {
      title,
      company,
      description,
      companyLogoUrl,
      externalId,
      url,
      capturedAt: new Date().toISOString(),
      source: location.hostname.replace(/^www\./, "").toLowerCase(),
    };
  }

  function findStructuredJobPosting() {
    for (const script of document.querySelectorAll("script[type='application/ld+json']")) {
      try {
        const root = JSON.parse(script.textContent || "null");
        const candidates = flattenStructuredData(root);
        const posting = candidates.find((item) => hasStructuredType(item, "JobPosting"));
        if (posting) return posting;
      } catch {}
    }
    return null;
  }

  function flattenStructuredData(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(flattenStructuredData);
    if (typeof value !== "object") return [];
    return [value, ...flattenStructuredData(value["@graph"]), ...flattenStructuredData(value.mainEntity)];
  }

  function hasStructuredType(value, expected) {
    const types = Array.isArray(value?.["@type"]) ? value["@type"] : [value?.["@type"]];
    return types.some((type) => String(type || "").toLowerCase() === expected.toLowerCase());
  }

  function getStructuredValue(value, key) {
    const result = value?.[key];
    if (typeof result === "string") return result;
    return result?.url || result?.name || result?.["@id"] || "";
  }

  function getStructuredLogo(organization) {
    return getStructuredValue(organization, "logo") || getStructuredValue(organization, "image");
  }

  function getStructuredIdentifier(identifier) {
    if (Array.isArray(identifier)) return identifier.map(getStructuredIdentifier).find(Boolean) || "";
    if (typeof identifier === "string") return identifier;
    return identifier?.value || identifier?.name || "";
  }

  function findJobRoot() {
    const selectors = [
      "[itemtype*='schema.org/JobPosting']",
      "[data-testid*='job-detail' i]",
      "[data-test*='job-detail' i]",
      "[class*='job-detail' i]",
      "main",
      "[role='main']",
      "article",
    ];
    return selectors.map((selector) => document.querySelector(selector)).find(isVisible) || document.body;
  }

  function isLikelyJobPage() {
    if (findStructuredJobPosting()) return true;
    if (/\/(jobs?|careers?|positions?|vacanc(?:y|ies)|openings?|opportunities|requisitions?|join-us|work-with-us)(?:\/|$|[?#])/i.test(location.href)) return true;
    return Boolean(
      document.querySelector(
        "[itemtype*='schema.org/JobPosting'], [itemprop='hiringOrganization'], [data-testid*='job-title' i], [data-test*='job-title' i]"
      )
    );
  }

  function collectDebugCandidates() {
    const root = findJobRoot();
    return {
      structuredJobPosting: Boolean(findStructuredJobPosting()),
      headings: Array.from(root?.querySelectorAll?.("h1, h2") || []).filter(isVisible).slice(0, 8).map((item) => cleanText(item.innerText)),
      companyCandidates: [
        textFromSelectors(root, ["[itemprop='hiringOrganization']", "[data-testid*='company' i]", "[class*='company-name' i]"]),
        getMetaContent("og:site_name"),
      ].filter(Boolean),
      pageTitle: document.title,
    };
  }

  function firstMeaningfulText(values, cleaner) {
    return values.map((value) => cleaner(value)).find(Boolean) || "";
  }

  function textFromSelectors(root, selectors) {
    if (!root) return "";
    for (const selector of selectors) {
      const element = Array.from(root.querySelectorAll(selector)).find(isVisible);
      const text = cleanText(element?.innerText || element?.textContent || "");
      if (text) return text;
    }
    return "";
  }

  function imageFromSelectors(root, selectors) {
    if (!root) return "";
    for (const selector of selectors) {
      const image = Array.from(root.querySelectorAll(selector)).find(isVisible);
      const src = image?.currentSrc || image?.src || image?.dataset?.src || "";
      if (src) return src;
    }
    return "";
  }

  function cleanJobTitle(value) {
    const text = cleanText(value)
      .replace(/^job (?:opening|opportunity):?\s*/i, "")
      .replace(/\s+(?:\||[-–—])\s+(?:careers?|jobs?|apply).*$/i, "")
      .trim();
    if (!text || text.length > 180) return "";
    const lower = text.toLowerCase();
    if (["jobs", "careers", "search jobs", "job search", "apply now"].includes(lower)) return "";
    return text;
  }

  function cleanCompany(value) {
    const text = cleanText(value).replace(/\s+(?:careers?|jobs?)$/i, "").trim();
    if (!text || text.length > 100) return "";
    return text;
  }

  function cleanDescription(value) {
    if (!value) return "";
    const container = document.createElement("div");
    container.innerHTML = String(value);
    const text = cleanText(container.innerText || container.textContent || value);
    return text.slice(0, 50000);
  }

  function companyFromHostname() {
    const hostname = location.hostname.replace(/^www\./, "").toLowerCase();
    const atsHosts = ["greenhouse.io", "lever.co", "ashbyhq.com", "smartrecruiters.com"];
    if (atsHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
      const tenant = location.pathname.split("/").filter(Boolean)[0] || "";
      if (tenant && !["jobs", "job", "careers", "search"].includes(tenant.toLowerCase())) {
        return tenant.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
      }
    }
    if (hostname.endsWith(".myworkdayjobs.com")) {
      const tenant = hostname.split(".")[0];
      if (tenant) return tenant.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    }
    const ignored = new Set(["jobs", "careers", "apply", "boards", "recruiting", "www"]);
    const parts = hostname.split(".");
    const part = parts.find((item) => item && !ignored.has(item.toLowerCase())) || parts[0] || "";
    return part.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function getMetaContent(name) {
    return cleanText(
      document.querySelector(`meta[property='${name}']`)?.content ||
        document.querySelector(`meta[name='${name}']`)?.content ||
        ""
    );
  }

  function firstUrl(values) {
    for (const value of values) {
      const candidate = String(value || "").trim();
      if (!candidate) continue;
      try {
        return new URL(candidate, location.href).href;
      } catch {}
    }
    return "";
  }

  function getUrlIdentifier(url) {
    try {
      const parsed = new URL(url);
      for (const key of ["jobId", "job_id", "gh_jid", "requisitionId", "requisition_id"]) {
        const value = parsed.searchParams.get(key);
        if (value) return value;
      }
      return "";
    } catch {
      return "";
    }
  }

  async function cacheCompanyLogo(url) {
    if (!url || typeof chrome === "undefined" || !chrome.runtime?.id) return "";
    try {
      const response = await chrome.runtime.sendMessage({ type: "HIRELEVEL_CACHE_IMAGE", url });
      return response?.ok && typeof response.dataUrl === "string" ? response.dataUrl : "";
    } catch {
      return "";
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
      "height:44px",
      "padding:10px 12px",
      `box-shadow:${theme.shadow}`,
      "box-sizing:border-box",
      "font-size:14px",
    ];
  }

  function createFieldLabel(text, theme) {
    const label = document.createElement("div");
    label.textContent = text;
    label.style.cssText = `color:${theme.accentDark};font-size:12px;font-weight:800;line-height:14px;margin:2px 0 -4px;padding:0 2px`;
    return label;
  }

  function getSelectedInitialStatus() {
    return document.getElementById(statusSelectId)?.value === "saved" ? "saved" : "applied";
  }

  async function getPosition() {
    const { hireLevelCapturePosition } = await safeStorageGet("hireLevelCapturePosition");
    if (Number.isFinite(hireLevelCapturePosition?.left) && Number.isFinite(hireLevelCapturePosition?.top)) {
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
      wrapper.style.left = `${Math.max(12, Math.min(window.innerWidth - wrapper.offsetWidth - 12, startLeft + moveEvent.clientX - startX))}px`;
      wrapper.style.top = `${Math.max(12, Math.min(window.innerHeight - wrapper.offsetHeight - 12, startTop + moveEvent.clientY - startY))}px`;
    };
    const stop = async () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
      const finalRect = wrapper.getBoundingClientRect();
      await safeStorageSet({ hireLevelCapturePosition: { left: finalRect.left, top: finalRect.top } });
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
  }

  async function writeDebugLog(entry) {
    const { hireLevelDebugLog = [] } = await safeStorageGet("hireLevelDebugLog");
    const nextLog = Array.isArray(hireLevelDebugLog) ? hireLevelDebugLog.slice(-24) : [];
    nextLog.push(sanitizeLogEntry({ ...entry, at: new Date().toISOString() }));
    await safeStorageSet({ hireLevelDebugLog: nextLog });
  }

  function sanitizeLogEntry(entry) {
    if (!entry?.job?.companyLogoDataUrl) return entry;
    return { ...entry, job: { ...entry.job, companyLogoDataUrl: "[embedded image]" } };
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
    const shouldRestoreWidget = Boolean(document.getElementById(wrapperId)) || forceWidget || isLikelyJobPage();
    if (!shouldRestoreWidget) return;
    document.getElementById(wrapperId)?.remove();
    addCaptureControls();
  }

  function isVisible(element) {
    if (!(element instanceof Element) || !element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
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
