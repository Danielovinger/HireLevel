const STORAGE_KEY = "hirelevel-state-v2";
const LEGACY_STORAGE_KEYS = ["hirelevel-state-v1", "open-job-tracker-state-v1"];
const DATA_FILE_DB_NAME = "hirelevel-data-file";
const DATA_FILE_STORE_NAME = "handles";
const DATA_FILE_HANDLE_KEY = "primary";
const MAX_CUSTOM_COLUMNS = 5;
const CUSTOM_COLUMN_XP = 25;

const defaultColumns = [
  { id: "saved", name: "Saved", type: "default" },
  { id: "applied", name: "Applied", type: "default" },
  { id: "received-answer", name: "First Positive Answer", type: "default" },
  { id: "interviewing", name: "Interviewing", type: "default" },
  { id: "offer", name: "Offer", type: "default" },
  { id: "rejected", name: "Reject", type: "default" },
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
const achievementDefinitions = [
  {
    id: "first-step",
    name: "First Step",
    description: "Add your first job.",
    icon: "assets/achievements/first-step.png",
    xpReward: 25,
    condition: (stats) => stats.totalJobs >= 1,
  },
  {
    id: "getting-serious",
    name: "Getting Serious",
    description: "Add 10 jobs.",
    icon: "assets/achievements/getting-serious.png",
    xpReward: 50,
    condition: (stats) => stats.totalJobs >= 10,
  },
  {
    id: "application-machine",
    name: "Application Machine",
    description: "Add 50 jobs.",
    icon: "assets/achievements/application-machine.png",
    xpReward: 100,
    condition: (stats) => stats.totalJobs >= 50,
  },
  {
    id: "tiny-net-wide-sea",
    name: "Tiny Net, Wide Sea",
    description: "Add 25 jobs.",
    icon: "assets/achievements/tiny-net-wide-sea.png",
    xpReward: 100,
    condition: (stats) => stats.totalJobs >= 25,
  },
  {
    id: "spreadsheet-spirit",
    name: "Spreadsheet Spirit",
    description: "Add 100 jobs.",
    icon: "assets/achievements/spreadsheet-spirit.png",
    xpReward: 250,
    condition: (stats) => stats.totalJobs >= 100,
  },
  {
    id: "spray-and-pray",
    name: "Spray and Pray",
    description: "Add 250 jobs.",
    icon: "assets/achievements/spray-and-pray.png",
    xpReward: 1000,
    condition: (stats) => stats.totalJobs >= 250,
  },
  {
    id: "saved-for-later",
    name: "Saved for Later",
    description: "Save your first job without applying.",
    icon: "assets/achievements/saved-for-later.png",
    xpReward: 25,
    condition: (stats) => stats.statusCounts.saved >= 1,
  },
  {
    id: "saved-hoarder",
    name: "Saved Hoarder",
    description: "Save 25 jobs.",
    icon: "assets/achievements/saved-hoarder.png",
    xpReward: 100,
    condition: (stats) => stats.statusCounts.saved >= 25,
  },
  {
    id: "maybe-later-means-never",
    name: "Maybe Later Means Never",
    description: "Save 50 jobs.",
    icon: "assets/achievements/maybe-later-means-never.png",
    xpReward: 250,
    condition: (stats) => stats.statusCounts.saved >= 50,
  },
  {
    id: "sent-it",
    name: "Sent It",
    description: "Move a job to Applied.",
    icon: "assets/achievements/sent-it.png",
    xpReward: 25,
    condition: (stats) => stats.statusCounts.applied >= 1 || stats.columnXpEvents.applied >= 1,
  },
  {
    id: "positive-signal",
    name: "Positive Signal",
    description: "Move a job to First Positive Answer.",
    icon: "assets/achievements/positive-signal.png",
    xpReward: 50,
    condition: (stats) => stats.statusCounts["received-answer"] >= 1 || stats.columnXpEvents["received-answer"] >= 1,
  },
  {
    id: "inbox-tremor",
    name: "Inbox Tremor",
    description: "Move 5 jobs to First Positive Answer.",
    icon: "assets/achievements/inbox-tremor.png",
    xpReward: 100,
    condition: (stats) => stats.statusCounts["received-answer"] >= 5 || stats.columnXpEvents["received-answer"] >= 5,
  },
  {
    id: "theyre-talking-back",
    name: "They're Talking Back",
    description: "Move 15 jobs to First Positive Answer.",
    icon: "assets/achievements/theyre-talking-back.png",
    xpReward: 250,
    condition: (stats) => stats.statusCounts["received-answer"] >= 15 || stats.columnXpEvents["received-answer"] >= 15,
  },
  {
    id: "signal-storm",
    name: "Signal Storm",
    description: "Move 30 jobs to First Positive Answer.",
    icon: "assets/achievements/signal-storm.png",
    xpReward: 1000,
    condition: (stats) => stats.statusCounts["received-answer"] >= 30 || stats.columnXpEvents["received-answer"] >= 30,
  },
  {
    id: "interview-arc-begins",
    name: "Interview Arc Begins",
    description: "Move a job to Interviewing.",
    icon: "assets/achievements/interview-arc-begins.png",
    xpReward: 100,
    condition: (stats) => stats.statusCounts.interviewing >= 1 || stats.columnXpEvents.interviewing >= 1,
  },
  {
    id: "interview-juggler",
    name: "Interview Juggler",
    description: "Move 5 jobs to Interviewing.",
    icon: "assets/achievements/interview-juggler.png",
    xpReward: 250,
    condition: (stats) => stats.statusCounts.interviewing >= 5 || stats.columnXpEvents.interviewing >= 5,
  },
  {
    id: "offer-on-the-table",
    name: "Offer on the Table",
    description: "Move a job to Offer.",
    icon: "assets/achievements/offer-on-the-table.png",
    xpReward: 1000,
    condition: (stats) => stats.statusCounts.offer >= 1 || stats.columnXpEvents.offer >= 1,
  },
  {
    id: "offer-collector",
    name: "Offer Collector",
    description: "Get 2 offers.",
    icon: "assets/achievements/offer-collector.png",
    xpReward: 1000,
    condition: (stats) => stats.statusCounts.offer >= 2 || stats.columnXpEvents.offer >= 2,
  },
  {
    id: "not-this-one",
    name: "Not This One",
    description: "Move a job to Reject.",
    icon: "assets/achievements/not-this-one.png",
    xpReward: 25,
    condition: (stats) => stats.statusCounts.rejected >= 1 || stats.columnXpEvents.rejected >= 1,
  },
  {
    id: "still-standing",
    name: "Still Standing",
    description: "Have 10 rejected jobs.",
    icon: "assets/achievements/still-standing.png",
    xpReward: 100,
    condition: (stats) => stats.statusCounts.rejected >= 10 || stats.columnXpEvents.rejected >= 10,
  },
  {
    id: "their-loss",
    name: "Their loss...",
    description: "Have 30 rejected jobs.",
    icon: "assets/achievements/their-loss.png",
    xpReward: 250,
    condition: (stats) => stats.statusCounts.rejected >= 30 || stats.columnXpEvents.rejected >= 30,
  },
  {
    id: "i-didnt-hear-no-bell",
    name: "I didn't hear no bell!",
    description: "Have 50 rejected jobs.",
    icon: "assets/achievements/i-didnt-hear-no-bell.png",
    xpReward: 1000,
    condition: (stats) => stats.statusCounts.rejected >= 50 || stats.columnXpEvents.rejected >= 50,
  },
  {
    id: "for-the-love-of-the-game",
    name: "At this point I do this for the love of the game",
    description: "Have 100 rejected jobs.",
    icon: "assets/achievements/for-the-love-of-the-game.png",
    xpReward: 1000,
    condition: (stats) => stats.statusCounts.rejected >= 100 || stats.columnXpEvents.rejected >= 100,
  },
  {
    id: "which-one-of-you",
    name: "Which one of you was I talking to again?",
    description: "Move 20 jobs to Interviewing.",
    icon: "assets/achievements/which-one-of-you.png",
    xpReward: 1000,
    condition: (stats) => stats.statusCounts.interviewing >= 20 || stats.columnXpEvents.interviewing >= 20,
  },
  {
    id: "calendar-full-soul-empty",
    name: "Calendar Full, Soul Empty",
    description: "Move 50 jobs to Interviewing.",
    icon: "assets/achievements/calendar-full-soul-empty.png",
    xpReward: 1000,
    condition: (stats) => stats.statusCounts.interviewing >= 50 || stats.columnXpEvents.interviewing >= 50,
  },
  {
    id: "pipeline-builder",
    name: "Pipeline Builder",
    description: "Have at least one job in Saved, Applied, First Positive Answer, Interviewing, and Offer.",
    icon: "assets/achievements/pipeline-builder.png",
    xpReward: 250,
    condition: (stats) => ["saved", "applied", "received-answer", "interviewing", "offer"].every((status) => stats.statusCounts[status] >= 1),
  },
  {
    id: "the-board-breathes",
    name: "The Board Breathes",
    description: "Have jobs in every default column at the same time.",
    icon: "assets/achievements/the-board-breathes.png",
    xpReward: 250,
    condition: (stats) => defaultColumns.every((column) => stats.statusCounts[column.id] >= 1),
  },
  {
    id: "full-house",
    name: "Full House",
    description: "Have jobs in every default column at the same time, plus at least one custom column.",
    icon: "assets/achievements/full-house.png",
    xpReward: 500,
    condition: (stats) => defaultColumns.every((column) => stats.statusCounts[column.id] >= 1) && stats.customColumnCount >= 1,
  },
  {
    id: "green-glow-garden",
    name: "Green Glow Garden",
    description: "Have 50 jobs currently in Applied.",
    icon: "assets/achievements/green-glow-garden.png",
    xpReward: 250,
    condition: (stats) => stats.statusCounts.applied >= 50,
  },
  {
    id: "board-architect",
    name: "Board Architect",
    description: "Create a second board.",
    icon: "assets/achievements/board-architect.png",
    xpReward: 50,
    condition: (stats) => stats.boardCount >= 2,
  },
  {
    id: "second-board-energy",
    name: "Second Board Energy",
    description: "Create 3 boards.",
    icon: "assets/achievements/second-board-energy.png",
    xpReward: 100,
    condition: (stats) => stats.boardCount >= 3,
  },
  {
    id: "parallel-universes",
    name: "Parallel Universes",
    description: "Create 5 boards.",
    icon: "assets/achievements/parallel-universes.png",
    xpReward: 250,
    condition: (stats) => stats.boardCount >= 5,
  },
  {
    id: "custom-workflow",
    name: "Custom Workflow",
    description: "Add your first custom column.",
    icon: "assets/achievements/custom-workflow.png",
    xpReward: 25,
    condition: (stats) => stats.customColumnCount >= 1,
  },
  {
    id: "workflow-goblin",
    name: "Workflow Goblin",
    description: "Create 3 custom columns total.",
    icon: "assets/achievements/workflow-goblin.png",
    xpReward: 100,
    condition: (stats) => stats.customColumnCount >= 3,
  },
  {
    id: "process-engineer",
    name: "Process Engineer",
    description: "Create 10 custom columns across all boards.",
    icon: "assets/achievements/process-engineer.png",
    xpReward: 250,
    condition: (stats) => stats.customColumnCount >= 10,
  },
  {
    id: "fresh-paint",
    name: "Fresh Paint",
    description: "Change the board skin from Forest to another skin.",
    icon: "assets/achievements/fresh-paint.png",
    xpReward: 25,
    condition: (stats) => stats.hasChangedBoardSkin,
  },
  {
    id: "data-hoarder-but-healthy",
    name: "Data Hoarder, But Healthy",
    description: "Connect a JSON data file.",
    icon: "assets/achievements/data-hoarder-but-healthy.png",
    xpReward: 50,
    condition: (stats) => stats.appEvents.has("data-file-connected"),
  },
  {
    id: "backup-ritual",
    name: "Backup Ritual",
    description: "Export JSON once.",
    icon: "assets/achievements/backup-ritual.png",
    xpReward: 25,
    condition: (stats) => stats.appEvents.has("json-exported"),
  },
  {
    id: "network-thread",
    name: "Network Thread",
    description: "Add your first contact log entry.",
    icon: "assets/achievements/network-thread.png",
    xpReward: 25,
    condition: (stats) => stats.contactCount >= 1,
  },
  {
    id: "people-person",
    name: "People Person",
    description: "Add 10 contact log entries.",
    icon: "assets/achievements/people-person.png",
    xpReward: 100,
    condition: (stats) => stats.contactCount >= 10,
  },
  {
    id: "name-to-remember",
    name: "Name to Remember",
    description: "Add 25 contact log entries.",
    icon: "assets/achievements/name-to-remember.png",
    xpReward: 250,
    condition: (stats) => stats.contactCount >= 25,
  },
  {
    id: "professional-yapper",
    name: "Professional Yapper",
    description: "Add 50 contact log entries.",
    icon: "assets/achievements/professional-yapper.png",
    xpReward: 1000,
    condition: (stats) => stats.contactCount >= 50,
  },
  {
    id: "historian",
    name: "Historian",
    description: "Have 25 timeline events recorded.",
    icon: "assets/achievements/historian.png",
    xpReward: 100,
    condition: (stats) => stats.timelineEventCount >= 25,
  },
  {
    id: "historian-archivist",
    name: "Historian Archivist",
    description: "Have 75 timeline events recorded.",
    icon: "assets/achievements/historian-archivist.png",
    xpReward: 250,
    condition: (stats) => stats.timelineEventCount >= 75,
  },
  {
    id: "historian-mythkeeper",
    name: "Historian Mythkeeper",
    description: "Have 250 timeline events recorded.",
    icon: "assets/achievements/historian-mythkeeper.png",
    xpReward: 1000,
    condition: (stats) => stats.timelineEventCount >= 250,
  },
  {
    id: "lorekeeper",
    name: "Lorekeeper",
    description: "Record 500 timeline events.",
    icon: "assets/achievements/lorekeeper.png",
    xpReward: 1000,
    condition: (stats) => stats.timelineEventCount >= 500,
  },
  {
    id: "why-are-you-still-here",
    name: "Why are you still here?",
    description: "Get three offers. Seriously, go work.",
    icon: "assets/achievements/why-are-you-still-here.png",
    xpReward: "max-level",
    hiddenXpReward: true,
    condition: (stats) => stats.statusCounts.offer >= 3 || stats.columnXpEvents.offer >= 3,
  },
  {
    id: "level-up-novice",
    name: "Level Up Novice",
    description: "Reach level 10.",
    icon: "assets/achievements/level-up-novice.png",
    xpReward: 100,
    condition: (stats) => stats.accountLevel >= 10,
  },
  {
    id: "level-up-advanced",
    name: "Level Up Advanced",
    description: "Reach level 75.",
    icon: "assets/achievements/level-up-advanced.png",
    xpReward: 250,
    condition: (stats) => stats.accountLevel >= 75,
  },
  {
    id: "level-up-master",
    name: "Level Up Master",
    description: "Reach level 150.",
    icon: "assets/achievements/level-up-master.png",
    xpReward: 1000,
    condition: (stats) => stats.accountLevel >= 150,
  },
];

let state = loadState();
let editingJobId = null;
let draggedJobId = null;
let pendingConfirmAction = null;
let achievementPopupQueue = [];
let currentAchievementPopupId = null;
let isEvaluatingAchievements = false;
let dataFileHandle = null;
let dataFileSavePromise = null;
let dataFileSaveQueued = false;
let logoCacheRequestSent = false;

const board = document.querySelector("#board");
const columnTemplate = document.querySelector("#columnTemplate");
const cardTemplate = document.querySelector("#cardTemplate");
const jobDialog = document.querySelector("#jobDialog");
const columnDialog = document.querySelector("#columnDialog");
const boardDialog = document.querySelector("#boardDialog");
const confirmDialog = document.querySelector("#confirmDialog");
const achievementDialog = document.querySelector("#achievementDialog");
const jobForm = document.querySelector("#jobForm");
const columnForm = document.querySelector("#columnForm");
const boardForm = document.querySelector("#boardForm");
const confirmForm = document.querySelector("#confirmForm");
const achievementConfirmBtn = document.querySelector("#achievementConfirmBtn");
const achievementSkipBtn = document.querySelector("#achievementSkipBtn");
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
document.querySelector("#boardSkinSelect").addEventListener("change", changeBoardSkin);
document.querySelector("#renameBoardBtn").addEventListener("click", renameActiveBoard);
document.querySelector("#resetBoardBtn").addEventListener("click", confirmResetBoard);
document.querySelector("#resetBoardProgressBtn").addEventListener("click", confirmResetBoardProgression);
document.querySelector("#resetAccountProgressBtn").addEventListener("click", confirmResetAccountProgression);
document.querySelector("#deleteBoardBtn").addEventListener("click", confirmDeleteBoard);
document.querySelector("#createDataFileBtn").addEventListener("click", createDataFile);
document.querySelector("#openDataFileBtn").addEventListener("click", openDataFile);
document.querySelector("#saveDataFileBtn").addEventListener("click", saveDataFileNow);
document.querySelector("#confirmNoBtn").addEventListener("click", () => confirmDialog.close());
achievementConfirmBtn.addEventListener("click", confirmCurrentAchievement);
achievementSkipBtn.addEventListener("click", skipAchievementQueue);
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
  const existingJob = editingJobId ? board.jobs.find((job) => job.id === editingJobId) : null;
  const job = {
    id: editingJobId || createId(),
    url: formData.get("url").trim(),
    title: formData.get("title").trim(),
    company: formData.get("company").trim(),
    dateApplied: formData.get("dateApplied"),
    status: formData.get("status"),
    description: formData.get("description").trim(),
    notes: formData.get("notes").trim(),
    source: existingJob?.source || "",
    externalId: existingJob?.externalId || "",
    companyLogoUrl: existingJob?.companyLogoUrl || "",
    companyLogoDataUrl: existingJob?.companyLogoDataUrl || "",
    timeline: normalizeTimeline(existingJob?.timeline),
    contacts: normalizeContacts(existingJob?.contacts),
  };

  if (editingJobId) {
    board.jobs = board.jobs.map((existing) => (existing.id === editingJobId ? job : existing));
    if (existingJob?.status !== job.status) {
      addJobTimelineEvent(board, job.id, "status", `Moved to ${getColumnName(board, job.status)}`, `From ${getColumnName(board, existingJob.status)}.`);
    } else {
      addJobTimelineEvent(board, job.id, "edited", "Job details edited");
    }
  } else {
    addJobTimelineEventToJob(job, "created", `Added to ${getColumnName(board, job.status)}`, "Created manually in HireLevel.");
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

queueUnseenAchievements();
evaluateAchievements();
renderApp();
saveState();
showNextAchievementPopup();
initializeDataFile();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!saved) {
    const board = createBoard("My Job Search", []);
    return { version: 2, settings: getDefaultSettings(), activeBoardId: board.id, boards: [board], xpEvents: [], achievements: [], appEvents: [] };
  }

  try {
    return migrateState(JSON.parse(saved));
  } catch {
    const board = createBoard("My Job Search", []);
    return { version: 2, settings: getDefaultSettings(), activeBoardId: board.id, boards: [board], xpEvents: [], achievements: [], appEvents: [] };
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
      achievements: normalizeAchievements(parsed.achievements),
      appEvents: normalizeAppEvents(parsed.appEvents),
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
    achievements: [],
    appEvents: [],
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
  evaluateAchievements();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueDataFileSave();
  syncExtensionBoardList();
  const status = document.querySelector("#storageStatus");
  if (status) status.textContent = `Saved locally at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  renderDataFileSettings();
  window.setTimeout(showNextAchievementPopup, 0);
}

function renderApp() {
  ensureActiveBoard();
  applyTheme();
  renderBoardSelector();
  renderSettings();
  renderAchievements();
  renderLevelPanel();
  renderBoard();
  syncExtensionBoardList();
}

function renderBoard() {
  board.innerHTML = "";
  const activeBoard = getActiveBoard();
  const query = searchInput.value.trim().toLowerCase();
  board.style.setProperty("--column-count", activeBoard.columns.length);
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
  document.querySelector("#boardSkinSelect").value = state.settings.boardSkin;
  document.querySelector("#boardNameInput").value = activeBoard.name;
  document.querySelector("#customColumnCount").textContent = `Custom columns: ${getCustomColumns(activeBoard).length} / ${MAX_CUSTOM_COLUMNS}`;
  document.querySelector("#deleteBoardBtn").disabled = state.boards.length <= 1;
  renderDataFileSettings();
}

function renderAchievements() {
  const grid = document.querySelector("#achievementGrid");
  const summary = document.querySelector("#achievementSummary");
  if (!grid || !summary) return;

  const unlocked = getUnlockedAchievementMap();
  summary.textContent = `${unlocked.size} / ${achievementDefinitions.length} unlocked`;
  grid.innerHTML = "";

  achievementDefinitions.forEach((achievement) => {
    const unlockedRecord = unlocked.get(achievement.id);
    const card = document.createElement("article");
    card.className = "achievement-card";
    card.classList.toggle("unlocked", Boolean(unlockedRecord));

    const icon = document.createElement("img");
    icon.src = achievement.icon;
    icon.alt = "";

    const content = document.createElement("div");
    const title = document.createElement("h3");
    const description = document.createElement("p");
    const meta = document.createElement("span");

    title.textContent = achievement.name;
    description.textContent = achievement.description;
    meta.textContent = unlockedRecord
      ? `Unlocked ${formatDate(unlockedRecord.unlockedAt.slice(0, 10))} - +${formatAchievementXp(achievement)}`
      : `Locked - +${formatAchievementXp(achievement)}`;

    content.append(title, description, meta);
    card.append(icon, content);
    grid.appendChild(card);
  });
}

function renderDataFileSettings(message = "") {
  const status = document.querySelector("#dataFileStatus");
  const createButton = document.querySelector("#createDataFileBtn");
  const openButton = document.querySelector("#openDataFileBtn");
  const saveButton = document.querySelector("#saveDataFileBtn");
  if (!status || !createButton || !openButton || !saveButton) return;

  const supported = supportsFileSystemAccess();
  createButton.disabled = !supported;
  openButton.disabled = !supported;
  saveButton.disabled = !supported || !dataFileHandle;

  if (!supported) {
    status.textContent = "Data files are not supported in this browser. Export JSON backups regularly.";
    return;
  }

  if (message) {
    status.textContent = message;
    return;
  }

  status.textContent = dataFileHandle
    ? `Connected data file: ${dataFileHandle.name}. Changes autosave to this file.`
    : "Saving to browser storage. Connect a JSON data file for safer local persistence.";
}

function supportsFileSystemAccess() {
  return Boolean(window.showOpenFilePicker && window.showSaveFilePicker && window.indexedDB);
}

async function initializeDataFile() {
  if (!supportsFileSystemAccess()) {
    renderDataFileSettings();
    return;
  }

  try {
    const handle = await getStoredDataFileHandle();
    if (!handle) {
      renderDataFileSettings();
      return;
    }

    dataFileHandle = handle;
    const hasPermission = await verifyFilePermission(dataFileHandle, false);
    if (!hasPermission) {
      renderDataFileSettings(`Data file remembered: ${dataFileHandle.name}. Click Save Now to restore permission.`);
      return;
    }

    const loadedState = await readStateFromDataFile(dataFileHandle);
    if (loadedState) {
      state = loadedState;
      recordAppEvent("data-file-connected");
      queueUnseenAchievements();
      evaluateAchievements();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderApp();
      saveState();
      showNextAchievementPopup();
      renderDataFileSettings(`Loaded data file: ${dataFileHandle.name}. Changes autosave to this file.`);
    }
  } catch (error) {
    console.warn("Could not initialize HireLevel data file", error);
    renderDataFileSettings("The remembered data file could not be opened. Browser storage is still available.");
  }
}

async function createDataFile() {
  if (!supportsFileSystemAccess()) {
    alert("Data files are supported in Chrome and Edge. Use Export JSON backups in this browser.");
    return;
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: "HireLevel-data.json",
      types: [
        {
          description: "HireLevel JSON data",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    dataFileHandle = handle;
    if (!(await verifyFilePermission(dataFileHandle, true))) {
      dataFileHandle = null;
      renderDataFileSettings("Data file permission was not granted. Browser storage is still available.");
      return;
    }
    await saveStoredDataFileHandle(dataFileHandle);
    recordAppEvent("data-file-connected");
    await writeStateToDataFile(dataFileHandle);
    saveState();
    renderApp();
    showNextAchievementPopup();
    renderDataFileSettings(`Created data file: ${dataFileHandle.name}. Changes autosave to this file.`);
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.warn("Could not create HireLevel data file", error);
      alert("HireLevel could not create that data file. Try another folder or file name.");
    }
  }
}

async function openDataFile() {
  if (!supportsFileSystemAccess()) {
    alert("Data files are supported in Chrome and Edge. Use Import JSON in this browser.");
    return;
  }

  if (!confirm("Open this data file and replace the current board with its saved contents?")) return;

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: "HireLevel JSON data",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    if (!(await verifyFilePermission(handle, true))) {
      renderDataFileSettings("Data file permission was not granted. Browser storage is still available.");
      return;
    }
    const loadedState = await readStateFromDataFile(handle);
    if (!loadedState) {
      alert("That file does not look like a HireLevel data file.");
      return;
    }

    dataFileHandle = handle;
    await saveStoredDataFileHandle(dataFileHandle);
    state = loadedState;
    recordAppEvent("data-file-connected");
    queueUnseenAchievements();
    evaluateAchievements();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderApp();
    saveState();
    showNextAchievementPopup();
    renderDataFileSettings(`Opened data file: ${dataFileHandle.name}. Changes autosave to this file.`);
    syncExtensionBoardList();
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.warn("Could not open HireLevel data file", error);
      alert("HireLevel could not open that data file.");
    }
  }
}

async function saveDataFileNow() {
  if (!supportsFileSystemAccess()) {
    alert("Data files are supported in Chrome and Edge. Use Export JSON backups in this browser.");
    return;
  }

  if (!dataFileHandle) {
    await createDataFile();
    return;
  }

  try {
    if (!(await verifyFilePermission(dataFileHandle, true))) {
      renderDataFileSettings(`Data file permission was not granted for ${dataFileHandle.name}.`);
      return;
    }
    await writeStateToDataFile(dataFileHandle);
    await saveStoredDataFileHandle(dataFileHandle);
    recordAppEvent("data-file-connected");
    saveState();
    renderApp();
    showNextAchievementPopup();
    renderDataFileSettings(`Saved data file: ${dataFileHandle.name}.`);
  } catch (error) {
    console.warn("Could not save HireLevel data file", error);
    alert("HireLevel could not save the connected data file. Try reconnecting it.");
  }
}

function queueDataFileSave() {
  if (!dataFileHandle || !supportsFileSystemAccess()) return;
  if (dataFileSavePromise) {
    dataFileSaveQueued = true;
    return;
  }

  dataFileSavePromise = autosaveDataFile()
    .catch((error) => {
      console.warn("Could not autosave HireLevel data file", error);
      renderDataFileSettings(`Data file needs permission before autosave can continue: ${dataFileHandle.name}.`);
    })
    .finally(() => {
      dataFileSavePromise = null;
      if (dataFileSaveQueued) {
        dataFileSaveQueued = false;
        queueDataFileSave();
      }
    });
}

async function autosaveDataFile() {
  const hasPermission = await verifyFilePermission(dataFileHandle, false);
  if (!hasPermission) {
    renderDataFileSettings(`Data file remembered: ${dataFileHandle.name}. Click Save Now to restore permission.`);
    return;
  }
  await writeStateToDataFile(dataFileHandle);
  const status = document.querySelector("#storageStatus");
  if (status) status.textContent = `Saved to data file at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

async function readStateFromDataFile(handle) {
  const file = await handle.getFile();
  const text = (await file.text()).trim();
  if (!text) return null;
  return migrateState(JSON.parse(text));
}

async function writeStateToDataFile(handle) {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(state, null, 2));
  await writable.close();
}

async function verifyFilePermission(handle, shouldPrompt) {
  const options = { mode: "readwrite" };
  if ((await handle.queryPermission(options)) === "granted") return true;
  if (!shouldPrompt) return false;
  return (await handle.requestPermission(options)) === "granted";
}

function openDataFileDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATA_FILE_DB_NAME, 1);
    request.addEventListener("upgradeneeded", () => {
      request.result.createObjectStore(DATA_FILE_STORE_NAME);
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function getStoredDataFileHandle() {
  const db = await openDataFileDb();
  return readFromStore(db, DATA_FILE_HANDLE_KEY);
}

async function saveStoredDataFileHandle(handle) {
  const db = await openDataFileDb();
  await writeToStore(db, DATA_FILE_HANDLE_KEY, handle);
}

function readFromStore(db, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DATA_FILE_STORE_NAME, "readonly");
    const request = transaction.objectStore(DATA_FILE_STORE_NAME).get(key);
    request.addEventListener("success", () => resolve(request.result || null));
    request.addEventListener("error", () => reject(request.error));
  });
}

