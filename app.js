const STORAGE_KEY = "hirelevel-state-v2";
const LEGACY_STORAGE_KEYS = ["hirelevel-state-v1", "open-job-tracker-state-v1"];
const MAX_CUSTOM_COLUMNS = 5;
const CUSTOM_COLUMN_XP = 25;

const defaultColumns = [
  { id: "saved", name: "Saved", type: "default" },
  { id: "applied", name: "Applied", type: "default" },
  { id: "received-answer", name: "First Positive Answer", type: "default" },
  { id: "interviewing", name: "Interviewing", type: "default" },
  { id: "offer", name: "Offer", type: "default" },
  { id: "rejected", name: "Rejected / Withdrawn", type: "default" },
];

const statusXp = {
  saved: 0,
  applied: 5,
  "received-answer": 25,
  rejected: 25,
  interviewing: 625,
  offer: 390625,
};

const titleTiers = [
  "Jobless Worm",
  "Jobless Animal",
  "Jobless Maidenless",
  "Jobless",
  "Jobless Pauper",
  "Jobless Beggar",
  "Jobless Peasant",
  "Jobless Pleb",
  "Jobless Helot",
  "Jobless Serf",
  "Jobless Vlach",
  "Jobless Perioikoi",
  "Jobless Wonderer",
  "Jobless Aspirant",
  "Jobless Squire",
  "Jobless Petty Knight",
  "Jobless Knight",
  "Jobless Boyar",
  "Jobless Lord",
  "Jobless Voivode",
];

const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const maxLevel = 200;
const endgameLevelStart = 100;
const endgameCurveMultiplier = 4.6;

let state = loadState();
let editingJobId = null;
let draggedJobId = null;
let pendingConfirmAction = null;

const board = document.querySelector("#board");
const columnTemplate = document.querySelector("#columnTemplate");
const cardTemplate = document.querySelector("#cardTemplate");
const jobDialog = document.querySelector("#jobDialog");
const columnDialog = document.querySelector("#columnDialog");
const boardDialog = document.querySelector("#boardDialog");
const confirmDialog = document.querySelector("#confirmDialog");
const jobForm = document.querySelector("#jobForm");
const columnForm = document.querySelector("#columnForm");
const boardForm = document.querySelector("#boardForm");
const confirmForm = document.querySelector("#confirmForm");
const searchInput = document.querySelector("#searchInput");
const fetchMessage = document.querySelector("#fetchMessage");

document.querySelector("#addJobBtn").addEventListener("click", () => openJobDialog());
document.querySelector("#addColumnBtn").addEventListener("click", () => openColumnDialog());
document.querySelector("#createBoardBtn").addEventListener("click", () => openBoardDialog());
document.querySelector("#exportBtn").addEventListener("click", exportState);
document.querySelector("#importInput").addEventListener("change", importState);
document.querySelector("#fetchJobBtn").addEventListener("click", fetchJobDetails);
document.querySelector("#parsePastedTextBtn").addEventListener("click", parsePastedText);
document.querySelector("#boardSelect").addEventListener("change", changeActiveBoard);
document.querySelector("#xpModeSelect").addEventListener("change", changeXpMode);
document.querySelector("#themeModeSelect").addEventListener("change", changeThemeMode);
document.querySelector("#colorSchemeSelect").addEventListener("change", changeColorScheme);
document.querySelector("#renameBoardBtn").addEventListener("click", renameActiveBoard);
document.querySelector("#resetBoardBtn").addEventListener("click", confirmResetBoard);
document.querySelector("#resetBoardProgressBtn").addEventListener("click", confirmResetBoardProgression);
document.querySelector("#resetAccountProgressBtn").addEventListener("click", confirmResetAccountProgression);
document.querySelector("#deleteBoardBtn").addEventListener("click", confirmDeleteBoard);
document.querySelector("#confirmNoBtn").addEventListener("click", () => confirmDialog.close());
searchInput.addEventListener("input", renderApp);

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

window.addEventListener("message", handleExtensionMessage);

jobForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(jobForm);
  const board = getActiveBoard();
  const job = {
    id: editingJobId || createId(),
    url: formData.get("url").trim(),
    title: formData.get("title").trim(),
    company: formData.get("company").trim(),
    dateApplied: formData.get("dateApplied"),
    status: formData.get("status"),
    description: formData.get("description").trim(),
    notes: formData.get("notes").trim(),
  };

  if (editingJobId) {
    board.jobs = board.jobs.map((existing) => (existing.id === editingJobId ? job : existing));
  } else {
    board.jobs.push(job);
  }

  const earnedXp = awardXpForColumn(board.id, job.id, job.status);
  if (earnedXp > 0) showXpToast(job, earnedXp);
  saveState();
  jobDialog.close();
  renderApp();
});

columnForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const board = getActiveBoard();
  const name = document.querySelector("#columnName").value.trim();
  if (!name) return;

  if (getCustomColumns(board).length >= MAX_CUSTOM_COLUMNS) {
    alert(`Each board can have up to ${MAX_CUSTOM_COLUMNS} custom columns.`);
    return;
  }

  board.columns.push({
    id: slugify(name, board.columns, true),
    name,
    type: "custom",
  });
  saveState();
  columnDialog.close();
  renderApp();
});

boardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#newBoardName").value.trim();
  if (!name) return;
  const newBoard = createBoard(name, []);
  state.boards.push(newBoard);
  state.activeBoardId = newBoard.id;
  saveState();
  boardDialog.close();
  renderApp();
});

confirmForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (pendingConfirmAction) pendingConfirmAction();
  pendingConfirmAction = null;
  confirmDialog.close();
  saveState();
  renderApp();
});

renderApp();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!saved) {
    const board = createBoard("My Job Search", []);
    return { version: 2, settings: getDefaultSettings(), activeBoardId: board.id, boards: [board], xpEvents: [] };
  }

  try {
    return migrateState(JSON.parse(saved));
  } catch {
    const board = createBoard("My Job Search", []);
    return { version: 2, settings: getDefaultSettings(), activeBoardId: board.id, boards: [board], xpEvents: [] };
  }
}

