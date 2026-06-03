(function () {
  const buttonId = "hirelevel-capture";

  init();

  function init() {
    addCaptureButton();
    observePageChanges();
  }

  function addCaptureButton() {
    if (document.getElementById(buttonId)) return;

    const button = document.createElement("button");
    button.id = buttonId;
    button.type = "button";
    button.textContent = "Add to HireLevel";
    button.style.cssText = [
      "position:fixed",
      "right:18px",
      "bottom:18px",
      "z-index:2147483647",
      "border:1px solid #176c42",
      "border-radius:8px",
      "background:#2f9b61",
      "color:white",
      "font:600 14px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "padding:10px 14px",
      "box-shadow:0 10px 28px rgba(0,0,0,.18)",
      "cursor:pointer",
    ].join(";");

    button.addEventListener("click", captureCurrentJob);
    document.body.appendChild(button);
  }

  function observePageChanges() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        addCaptureButton();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function captureCurrentJob() {
    const button = document.getElementById(buttonId);
    const job = scrapeLinkedInJob();

    if (!job.title || !job.company) {
      flash(button, "Could not read job", "#b42318");
      return;
    }

    await chrome.storage.local.set({ pendingOpenJobTrackerJob: job });
    flash(button, "Captured. Open tracker.", "#176c42");
  }

  function scrapeLinkedInJob() {
    const title = textFromSelectors([
      ".job-details-jobs-unified-top-card__job-title h1",
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title h1",
      ".jobs-unified-top-card__job-title",
      "h1",
    ]);

    const company = cleanCompany(
      textFromSelectors([
        ".job-details-jobs-unified-top-card__company-name a",
        ".job-details-jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name",
      ])
    );

    const description = textFromSelectors([
      ".jobs-description__content",
      ".jobs-box__html-content",
      "#job-details",
      ".jobs-description-content__text",
    ]);

    return {
      title,
      company,
      description,
      url: location.href,
      capturedAt: new Date().toISOString(),
      source: "linkedin",
    };
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