function writeToStore(db, key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DATA_FILE_STORE_NAME, "readwrite");
    transaction.objectStore(DATA_FILE_STORE_NAME).put(value, key);
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("error", () => reject(transaction.error));
  });
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
  ensureJobCollections(job);
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  const summary = card.querySelector(".card-summary");
  const details = card.querySelector(".card-details");
  const icon = card.querySelector(".company-icon");
  const faviconUrl = getCompanyIconUrl(job);

  card.dataset.jobId = job.id;
  card.dataset.rarity = job.status;
  card.querySelector(".card-title").textContent = job.title;
  card.querySelector(".card-company").textContent = job.company;
  card.querySelector(".card-date").textContent = `Applied ${formatDate(job.dateApplied)}`;
  card.querySelector(".job-description").textContent = job.description || "No description saved yet.";
  card.querySelector(".detail-company").textContent = job.company;
  card.querySelector(".detail-date").textContent = formatDate(job.dateApplied);
  card.querySelector(".job-link").href = job.url || "#";
  card.querySelector(".job-link").toggleAttribute("hidden", !job.url);
  card.querySelector(".notes-input").value = job.notes || "";
  renderContactLog(card.querySelector(".contact-list"), job.contacts);
  renderTimeline(card.querySelector(".timeline-list"), job.timeline);

  renderCompanyIcon(icon, job.company, faviconUrl);

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
  card.querySelector(".contact-form [name='date']").value = new Date().toISOString().slice(0, 10);
  card.querySelector(".contact-form").addEventListener("submit", (event) => {
    event.preventDefault();
    addContactLogEntry(job.id, new FormData(event.currentTarget));
  });
  card.querySelectorAll(".delete-contact").forEach((button) => {
    button.addEventListener("click", () => deleteContactLogEntry(job.id, button.dataset.contactId));
  });

  const statusSelect = card.querySelector(".status-select");
  populateStatusSelect(statusSelect, job.status);
  statusSelect.addEventListener("change", (event) => moveJob(job.id, event.target.value));
  return card;
}

