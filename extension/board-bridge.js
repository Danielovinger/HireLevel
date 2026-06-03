(async function () {
  if (!isOpenJobTracker()) return;

  const result = await chrome.storage.local.get("pendingOpenJobTrackerJob");
  const job = result.pendingOpenJobTrackerJob;
  if (!job) return;

  window.postMessage(
    {
      source: "hirelevel-extension",
      type: "ADD_JOB",
      job,
    },
    window.location.origin === "null" ? "*" : window.location.origin
  );

  await chrome.storage.local.remove("pendingOpenJobTrackerJob");
})();

function isOpenJobTracker() {
  return document.title === "HireLevel" && Boolean(document.querySelector("#board"));
}
