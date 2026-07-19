(async function () {
  if (!isHireLevel()) return;

  window.addEventListener("message", handleAppMessage);
  chrome.storage.onChanged.addListener(handleStorageChange);
  window.postMessage({ source: "hirelevel-extension", type: "REQUEST_BOARD_SYNC" }, "*");
  await importPendingJobs();
})();

async function handleAppMessage(event) {
  if (event.source !== window) return;
  if (event.data?.source !== "hirelevel-app") return;
  if (event.data?.type === "CACHE_LOGOS") {
    const logos = Array.isArray(event.data.logos) ? event.data.logos : [];
    const cached = await cacheLogos(logos);
    window.postMessage({ source: "hirelevel-extension", type: "CACHED_LOGOS", logos: cached }, "*");
    return;
  }
  if (event.data?.type === "IMPORT_RESULT") {
    const results = Array.isArray(event.data.results) ? event.data.results : [];
    await writeDebugLog({ type: "board-import-result", results });
    const captureResults = Object.fromEntries(
      results.filter((result) => result.captureId).map((result) => [`hireLevelCaptureResult_${result.captureId}`, result])
    );
    const resultKeys = Object.keys(captureResults);
    if (resultKeys.length) {
      await chrome.storage.local.set(captureResults);
      window.setTimeout(async () => {
        try {
          await chrome.storage.local.remove(resultKeys);
        } catch {}
      }, 15000);
    }
    return;
  }
  if (event.data?.type !== "SYNC_BOARDS") return;

  const boards = Array.isArray(event.data.boards) ? event.data.boards : [];
  await chrome.storage.local.set({
    hireLevelBoards: boards,
    hireLevelActiveBoardId: event.data.activeBoardId || boards[0]?.id || null,
    hireLevelTheme: event.data.theme || null,
  });
}

async function cacheLogos(logos) {
  const valid = logos
    .map((item) => ({ jobId: String(item?.jobId || ""), url: String(item?.url || "") }))
    .filter((item) => item.jobId && /^https?:\/\//i.test(item.url));
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < valid.length) {
      const item = valid[nextIndex];
      nextIndex += 1;
      try {
        const response = await chrome.runtime.sendMessage({ type: "HIRELEVEL_CACHE_IMAGE", url: item.url });
        if (response?.ok && response.dataUrl) results.push({ jobId: item.jobId, dataUrl: response.dataUrl });
      } catch {}
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, valid.length) }, worker));
  return results;
}

async function importPendingJobs() {
  const storage = await chrome.storage.local.get(null);
  const pendingEntries = Object.entries(storage).filter(([key]) => key.startsWith("pendingHireLevelJob_"));
  const legacyJobs = Array.isArray(storage.pendingHireLevelJobs) ? storage.pendingHireLevelJobs : [];
  const jobs = [...pendingEntries.map(([, job]) => job), ...legacyJobs].filter(Boolean);
  if (!jobs.length) return;

  await writeDebugLog({
    type: "board-import-posted",
    jobs: jobs.map((job) => ({
      title: job.title || "",
      company: job.company || "",
      source: job.source || "",
      externalId: job.externalId || "",
      boardId: job.boardId || "",
      status: job.status || "",
    })),
  });

  window.postMessage(
    {
      source: "hirelevel-extension",
      type: "ADD_JOBS",
      jobs,
    },
    "*"
  );

  await chrome.storage.local.remove([...pendingEntries.map(([key]) => key), "pendingHireLevelJobs"]);
}

async function handleStorageChange(changes, areaName) {
  if (areaName !== "local") return;
  const hasPendingJobs =
    Boolean(changes.pendingHireLevelJobs?.newValue?.length) ||
    Object.keys(changes).some((key) => key.startsWith("pendingHireLevelJob_") && changes[key].newValue);
  if (!hasPendingJobs) return;
  await importPendingJobs();
}

function isHireLevel() {
  return document.title === "HireLevel" && Boolean(document.querySelector("#board"));
}

async function writeDebugLog(entry) {
  const { hireLevelDebugLog = [] } = await chrome.storage.local.get("hireLevelDebugLog");
  const nextLog = Array.isArray(hireLevelDebugLog) ? hireLevelDebugLog.slice(-24) : [];
  nextLog.push({ ...entry, at: new Date().toISOString() });
  await chrome.storage.local.set({ hireLevelDebugLog: nextLog });
}