function renderContactLog(list, contacts) {
  list.innerHTML = "";
  if (!contacts.length) {
    const empty = document.createElement("p");
    empty.className = "empty-detail";
    empty.textContent = "No contacts logged yet.";
    list.appendChild(empty);
    return;
  }

  contacts
    .slice()
    .sort((first, second) => second.date.localeCompare(first.date))
    .forEach((contact) => {
      const item = document.createElement("article");
      item.className = "contact-entry";

      const header = document.createElement("div");
      const name = document.createElement("strong");
      const meta = document.createElement("span");
      const deleteButton = document.createElement("button");

      name.textContent = contact.name || "Contact";
      meta.textContent = [contact.role, contact.channel, formatDate(contact.date)].filter(Boolean).join(" - ");
      deleteButton.className = "text-danger delete-contact";
      deleteButton.type = "button";
      deleteButton.dataset.contactId = contact.id;
      deleteButton.textContent = "Remove";

      header.append(name, deleteButton);
      item.append(header, meta);
      if (contact.notes) {
        const notes = document.createElement("p");
        notes.textContent = contact.notes;
        item.appendChild(notes);
      }
      list.appendChild(item);
    });
}

function renderTimeline(list, timeline) {
  list.innerHTML = "";
  if (!timeline.length) {
    const empty = document.createElement("p");
    empty.className = "empty-detail";
    empty.textContent = "No timeline activity yet.";
    list.appendChild(empty);
    return;
  }

  timeline
    .slice()
    .sort((first, second) => second.at.localeCompare(first.at))
    .forEach((event) => {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      const meta = document.createElement("span");
      title.textContent = event.title;
      meta.textContent = [formatDateTime(event.at), event.details].filter(Boolean).join(" - ");
      item.append(title, meta);
      list.appendChild(item);
    });
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

function changeBoardSkin(event) {
  state.settings.boardSkin = event.target.value;
  if (state.settings.boardSkin !== "forest") recordAppEvent("board-skin-changed");
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
    "This removes all XP earned across every board. Achievements will remain unlocked. Jobs, boards, and columns will remain.",
    () => {
      state.xpEvents = [];
      achievementPopupQueue = [];
      currentAchievementPopupId = null;
      if (achievementDialog.open) achievementDialog.close();
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
    requestRemoteLogoCache();
    return;
  }
  if (event.data?.type === "CACHED_LOGOS") {
    applyCachedLogos(event.data.logos);
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
  const captureId = cleanText(rawJob?.captureId);
  if (!job) return { action: "skipped", captureId, reason: "missing-title-or-company", title: rawJob?.title || "", company: rawJob?.company || "" };

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
      companyLogoUrl: job.companyLogoUrl || existing.companyLogoUrl || "",
      companyLogoDataUrl: job.companyLogoDataUrl || existing.companyLogoDataUrl || "",
      timeline: normalizeTimeline(existing.timeline),
      contacts: normalizeContacts(existing.contacts),
      id: existing.id,
      status: existing.status,
    };
    board.jobs = board.jobs.map((item) => (item.id === existing.id ? mergedJob : item));
    const earnedXp = awardXpForColumn(board.id, existing.id, existing.status || "applied");
    if (earnedXp > 0) showXpToast(existing, earnedXp);
    return { action: "existing", captureId, boardId: board.id, jobId: existing.id, identity: jobIdentity, title: job.title, company: job.company };
  } else {
    board.jobs.push(job);
    const earnedXp = awardXpForColumn(board.id, job.id, job.status);
    if (earnedXp > 0) showXpToast(job, earnedXp);
    return { action: "added", captureId, boardId: board.id, jobId: job.id, identity: jobIdentity, title: job.title, company: job.company };
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
  const companyLogoDataUrl = normalizeImageDataUrl(rawJob?.companyLogoDataUrl);
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
    companyLogoDataUrl,
    dateApplied: new Date().toISOString().slice(0, 10),
    status,
    notes: "Captured from browser extension.",
    timeline: [
      createTimelineEvent(
        "created",
        `Captured to ${status === "saved" ? "Saved" : "Applied"}`,
        source ? `Captured from ${source}.` : "Captured from browser extension."
      ),
    ],
    contacts: [],
  };
}

