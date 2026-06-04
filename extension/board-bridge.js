(async function () {
  if (!isHireLevel()) return;

  window.addEventListener("message", handleAppMessage);
  window.postMessage({ source: "hirelevel-extension", type: "REQUEST_BOARD_SYNC" }, window.location.origin === "null" ? "*" : window.location.origin);
  await importPendingJobs();
})();

async function handleAppMessage(event) {
  if (event.source !== window) return;
  if (event.data?.source !== "hirelevel-app") return;
  if (event.data?.type !== "SYNC_BOARDS") return;

  const boards = Array.isArray(event.data.boards) ? event.data.boards : [];
  await chrome.storage.local.set({
    hireLevelBoards: boards,
    hireLevelActiveBoardId: event.data.activeBoardId || boards[0]?.id || null,
  });
}

async function importPendingJobs() {
  const { pendingHireLevelJobs = [] } = await chrome.storage.local.get("pendingHireLevelJobs");
  const jobs = Array.isArray(pendingHireLevelJobs) ? pendingHireLevelJobs : [];
  if (!jobs.length) return;

  window.postMessage(
    {
      source: "hirelevel-extension",
      type: "ADD_JOBS",
      jobs,
    },
    window.location.origin === "null" ? "*" : window.location.origin
  );

  await chrome.storage.local.remove("pendingHireLevelJobs");
}

function isHireLevel() {
  return document.title === "HireLevel" && Boolean(document.querySelector("#board"));
}
