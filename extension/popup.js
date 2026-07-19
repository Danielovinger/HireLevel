const logElement = document.querySelector("#log");
const clearButton = document.querySelector("#clearLog");
const showCaptureButton = document.querySelector("#showCapture");

showCaptureButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "HIRELEVEL_SHOW_CAPTURE" });
    window.close();
  } catch {
    showCaptureButton.textContent = "Open a normal job page first";
  }
});

clearButton.addEventListener("click", async () => {
  await chrome.storage.local.remove("hireLevelDebugLog");
  render([]);
});

loadLog();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.hireLevelDebugLog) return;
  renderLog(changes.hireLevelDebugLog.newValue);
});

async function loadLog() {
  const { hireLevelDebugLog = [] } = await chrome.storage.local.get("hireLevelDebugLog");
  renderLog(hireLevelDebugLog);
}

function renderLog(log) {
  render(Array.isArray(log) ? log.slice().reverse() : []);
}

function render(entries) {
  logElement.innerHTML = "";
  if (!entries.length) {
    logElement.textContent = "No capture logs yet.";
    return;
  }

  entries.forEach((entry) => {
    const article = document.createElement("article");
    const title = document.createElement("strong");
    const pre = document.createElement("pre");
    title.textContent = `${entry.type || "event"} - ${entry.at || ""}`;
    pre.textContent = JSON.stringify(entry, null, 2);
    article.append(title, pre);
    logElement.appendChild(article);
  });
}