function normalizeInitialCaptureStatus(status) {
  return status === "saved" ? "saved" : "applied";
}

function requestRemoteLogoCache() {
  if (logoCacheRequestSent) return;
  const logos = state.boards.flatMap((board) =>
    board.jobs
      .map((job) => ({
        job,
        url: job.companyLogoUrl || (!isLinkedInUrl(job.url) ? getFaviconUrl(job.url) : ""),
      }))
      .filter(({ job, url }) => !normalizeImageDataUrl(job.companyLogoDataUrl) && /^https?:\/\//i.test(url))
      .map(({ job, url }) => ({ jobId: job.id, url }))
  );
  if (!logos.length) return;
  logoCacheRequestSent = true;
  window.postMessage({ source: "hirelevel-app", type: "CACHE_LOGOS", logos }, "*");
}

function applyCachedLogos(logos) {
  const byJobId = new Map(
    (Array.isArray(logos) ? logos : [])
      .map((item) => [cleanText(item?.jobId), normalizeImageDataUrl(item?.dataUrl)])
      .filter(([jobId, dataUrl]) => jobId && dataUrl)
  );
  if (!byJobId.size) return;
  let changed = false;
  state.boards.forEach((board) => {
    board.jobs.forEach((job) => {
      const dataUrl = byJobId.get(job.id);
      if (!dataUrl || job.companyLogoDataUrl === dataUrl) return;
      job.companyLogoDataUrl = dataUrl;
      changed = true;
    });
  });
  if (!changed) return;
  saveState();
  renderApp();
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
  const visible = extractVisibleJobMetadata(doc, url);
  const fallbackTitle = cleanJobTitle(getMeta(doc, "og:title") || doc.querySelector("title")?.textContent || titleFromUrl(url));
  return {
    title: cleanText(jsonLd?.title || visible.title || fallbackTitle),
    company: cleanText(jsonLd?.hiringOrganization?.name || visible.company || getMeta(doc, "og:site_name") || companyFromUrl(url)),
    description: cleanText(stripHtml(jsonLd?.description || "") || visible.description || getMeta(doc, "description") || getMeta(doc, "og:description") || ""),
  };
}

function extractVisibleJobMetadata(doc, url) {
  const title = cleanJobTitle(
    getFirstUsefulText(doc, ["main h1", "article h1", "h1", "[class*='job'] h1", "[class*='position'] h1"]) || titleFromUrl(url)
  );
  const description = extractDescriptionFromDocument(doc);
  return {
    title,
    company: companyFromUrl(url),
    description,
  };
}

function getFirstUsefulText(doc, selectors) {
  for (const selector of selectors) {
    const text = [...doc.querySelectorAll(selector)].map((node) => cleanText(node.textContent)).find((item) => item && isLikelyHeadingLine(item));
    if (text) return text;
  }
  return "";
}

function extractDescriptionFromDocument(doc) {
  const heading = findSectionHeading(doc, [
    "About The Position",
    "About the position",
    "About the job",
    "Job description",
    "Responsibilities",
    "Requirements",
    "What you'll do",
    "What you will do",
  ]);

  if (heading) {
    const lines = [];
    let node = heading.nextElementSibling;
    while (node && lines.length < 80) {
      const headingTag = /^H[1-4]$/i.test(node.tagName);
      const text = cleanText(node.textContent);
      if (headingTag && lines.length && !isContinuationDescriptionHeading(text)) break;
      if (text && isLikelyDescriptionLine(text)) lines.push(text);
      node = node.nextElementSibling;
    }

    const siblingDescription = lines.join("\n");
    if (siblingDescription.length > 80) return siblingDescription;
  }

  return extractDescriptionFromTextFlow(doc);
}

function extractDescriptionFromTextFlow(doc) {
  const root = doc.querySelector("main, article, [role='main'], [class*='job'], [class*='position']") || doc.body;
  if (!root) return "";

  const nodes = [...root.querySelectorAll("h1, h2, h3, h4, p, li")];
  const lines = nodes.map((node) => cleanText(node.textContent)).filter(Boolean);
  const startIndex = findMarkerIndex(lines, [
    "About The Position",
    "About the position",
    "About the job",
    "Job description",
    "Responsibilities",
    "Requirements",
    "What you'll do",
    "What you will do",
  ]);
  if (startIndex < 0) return "";

  const descriptionLines = [];
  for (const line of lines.slice(startIndex + 1)) {
    if (isDescriptionEndLine(line)) break;
    if (isLikelyDescriptionLine(line)) descriptionLines.push(line);
    if (descriptionLines.length >= 100) break;
  }

  return descriptionLines.join("\n");
}

function findSectionHeading(doc, labels) {
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  return [...doc.querySelectorAll("h1, h2, h3, h4, strong, b")]
    .find((node) => normalizedLabels.includes(cleanText(node.textContent).toLowerCase()));
}

function isContinuationDescriptionHeading(text) {
  return ["requirements", "responsibilities", "what you'll do", "what you will do"].includes(cleanText(text).toLowerCase());
}

function isDescriptionEndLine(line) {
  const lower = cleanText(line).toLowerCase();
  return (
    lower === "apply for this position" ||
    lower === "apply now" ||
    lower === "submit application" ||
    lower === "first name*" ||
    lower === "last name*" ||
    lower === "email*" ||
    lower === "privacy policy" ||
    lower.startsWith("linkedin") ||
    lower.startsWith("twitter") ||
    lower.startsWith("facebook") ||
    lower.startsWith("newsletter") ||
    lower.includes("all rights reserved")
  );
}

function moveJob(jobId, status, beforeJobId = null) {
  if (!jobId) return;
  const board = getActiveBoard();
  const jobIndex = board.jobs.findIndex((item) => item.id === jobId);
  if (jobIndex < 0 || jobId === beforeJobId) return;

  const [job] = board.jobs.splice(jobIndex, 1);
  const previousStatus = job.status;
  const movedJob = { ...job, status };
  ensureJobCollections(movedJob);
  if (previousStatus !== status) {
    addJobTimelineEventToJob(movedJob, "status", `Moved to ${getColumnName(board, status)}`, `From ${getColumnName(board, previousStatus)}.`);
  }
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
  board.jobs = board.jobs.map((job) => {
    if (job.id !== jobId) return job;
    const updatedJob = { ...job, ...patch };
    ensureJobCollections(updatedJob);
    if (Object.prototype.hasOwnProperty.call(patch, "notes")) {
      addJobTimelineEventToJob(updatedJob, "note", "Notes updated");
    }
    return updatedJob;
  });
  saveState();
}

function addContactLogEntry(jobId, formData) {
  const board = getActiveBoard();
  const job = board.jobs.find((item) => item.id === jobId);
  if (!job) return;
  ensureJobCollections(job);

  const contact = {
    id: createId(),
    name: cleanText(formData.get("name")),
    role: cleanText(formData.get("role")),
    channel: cleanText(formData.get("channel")) || "Other",
    date: formData.get("date") || new Date().toISOString().slice(0, 10),
    notes: cleanText(formData.get("notes")),
  };
  if (!contact.name) return;

  job.contacts.push(contact);
  addJobTimelineEventToJob(job, "contact", `Contact logged: ${contact.name}`, [contact.channel, contact.role].filter(Boolean).join(" - "));
  saveState();
  renderApp();
}

function deleteContactLogEntry(jobId, contactId) {
  const board = getActiveBoard();
  const job = board.jobs.find((item) => item.id === jobId);
  if (!job) return;
  ensureJobCollections(job);
  const contact = job.contacts.find((item) => item.id === contactId);
  if (!contact) return;
  job.contacts = job.contacts.filter((item) => item.id !== contactId);
  addJobTimelineEventToJob(job, "contact", `Contact removed: ${contact.name}`);
  saveState();
  renderApp();
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
  const previousLevel = calculateLevel(calculateVisibleXp()).level;
  state.xpEvents.push(createXpEvent(boardId, jobId, columnId, xp));
  addJobTimelineEvent(board, jobId, "xp", `Earned ${formatNumber(xp)} XP`, getColumnName(board, columnId));
  const nextLevel = calculateLevel(calculateVisibleXp()).level;
  if (nextLevel > previousLevel) showLevelUpConfetti(nextLevel - previousLevel);
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

function showLevelUpConfetti(levelsGained) {
  const strength = Math.min(1600, Math.max(60, levelsGained * 60));
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  layer.setAttribute("aria-hidden", "true");

  const colors = ["#2f9b61", "#8fcea3", "#ffd166", "#ef476f", "#348ac7", "#7b68c7"];
  for (let index = 0; index < strength; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--x", `${Math.random() * 100}vw`);
    piece.style.setProperty("--delay", `${Math.random() * 0.55}s`);
    piece.style.setProperty("--duration", `${1.8 + Math.random() * 1.4}s`);
    piece.style.setProperty("--drift", `${Math.random() * 220 - 110}px`);
    piece.style.setProperty("--spin", `${Math.random() * 720 - 360}deg`);
    piece.style.background = colors[index % colors.length];
    layer.appendChild(piece);
  }

  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 3800);
}

function normalizeAchievements(achievements) {
  return Array.isArray(achievements)
    ? achievements
        .filter((achievement) => achievement && achievement.id)
        .map((achievement) => ({
          id: cleanText(achievement.id),
          unlockedAt: achievement.unlockedAt || new Date().toISOString(),
          seenAt: achievement.seenAt || "",
        }))
    : [];
}

function normalizeAppEvents(appEvents) {
  return Array.isArray(appEvents)
    ? appEvents
        .filter((event) => event && event.type)
        .map((event) => ({
          id: event.id || createId(),
          type: cleanText(event.type),
          at: event.at || new Date().toISOString(),
        }))
    : [];
}

function recordAppEvent(type) {
  state.appEvents = normalizeAppEvents(state.appEvents);
  if (state.appEvents.some((event) => event.type === type)) return;
  state.appEvents.push({ id: createId(), type, at: new Date().toISOString() });
}

function evaluateAchievements() {
  if (isEvaluatingAchievements) return 0;
  isEvaluatingAchievements = true;
  let unlockedCount = 0;

  for (let pass = 0; pass < 5; pass += 1) {
    let unlockedThisPass = 0;
    const unlocked = getUnlockedAchievementMap();
    const stats = getAchievementStats();

    achievementDefinitions.forEach((achievement) => {
      if (unlocked.has(achievement.id) || !achievement.condition(stats)) return;
      unlockAchievement(achievement);
      unlockedThisPass += 1;
    });

    unlockedCount += unlockedThisPass;
    if (!unlockedThisPass) break;
  }

  isEvaluatingAchievements = false;
  return unlockedCount;
}

function unlockAchievement(achievement) {
  state.achievements = normalizeAchievements(state.achievements);
  const unlockedAt = new Date().toISOString();
  state.achievements.push({ id: achievement.id, unlockedAt, seenAt: "" });
  if (!hasAchievementXpEvent(achievement.id)) {
    state.xpEvents.push(createAchievementXpEvent(achievement.id, getAchievementXpReward(achievement), unlockedAt));
  }
  queueAchievementPopup(achievement.id);
}

function queueUnseenAchievements() {
  normalizeAchievements(state.achievements).forEach((achievement) => {
    if (!achievement.seenAt) queueAchievementPopup(achievement.id);
  });
}

function queueAchievementPopup(achievementId) {
  if (!achievementDefinitions.some((achievement) => achievement.id === achievementId)) return;
  if (currentAchievementPopupId === achievementId || achievementPopupQueue.includes(achievementId)) return;
  achievementPopupQueue.push(achievementId);
}

function showNextAchievementPopup() {
  if (!achievementDialog || achievementDialog.open || !achievementPopupQueue.length) return;
  const openDialog = document.querySelector("dialog[open]");
  if (openDialog && openDialog !== achievementDialog) {
    window.setTimeout(showNextAchievementPopup, 250);
    return;
  }
  currentAchievementPopupId = achievementPopupQueue[0];
  const achievement = getAchievementDefinition(currentAchievementPopupId);
  if (!achievement) {
    achievementPopupQueue.shift();
    currentAchievementPopupId = null;
    showNextAchievementPopup();
    return;
  }

  document.querySelector("#achievementQueueCount").textContent =
    achievementPopupQueue.length > 1 ? `Achievement unlocked 1 / ${achievementPopupQueue.length}` : "Achievement unlocked";
  document.querySelector("#achievementPopupIcon").src = achievement.icon;
  document.querySelector("#achievementPopupName").textContent = achievement.name;
  document.querySelector("#achievementPopupDescription").textContent = achievement.description;
  document.querySelector("#achievementPopupXp").textContent = `+${formatAchievementXp(achievement)}`;
  achievementDialog.showModal();
}

function confirmCurrentAchievement() {
  if (!currentAchievementPopupId) return;
  markAchievementSeen(currentAchievementPopupId);
  achievementPopupQueue.shift();
  currentAchievementPopupId = null;
  achievementDialog.close();
  saveState();
  renderApp();
  showNextAchievementPopup();
}

function skipAchievementQueue() {
  const seenAt = new Date().toISOString();
  const queuedIds = new Set(achievementPopupQueue);
  state.achievements = normalizeAchievements(state.achievements).map((achievement) =>
    queuedIds.has(achievement.id) ? { ...achievement, seenAt: achievement.seenAt || seenAt } : achievement
  );
  achievementPopupQueue = [];
  currentAchievementPopupId = null;
  achievementDialog.close();
  saveState();
  renderApp();
}

function markAchievementSeen(achievementId) {
  const seenAt = new Date().toISOString();
  state.achievements = normalizeAchievements(state.achievements).map((achievement) =>
    achievement.id === achievementId ? { ...achievement, seenAt: achievement.seenAt || seenAt } : achievement
  );
}

function getUnlockedAchievementMap() {
  return new Map(normalizeAchievements(state.achievements).map((achievement) => [achievement.id, achievement]));
}

function getAchievementDefinition(achievementId) {
  return achievementDefinitions.find((achievement) => achievement.id === achievementId);
}

function getAchievementXpReward(achievement) {
  return achievement.xpReward === "max-level" ? getMaxLevelTotalXp() : achievement.xpReward;
}

function formatAchievementXp(achievement) {
  return achievement.hiddenXpReward ? "??? XP" : `${formatNumber(getAchievementXpReward(achievement))} XP`;
}

function hasAchievementXpEvent(achievementId) {
  return state.xpEvents.some((event) => event.source === "achievement" && event.achievementId === achievementId);
}

function createAchievementXpEvent(achievementId, xp, earnedAt = new Date().toISOString()) {
  return { id: createId(), source: "achievement", achievementId, xp, earnedAt };
}

function getAchievementStats() {
  const allJobs = state.boards.flatMap((board) => board.jobs.map((job) => ensureJobCollections(job)));
  const statusCounts = {};
  const columnXpEvents = {};
  const appEvents = new Set(normalizeAppEvents(state.appEvents).map((event) => event.type));

  defaultColumns.forEach((column) => {
    statusCounts[column.id] = 0;
    columnXpEvents[column.id] = 0;
  });

  allJobs.forEach((job) => {
    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
  });

  state.xpEvents.forEach((event) => {
    if (!event.columnId) return;
    columnXpEvents[event.columnId] = (columnXpEvents[event.columnId] || 0) + 1;
  });

  return {
    totalJobs: allJobs.length,
    boardCount: state.boards.length,
    customColumnCount: state.boards.reduce((total, board) => total + getCustomColumns(board).length, 0),
    hasChangedBoardSkin: state.settings.boardSkin !== "forest" || appEvents.has("board-skin-changed"),
    appEvents,
    statusCounts,
    columnXpEvents,
    contactCount: allJobs.reduce((total, job) => total + job.contacts.length, 0),
    timelineEventCount: allJobs.reduce((total, job) => total + job.timeline.length, 0),
    accountLevel: calculateLevel(calculateAccountXp()).level,
  };
}

function ensureJobCollections(job) {
  job.timeline = normalizeTimeline(job.timeline);
  job.contacts = normalizeContacts(job.contacts);
  return job;
}

function normalizeTimeline(timeline) {
  return Array.isArray(timeline)
    ? timeline
        .filter((event) => event && event.title)
        .map((event) => ({
          id: event.id || createId(),
          type: cleanText(event.type) || "note",
          title: cleanText(event.title),
          details: cleanText(event.details),
          at: event.at || new Date().toISOString(),
        }))
    : [];
}

function normalizeContacts(contacts) {
  return Array.isArray(contacts)
    ? contacts
        .filter((contact) => contact && contact.name)
        .map((contact) => ({
          id: contact.id || createId(),
          name: cleanText(contact.name),
          role: cleanText(contact.role),
          channel: cleanText(contact.channel) || "Other",
          date: contact.date || new Date().toISOString().slice(0, 10),
          notes: cleanText(contact.notes),
        }))
    : [];
}

function createTimelineEvent(type, title, details = "") {
  return { id: createId(), type, title, details, at: new Date().toISOString() };
}

function addJobTimelineEvent(board, jobId, type, title, details = "") {
  const job = board.jobs.find((item) => item.id === jobId);
  if (!job) return;
  addJobTimelineEventToJob(job, type, title, details);
}

function addJobTimelineEventToJob(job, type, title, details = "") {
  ensureJobCollections(job);
  job.timeline.push(createTimelineEvent(type, title, details));
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
  return calculateAccountXp();
}

function calculateAccountXp() {
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

function getMaxLevelTotalXp() {
  let total = 0;
  for (let level = 1; level < maxLevel; level += 1) {
    total += getLevelRequirement(level);
  }
  return total;
}

function exportState() {
  recordAppEvent("json-exported");
  saveState();
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
    queueUnseenAchievements();
    evaluateAchievements();
    saveState();
    renderApp();
    showNextAchievementPopup();
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
      boards: state.boards.map((board) => ({
        id: board.id,
        name: board.name,
        jobIdentities: board.jobs.map((job) => getJobIdentity(job)).filter(Boolean),
      })),
      activeBoardId: state.activeBoardId,
      theme: getExtensionTheme(),
    },
    "*"
  );
}

