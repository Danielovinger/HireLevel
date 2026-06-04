const logElement = document.querySelector("#log");
const clearButton = document.querySelector("#clearLog");

clearButton.addEventListener("click", async () => {
  await chrome.storage.local.remove("hireLevelDebugLog");
  render([]);
});

chrome.storage.local.get("hireLevelDebugLog").then(({ hireLevelDebugLog = [] }) => {
  render(Array.isArray(hireLevelDebugLog) ? hireLevelDebugLog.slice().reverse() : []);
});

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