function migrateState(parsed) {
  if (Array.isArray(parsed.boards)) {
    const boards = parsed.boards.map((board) => ({
      id: board.id || createId(),
      name: board.name || "My Job Search",
      columns: normalizeColumns(board.columns),
      jobs: Array.isArray(board.jobs) ? board.jobs : [],
    }));
    return {
      version: 2,
      settings: normalizeSettings(parsed.settings),
      activeBoardId: boards.some((board) => board.id === parsed.activeBoardId) ? parsed.activeBoardId : boards[0]?.id,
      boards: boards.length ? boards : [createBoard("My Job Search", [])],
      xpEvents: Array.isArray(parsed.xpEvents) ? parsed.xpEvents : [],
    };
  }

  const legacyBoard = createBoard("My Job Search", Array.isArray(parsed.jobs) ? parsed.jobs : []);
  legacyBoard.columns = normalizeColumns(parsed.columns);
  const migrated = {
    version: 2,
    settings: getDefaultSettings(),
    activeBoardId: legacyBoard.id,
    boards: [legacyBoard],
    xpEvents: [],
  };

  legacyBoard.jobs.forEach((job) => {
    if (job.status && job.status !== "saved") {
      const xp = getColumnXp(legacyBoard, job.status);
      if (xp > 0) migrated.xpEvents.push(createXpEvent(legacyBoard.id, job.id, job.status, xp));
    }
  });
  return migrated;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  syncExtensionBoardList();
  const status = document.querySelector("#storageStatus");
  if (status) status.textContent = `Saved locally at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function renderApp() {
  ensureActiveBoard();
  applyTheme();
  renderBoardSelector();
  renderSettings();
  renderLevelPanel();
  renderBoard();
  syncExtensionBoardList();
}

function renderBoard() {
  board.innerHTML = "";
  const activeBoard = getActiveBoard();
  const query = searchInput.value.trim().toLowerCase();
  document.querySelector("#activeBoardTitle").textContent = activeBoard.name;

  activeBoard.columns.forEach((column) => {
    const columnElement = columnTemplate.content.firstElementChild.cloneNode(true);
    const cardsElement = columnElement.querySelector(".cards");
    const columnJobs = activeBoard.jobs.filter((job) => job.status === column.id && matchesQuery(job, query));

    columnElement.dataset.columnId = column.id;
    columnElement.querySelector("h2").textContent = column.name;
    columnElement.querySelector(".count").textContent = `${columnJobs.length} ${columnJobs.length === 1 ? "Job" : "Jobs"}`;

    const deleteColumnButton = columnElement.querySelector(".column-menu");
    deleteColumnButton.hidden = isDefaultColumn(column.id);
    deleteColumnButton.addEventListener("click", () => deleteColumn(column.id));

    cardsElement.addEventListener("dragover", (event) => {
      event.preventDefault();
      columnElement.classList.add("drag-over");
      clearDropMarkers();
      const dropTarget = getCardDropTarget(cardsElement, event.clientY);
      dropTarget?.classList.add("drop-before");
    });
    cardsElement.addEventListener("dragleave", (event) => {
      if (cardsElement.contains(event.relatedTarget)) return;
      columnElement.classList.remove("drag-over");
      clearDropMarkers();
    });
    cardsElement.addEventListener("drop", () => {
      const beforeJobId = cardsElement.querySelector(".drop-before")?.dataset.jobId || null;
      columnElement.classList.remove("drag-over");
      clearDropMarkers();
      moveJob(draggedJobId, column.id, beforeJobId);
    });

    columnJobs.forEach((job) => cardsElement.appendChild(renderCard(job)));
    board.appendChild(columnElement);
  });
}

function renderBoardSelector() {
  const select = document.querySelector("#boardSelect");
  select.innerHTML = "";
  state.boards.forEach((board) => {
    const option = document.createElement("option");
    option.value = board.id;
    option.textContent = board.name;
    option.selected = board.id === state.activeBoardId;
    select.appendChild(option);
  });
}

function renderSettings() {
  const activeBoard = getActiveBoard();
  document.querySelector("#xpModeSelect").value = state.settings.xpMode;
  document.querySelector("#themeModeSelect").value = state.settings.themeMode;
  document.querySelector("#colorSchemeSelect").value = state.settings.colorScheme;
  document.querySelector("#boardNameInput").value = activeBoard.name;
  document.querySelector("#customColumnCount").textContent = `Custom columns: ${getCustomColumns(activeBoard).length} / ${MAX_CUSTOM_COLUMNS}`;
  document.querySelector("#deleteBoardBtn").disabled = state.boards.length <= 1;
}

function renderLevelPanel() {
  const total = calculateVisibleXp();
  const levelState = calculateLevel(total);
  const suffix = state.settings.xpMode === "global" ? "account XP" : "board XP";

  document.querySelector("#levelText").textContent = `Level ${levelState.level}`;
  document.querySelector("#levelTitle").textContent = getLevelTitle(levelState.level);
  document.querySelector("#xpMeterFill").style.width = `${levelState.percent}%`;
  document.querySelector("#xpProgress").textContent =
    levelState.level === maxLevel
      ? "Max level reached"
      : `${formatNumber(levelState.currentXp)} / ${formatNumber(levelState.requiredXp)} XP`;
  document.querySelector("#totalXp").textContent = `${formatNumber(total)} ${suffix}`;
}

function renderCard(job) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  const summary = card.querySelector(".card-summary");
  const details = card.querySelector(".card-details");
  const icon = card.querySelector(".company-icon");
  const faviconUrl = getCompanyIconUrl(job);

  card.dataset.jobId = job.id;
  card.querySelector(".card-title").textContent = job.title;
  card.querySelector(".card-company").textContent = job.company;
  card.querySelector(".card-date").textContent = `Applied ${formatDate(job.dateApplied)}`;
  card.querySelector(".job-description").textContent = job.description || "No description saved yet.";
  card.querySelector(".detail-company").textContent = job.company;
  card.querySelector(".detail-date").textContent = formatDate(job.dateApplied);
  card.querySelector(".job-link").href = job.url || "#";
  card.querySelector(".job-link").toggleAttribute("hidden", !job.url);
  card.querySelector(".notes-input").value = job.notes || "";

  icon.textContent = initials(job.company);
  if (faviconUrl) {
    icon.style.backgroundImage = `url("${faviconUrl}")`;
    icon.textContent = "";
  }

  summary.addEventListener("click", () => {
    details.hidden = !details.hidden;
  });
  card.addEventListener("dragstart", () => {
    draggedJobId = job.id;
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => {
    draggedJobId = null;
    card.classList.remove("dragging");
    clearDropMarkers();
  });

  card.querySelector(".notes-input").addEventListener("change", (event) => updateJob(job.id, { notes: event.target.value }));
  card.querySelector(".delete-job").addEventListener("click", () => deleteJob(job.id));
  card.querySelector(".edit-job").addEventListener("click", () => openJobDialog(job));

  const statusSelect = card.querySelector(".status-select");
  populateStatusSelect(statusSelect, job.status);
  statusSelect.addEventListener("change", (event) => moveJob(job.id, event.target.value));
  return card;
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach((view) => {
    view.hidden = view.id !== viewId;
    view.classList.toggle("active-view", view.id === viewId);
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
}

function changeActiveBoard(event) {
  state.activeBoardId = event.target.value;
  saveState();
  renderApp();
}

function changeXpMode(event) {
  state.settings.xpMode = event.target.value;
  saveState();
  renderApp();
}

function changeThemeMode(event) {
  state.settings.themeMode = event.target.value;
  saveState();
  renderApp();
}

function changeColorScheme(event) {
  state.settings.colorScheme = event.target.value;
  saveState();
  renderApp();
}

function renameActiveBoard() {
  const name = document.querySelector("#boardNameInput").value.trim();
  if (!name) return;
  getActiveBoard().name = name;
  saveState();
  renderApp();
}

function confirmResetBoard() {
  const activeBoard = getActiveBoard();
  openConfirm(
    "Reset current board?",
    "This removes all jobs and custom columns from the current board. XP progression will not be reset.",
    () => {
      activeBoard.jobs = [];
      activeBoard.columns = cloneDefaultColumns();
    }
  );
}

function confirmResetBoardProgression() {
  const activeBoard = getActiveBoard();
  openConfirm(
    "Reset board progression?",
    "This removes XP earned on the current board. Jobs and columns will remain.",
    () => {
      state.xpEvents = state.xpEvents.filter((event) => event.boardId !== activeBoard.id);
    }
  );
}

function confirmResetAccountProgression() {
  openConfirm(
    "Reset account progression?",
    "This removes all XP earned across every board. Jobs, boards, and columns will remain.",
    () => {
      state.xpEvents = [];
    }
  );
}

function confirmDeleteBoard() {
  const activeBoard = getActiveBoard();
  if (state.boards.length <= 1) return;
  const keepsXp = state.settings.xpMode === "global";
  openConfirm(
    "Delete current board?",
    keepsXp
      ? "This removes the selected board and its jobs. Global XP already earned from this board will remain."
      : "This removes the selected board, its jobs, and XP earned on this board.",
    () => {
      if (!keepsXp) state.xpEvents = state.xpEvents.filter((event) => event.boardId !== activeBoard.id);
      state.boards = state.boards.filter((board) => board.id !== activeBoard.id);
      state.activeBoardId = state.boards[0].id;
    }
  );
}

function openConfirm(title, message, action) {
  pendingConfirmAction = action;
  document.querySelector("#confirmTitle").textContent = title;
  document.querySelector("#confirmMessage").textContent = message;
  confirmDialog.showModal();
}

function openJobDialog(job = null) {
  editingJobId = job?.id || null;
  jobForm.reset();
  fetchMessage.textContent = "";
  document.querySelector("#jobDialogTitle").textContent = job ? "Edit Job" : "Add Job";
  populateStatusSelect(document.querySelector("#jobStatus"), job?.status || "applied");
  document.querySelector("#jobUrl").value = job?.url || "";
  document.querySelector("#jobTitle").value = job?.title || "";
  document.querySelector("#jobCompany").value = job?.company || "";
  document.querySelector("#jobDate").value = job?.dateApplied || new Date().toISOString().slice(0, 10);
  document.querySelector("#jobDescription").value = job?.description || "";
  document.querySelector("#jobNotes").value = job?.notes || "";
  document.querySelector("#jobPageText").value = "";
  jobDialog.showModal();
}

function openColumnDialog() {
  const activeBoard = getActiveBoard();
  if (getCustomColumns(activeBoard).length >= MAX_CUSTOM_COLUMNS) {
    alert(`Each board can have up to ${MAX_CUSTOM_COLUMNS} custom columns.`);
    return;
  }
  columnForm.reset();
  columnDialog.showModal();
}

function openBoardDialog() {
  boardForm.reset();
  boardDialog.showModal();
}

function handleExtensionMessage(event) {
  if (event.source !== window) return;
  if (event.data?.source !== "hirelevel-extension") return;
  if (event.data?.type === "REQUEST_BOARD_SYNC") {
    syncExtensionBoardList();
    return;
  }
  if (event.data?.type !== "ADD_JOBS") return;

  const jobs = Array.isArray(event.data.jobs) ? event.data.jobs : [];
  const results = jobs.map((rawJob) => addCapturedJob(rawJob));
  saveState();
  renderApp();
  window.postMessage(
    {
      source: "hirelevel-app",
      type: "IMPORT_RESULT",
      results,
    },
    "*"
  );
}

function addCapturedJob(rawJob) {
  const board = state.boards.find((item) => item.id === rawJob?.boardId) || getActiveBoard();
  const job = normalizeCapturedJob(rawJob);
  if (!job) return { action: "skipped", reason: "missing-title-or-company", title: rawJob?.title || "", company: rawJob?.company || "" };

  const jobIdentity = getJobIdentity(job);
  const existing = board.jobs.find((item) => getJobIdentity(item) === jobIdentity);
  if (existing) {
    const mergedJob = {
      ...existing,
      title: job.title,
      company: job.company,
      description: job.description,
      url: job.url,
      source: job.source,
      externalId: job.externalId,
      companyLogoUrl: job.companyLogoUrl,
      id: existing.id,
      status: existing.status,
    };
    board.jobs = board.jobs.map((item) => (item.id === existing.id ? mergedJob : item));
    const earnedXp = awardXpForColumn(board.id, existing.id, existing.status || "applied");
    if (earnedXp > 0) showXpToast(existing, earnedXp);
    return { action: "updated", boardId: board.id, jobId: existing.id, identity: jobIdentity, title: job.title, company: job.company };
  } else {
    board.jobs.push(job);
    const earnedXp = awardXpForColumn(board.id, job.id, job.status);
    if (earnedXp > 0) showXpToast(job, earnedXp);
    return { action: "added", boardId: board.id, jobId: job.id, identity: jobIdentity, title: job.title, company: job.company };
  }
}

function normalizeCapturedJob(rawJob) {
  const title = cleanText(rawJob?.title);
  const company = cleanText(rawJob?.company);
  const description = cleanText(rawJob?.description);
  const url = cleanText(rawJob?.url);
  const source = cleanText(rawJob?.source);
  const externalId = cleanText(rawJob?.externalId);
  const companyLogoUrl = cleanText(rawJob?.companyLogoUrl);
  const status = normalizeInitialCaptureStatus(rawJob?.status);
  if (!title || !company) return null;
  return {
    id: createId(),
    title,
    company,
    description,
    url,
    source,
    externalId,
    companyLogoUrl,
    dateApplied: new Date().toISOString().slice(0, 10),
    status,
    notes: "Captured from browser extension.",
  };
}

function normalizeInitialCaptureStatus(status) {
  return status === "saved" ? "saved" : "applied";
}

function getJobIdentity(job) {
  if (job?.source && job?.externalId) return `${job.source}:${job.externalId}`;
  return job?.url || job?.id || "";
}

async function fetchJobDetails() {
  const urlInput = document.querySelector("#jobUrl");
  const titleInput = document.querySelector("#jobTitle");
  const companyInput = document.querySelector("#jobCompany");
  const descriptionInput = document.querySelector("#jobDescription");
  const url = urlInput.value.trim();
  if (!url) {
    fetchMessage.textContent = "Enter a job URL first.";
    return;
  }
  fetchMessage.textContent = "Trying to read the job page...";
  applyUrlHeuristics(url);
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const metadata = extractJobMetadata(doc, url);
    titleInput.value = metadata.title || titleInput.value;
    companyInput.value = metadata.company || companyInput.value;
    descriptionInput.value = metadata.description || descriptionInput.value;
    fetchMessage.textContent = "Details fetched. Review them before saving.";
  } catch {
    fetchMessage.textContent = "The page blocked local reading. Use the extension for supported boards like LinkedIn or Glassdoor, or paste the visible job details below and use Parse Pasted Text.";
  }
}

function parsePastedText() {
  const parsed = parseJobPageText(document.querySelector("#jobPageText").value);
  if (!parsed.title && !parsed.company && !parsed.description) {
    fetchMessage.textContent = "No job details were found in that pasted text. Try copying only the job details panel.";
    return;
  }
  document.querySelector("#jobTitle").value = parsed.title || document.querySelector("#jobTitle").value;
  document.querySelector("#jobCompany").value = parsed.company || document.querySelector("#jobCompany").value;
  document.querySelector("#jobDescription").value = parsed.description || document.querySelector("#jobDescription").value;
  fetchMessage.textContent = "Pasted text parsed. Review the fields before saving.";
}

function parseJobPageText(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => cleanText(line)).filter(Boolean);
  if (!lines.length) return {};
  const uniqueLines = [];
  lines.forEach((line) => {
    if (uniqueLines[uniqueLines.length - 1] !== line) uniqueLines.push(line);
  });
  const descriptionStart = findMarkerIndex(uniqueLines, ["About the job", "Job description", "About this job", "Responsibilities", "What you'll do", "What you will do"]);
  const headingLines = descriptionStart >= 0 ? uniqueLines.slice(0, descriptionStart) : uniqueLines;
  const usefulHeadingLines = headingLines.filter(isLikelyHeadingLine);
  return {
    title: usefulHeadingLines[0] || "",
    company: cleanCompanyLine(usefulHeadingLines[1] || ""),
    description: descriptionStart >= 0 ? uniqueLines.slice(descriptionStart + 1).filter(isLikelyDescriptionLine).join("\n") : "",
  };
}

function extractJobMetadata(doc, url) {
  const jsonLd = [...doc.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => safeJson(script.textContent))
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .find((item) => item && (item["@type"] === "JobPosting" || item.title));
  return {
    title: cleanText(jsonLd?.title || getMeta(doc, "og:title") || doc.querySelector("title")?.textContent || ""),
    company: cleanText(jsonLd?.hiringOrganization?.name || getMeta(doc, "og:site_name") || companyFromUrl(url)),
    description: cleanText(stripHtml(jsonLd?.description || "") || getMeta(doc, "description") || getMeta(doc, "og:description") || ""),
  };
}

function moveJob(jobId, status, beforeJobId = null) {
  if (!jobId) return;
  const board = getActiveBoard();
  const jobIndex = board.jobs.findIndex((item) => item.id === jobId);
  if (jobIndex < 0 || jobId === beforeJobId) return;

  const [job] = board.jobs.splice(jobIndex, 1);
  const movedJob = { ...job, status };
  const beforeIndex = beforeJobId ? board.jobs.findIndex((item) => item.id === beforeJobId) : -1;
  const insertIndex = beforeIndex >= 0 ? beforeIndex : getAppendIndexForStatus(board.jobs, status);
  board.jobs.splice(insertIndex, 0, movedJob);

  const earnedXp = awardXpForColumn(board.id, jobId, status);
  if (job && earnedXp > 0) showXpToast(job, earnedXp);
  saveState();
  renderApp();
}

function getAppendIndexForStatus(jobs, status) {
  for (let index = jobs.length - 1; index >= 0; index -= 1) {
    if (jobs[index].status === status) return index + 1;
  }
  return jobs.length;
}

function getCardDropTarget(cardsElement, pointerY) {
  return Array.from(cardsElement.querySelectorAll(".job-card:not(.dragging)")).find((card) => {
    const box = card.getBoundingClientRect();
    return pointerY < box.top + box.height / 2;
  });
}

function clearDropMarkers() {
  document.querySelectorAll(".drop-before").forEach((card) => card.classList.remove("drop-before"));
}

function updateJob(jobId, patch) {
  const board = getActiveBoard();
  board.jobs = board.jobs.map((job) => (job.id === jobId ? { ...job, ...patch } : job));
  saveState();
}

function deleteJob(jobId) {
  const board = getActiveBoard();
  const job = board.jobs.find((item) => item.id === jobId);
  if (!job) return;
  if (!confirm(`Delete "${job.title}" from the tracker? XP already earned from this job will stay.`)) return;
  board.jobs = board.jobs.filter((item) => item.id !== jobId);
  saveState();
  renderApp();
}

function deleteColumn(columnId) {
  const board = getActiveBoard();
  const hasJobs = board.jobs.some((job) => job.status === columnId);
  if (hasJobs) {
    alert("Move or delete the jobs in this column before removing it.");
    return;
  }
  board.columns = board.columns.filter((column) => column.id !== columnId);
  saveState();
  renderApp();
}

function awardXpForColumn(boardId, jobId, columnId) {
  const board = state.boards.find((item) => item.id === boardId);
  if (!board || !jobId || !columnId) return 0;
  const xp = getColumnXp(board, columnId);
  if (xp <= 0) return 0;
  const alreadyEarned = state.xpEvents.some((event) => event.boardId === boardId && event.jobId === jobId && event.columnId === columnId);
  if (alreadyEarned) return 0;
  state.xpEvents.push(createXpEvent(boardId, jobId, columnId, xp));
  return xp;
}

function showXpToast(job, xp) {
  const toast = document.querySelector("#toast");
  toast.textContent = `Added ${job.title} at ${job.company} +${formatNumber(xp)} XP`;
  toast.hidden = false;
  window.clearTimeout(showXpToast.timeoutId);
  showXpToast.timeoutId = window.setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function createXpEvent(boardId, jobId, columnId, xp) {
  return { id: createId(), boardId, jobId, columnId, xp, earnedAt: new Date().toISOString() };
}

function getColumnXp(board, columnId) {
  if (statusXp[columnId] !== undefined) return statusXp[columnId];
  return board.columns.some((column) => column.id === columnId && column.type === "custom") ? CUSTOM_COLUMN_XP : 0;
}

function calculateVisibleXp() {
  if (state.settings.xpMode === "per-board") {
    return state.xpEvents.filter((event) => event.boardId === state.activeBoardId).reduce((total, event) => total + event.xp, 0);
  }
  return state.xpEvents.reduce((total, event) => total + event.xp, 0);
}

function calculateLevel(totalXp) {
  let level = 1;
  let remainingXp = totalXp;
  while (level < maxLevel) {
    const requiredXp = getLevelRequirement(level);
    if (remainingXp < requiredXp) {
      return { level, currentXp: remainingXp, requiredXp, percent: Math.min(100, Math.round((remainingXp / requiredXp) * 100)) };
    }
    remainingXp -= requiredXp;
    level += 1;
  }
  return { level: maxLevel, currentXp: 0, requiredXp: 0, percent: 100 };
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hirelevel-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importState(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    state = migrateState(JSON.parse(await file.text()));
    saveState();
    renderApp();
  } catch {
    alert("That JSON file does not look like a HireLevel export.");
  } finally {
    event.target.value = "";
  }
}

function syncExtensionBoardList() {
  window.postMessage(
    {
      source: "hirelevel-app",
      type: "SYNC_BOARDS",
      boards: state.boards.map((board) => ({ id: board.id, name: board.name })),
      activeBoardId: state.activeBoardId,
      theme: getExtensionTheme(),
    },
    "*"
  );
}

function getDefaultSettings() {
  return { xpMode: "global", themeMode: "light", colorScheme: "green" };
}

function normalizeSettings(settings = {}) {
  const defaults = getDefaultSettings();
  return {
    xpMode: ["global", "per-board"].includes(settings.xpMode) ? settings.xpMode : defaults.xpMode,
    themeMode: ["light", "dark"].includes(settings.themeMode) ? settings.themeMode : defaults.themeMode,
    colorScheme: ["green", "mint", "sky", "lavender", "rose"].includes(settings.colorScheme) ? settings.colorScheme : defaults.colorScheme,
  };
}

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.themeMode;
  document.documentElement.dataset.colorScheme = state.settings.colorScheme;
}

function getExtensionTheme() {
  const style = getComputedStyle(document.documentElement);
  return {
    mode: state.settings.themeMode,
    colorScheme: state.settings.colorScheme,
    panel: style.getPropertyValue("--panel").trim(),
    ink: style.getPropertyValue("--ink").trim(),
    line: style.getPropertyValue("--line").trim(),
    accent: style.getPropertyValue("--accent").trim(),
    accentDark: style.getPropertyValue("--accent-dark").trim(),
    accentSoft: style.getPropertyValue("--accent-soft").trim(),
    shadow: state.settings.themeMode === "dark" ? "0 10px 28px rgba(0,0,0,.36)" : "0 10px 28px rgba(0,0,0,.14)",
  };
}

function createBoard(name, jobs = []) {
  return { id: createId(), name, columns: cloneDefaultColumns(), jobs };
}

function cloneDefaultColumns() {
  return defaultColumns.map((column) => ({ ...column }));
}

function normalizeColumns(columns) {
  const incoming = Array.isArray(columns) && columns.length ? columns : defaultColumns;
  const defaultNames = new Map(defaultColumns.map((column) => [column.id, column.name]));
  return incoming.map((column) => ({
    ...column,
    type: isDefaultColumn(column.id) ? "default" : column.type || "custom",
    name: defaultNames.get(column.id) || column.name,
  }));
}

function getActiveBoard() {
  ensureActiveBoard();
  return state.boards.find((board) => board.id === state.activeBoardId);
}

function ensureActiveBoard() {
  if (!state.boards.length) state.boards.push(createBoard("My Job Search", []));
  if (!state.boards.some((board) => board.id === state.activeBoardId)) state.activeBoardId = state.boards[0].id;
}

function getCustomColumns(board) {
  return board.columns.filter((column) => !isDefaultColumn(column.id));
}

function populateStatusSelect(select, selected) {
  select.innerHTML = "";
  getActiveBoard().columns.forEach((column) => {
    const option = document.createElement("option");
    option.value = column.id;
    option.textContent = column.name;
    option.selected = column.id === selected;
    select.appendChild(option);
  });
}

function matchesQuery(job, query) {
  if (!query) return true;
  return [job.title, job.company, job.description, job.notes].join(" ").toLowerCase().includes(query);
}

function isDefaultColumn(columnId) {
  return defaultColumns.some((column) => column.id === columnId);
}

function getLevelRequirement(level) {
  if (level < endgameLevelStart) return 5 + 3 * (level - 1);
  return Math.round(300 + endgameCurveMultiplier * (level - (endgameLevelStart - 1)) ** 2);
}

function getLevelTitle(level) {
  if (level >= maxLevel) return "Job Holder";
  const tierIndex = Math.min(titleTiers.length - 1, Math.floor((level - 1) / 10));
  return `${titleTiers[tierIndex]} ${romanNumerals[(level - 1) % 10]}`;
}

function findMarkerIndex(lines, markers) {
  return lines.findIndex((line) => markers.some((marker) => line.toLowerCase() === marker.toLowerCase()));
}

function isLikelyHeadingLine(line) {
  const lower = line.toLowerCase();
  const exactNoise = new Set(["linkedin", "home", "jobs", "messaging", "notifications", "me", "search", "save", "apply", "easy apply", "show more", "show less", "share", "report this job"]);
  if (exactNoise.has(lower)) return false;
  if (lower.includes("applicants") || lower.includes("posted") || lower.includes("connections") || lower.includes("promoted") || lower.includes("see who")) return false;
  if (/^\d/.test(line)) return false;
  return line.length <= 120;
}

function isLikelyDescriptionLine(line) {
  const lower = line.toLowerCase();
  if (["show more", "show less", "apply", "easy apply", "save"].includes(lower)) return false;
  return !lower.startsWith("similar jobs") && !lower.startsWith("people also viewed");
}

function applyUrlHeuristics(url) {
  const titleInput = document.querySelector("#jobTitle");
  const companyInput = document.querySelector("#jobCompany");
  if (!companyInput.value) companyInput.value = companyFromUrl(url);
  if (!titleInput.value) titleInput.value = titleFromUrl(url);
}

function getMeta(doc, name) {
  return doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.content || "";
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function stripHtml(text) {
  const node = document.createElement("div");
  node.innerHTML = text;
  return node.textContent || "";
}

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function cleanCompanyLine(line) {
  return cleanText(line.split(" · ")[0].split(" | ")[0]);
}

function formatDate(date) {
  if (!date) return "No date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function formatNumber(number) {
  return new Intl.NumberFormat().format(number);
}

function companyFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    const name = parts.length > 2 ? parts[parts.length - 2] : parts[0];
    return titleCase(name.replace(/[-_]/g, " "));
  } catch {
    return "";
  }
}

function titleFromUrl(url) {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
    return titleCase(path.replace(/\.(html|php|aspx)$/i, "").replace(/[-_+]/g, " "));
  } catch {
    return "";
  }
}

function titleCase(text) {
  return cleanText(text).split(" ").filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function slugify(text, columns, ensureUnique = false) {
  const base = text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "column";
  if (!ensureUnique) return base;
  let candidate = base;
  let index = 2;
  while (columns.some((column) => column.id === candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function initials(company) {
  return cleanText(company).split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "?";
}

function getCompanyIconUrl(job) {
  if (job.companyLogoUrl) return job.companyLogoUrl;
  if (isLinkedInUrl(job.url)) return "";
  return getFaviconUrl(job.url);
}

function isLinkedInUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() === "linkedin.com";
  } catch {
    return false;
  }
}

function getFaviconUrl(url) {
  try {
    return `${new URL(url).origin}/favicon.ico`;
  } catch {
    return "";
  }
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