function getDefaultSettings() {
  return { xpMode: "global", themeMode: "light", colorScheme: "green", boardSkin: "forest" };
}

function normalizeSettings(settings = {}) {
  const defaults = getDefaultSettings();
  return {
    xpMode: ["global", "per-board"].includes(settings.xpMode) ? settings.xpMode : defaults.xpMode,
    themeMode: ["light", "dark"].includes(settings.themeMode) ? settings.themeMode : defaults.themeMode,
    colorScheme: ["green", "mint", "sky", "lavender", "rose"].includes(settings.colorScheme) ? settings.colorScheme : defaults.colorScheme,
    boardSkin: ["forest", "terminal", "guild-hall", "space-station", "cozy-desk"].includes(settings.boardSkin)
      ? settings.boardSkin
      : defaults.boardSkin,
  };
}

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.themeMode;
  document.documentElement.dataset.colorScheme = state.settings.colorScheme;
  document.documentElement.dataset.boardSkin = state.settings.boardSkin;
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

function getColumnName(board, columnId) {
  return board.columns.find((column) => column.id === columnId)?.name || columnId || "Unknown";
}

function matchesQuery(job, query) {
  if (!query) return true;
  return [
    job.title,
    job.company,
    job.description,
    job.notes,
    ...(Array.isArray(job.contacts) ? job.contacts.flatMap((contact) => [contact.name, contact.role, contact.channel, contact.notes]) : []),
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
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

function cleanJobTitle(text) {
  return cleanText(text)
    .replace(/^job\s+opportunity:\s*/i, "")
    .replace(/\s+[-|]\s+(careers|jobs|job opportunity).*$/i, "")
    .trim();
}

function cleanCompanyLine(line) {
  return cleanText(line.split(" · ")[0].split(" | ")[0]);
}

function formatDate(date) {
  if (!date) return "No date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function formatDateTime(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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
    const ignoredSegments = new Set(["all", "apply", "jobs", "job", "careers", "career", "co", "remote", "position", "positions", "openings"]);
    const segments = new URL(url).pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment).replace(/\.(html|php|aspx)$/i, ""))
      .filter((segment) => segment && !ignoredSegments.has(segment.toLowerCase()) && !/^[A-Z]{1,4}\.\d+$/i.test(segment));
    const best = [...segments].reverse().find((segment) => /[-_+]/.test(segment)) || segments.at(-1) || "";
    return titleCase(best.replace(/[-_+]/g, " "));
  } catch {
    return "";
  }
}

function titleCase(text) {
  const specialWords = new Map([
    ["ai", "AI"],
    ["api", "API"],
    ["qa", "QA"],
    ["ui", "UI"],
    ["ux", "UX"],
    ["liveops", "LiveOps"],
  ]);
  return cleanText(text)
    .split(" ")
    .filter(Boolean)
    .map((word) => specialWords.get(word.toLowerCase()) || word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
  if (normalizeImageDataUrl(job.companyLogoDataUrl)) return job.companyLogoDataUrl;
  if (job.companyLogoUrl) return job.companyLogoUrl;
  if (isLinkedInUrl(job.url)) return "";
  return getFaviconUrl(job.url);
}

function renderCompanyIcon(container, company, imageUrl) {
  const fallback = initials(company);
  container.replaceChildren();
  container.style.backgroundImage = "";
  container.textContent = fallback;
  if (!imageUrl) return;

  const image = document.createElement("img");
  image.alt = "";
  image.decoding = "async";
  image.addEventListener("load", () => {
    container.textContent = "";
    container.replaceChildren(image);
  });
  image.addEventListener("error", () => {
    image.remove();
    container.textContent = fallback;
  });
  image.src = imageUrl;
}

function normalizeImageDataUrl(value) {
  const dataUrl = cleanText(value);
  return /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(dataUrl) ? dataUrl : "";
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
