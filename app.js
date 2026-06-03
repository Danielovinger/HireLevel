const STORAGE_KEY = "hirelevel-state-v1";
const LEGACY_STORAGE_KEY = "open-job-tracker-state-v1";

const defaultColumns = [
  { id: "saved", name: "Saved" },
  { id: "applied", name: "Applied" },
  { id: "received-answer", name: "First Positive Answer" },
  { id: "interviewing", name: "Interviewing" },
  { id: "offer", name: "Offer" },
  { id: "rejected", name: "Rejected / Withdrawn" },
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

const sampleJobs = [
  {
    id: createId(),
    title: "Product Support Engineer",
    company: "Example Systems",
    url: "https://example.com/jobs/product-support-engineer",
    description: "A sample card to show how expanded job details look. Delete it when you add your first real application.",
    dateApplied: new Date().toISOString().slice(0, 10),
    status: "applied",
    notes: "",
  },
];

let state = loadState();
let editingJobId = null;
let draggedJobId = null;

const board = document.querySelector("#board");
const columnTemplate = document.querySelector("#columnTemplate");
const cardTemplate = document.querySelector("#cardTemplate");
const jobDialog = document.querySelector("#jobDialog");
const columnDialog = document.querySelector("#columnDialog");
const jobForm = document.querySelector("#jobForm");
const columnForm = document.querySelector("#columnForm");
const searchInput = document.querySelector("#searchInput");
const fetchMessage = document.querySelector("#fetchMessage");

document.querySelector("#addJobBtn").addEventListener("click", () => openJobDialog());
document.querySelector("#addColumnBtn").addEventListener("click", () => openColumnDialog());
document.querySelector("#exportBtn").addEventListener("click", exportState);
document.querySelector("#importInput").addEventListener("change", importState);
document.querySelector("#fetchJobBtn").addEventListener("click", fetchJobDetails);
document.querySelector("#parsePastedTextBtn").addEventListener("click", parsePastedText);
searchInput.addEventListener("input", renderBoard);

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

window.addEventListener("message", handleExtensionMessage);

jobForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(jobForm);
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
    state.jobs = state.jobs.map((existing) => (existing.id === editingJobId ? job : existing));
  } else {
    state.jobs.push(job);
  }

  saveState();
  jobDialog.close();
  renderBoard();
});

columnForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#columnName").value.trim();
  if (!name) return;

  state.columns.push({
    id: slugify(name, true),
    name,
  });
  saveState();
  columnDialog.close();
  renderBoard();
});

renderBoard();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!saved) {
    return { columns: defaultColumns, jobs: sampleJobs };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      columns: normalizeColumns(parsed.columns),
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    };
  } catch {
    return { columns: defaultColumns, jobs: sampleJobs };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const status = document.querySelector("#storageStatus");
  if (status) status.textContent = `Saved locally at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function renderBoard() {
  board.innerHTML = "";
  const query = searchInput.value.trim().toLowerCase();
  renderLevelPanel();

  state.columns.forEach((column) => {
    const columnElement = columnTemplate.content.firstElementChild.cloneNode(true);
    const cardsElement = columnElement.querySelector(".cards");
    const columnJobs = state.jobs.filter((job) => job.status === column.id && matchesQuery(job, query));

    columnElement.dataset.columnId = column.id;
    columnElement.querySelector("h2").textContent = column.name;
    columnElement.querySelector(".count").textContent = `${columnJobs.length} ${columnJobs.length === 1 ? "Job" : "Jobs"}`;

    const deleteColumnButton = columnElement.querySelector(".column-menu");
    deleteColumnButton.hidden = isDefaultColumn(column.id);
    deleteColumnButton.addEventListener("click", () => deleteColumn(column.id));

    cardsElement.addEventListener("dragover", (event) => {
      event.preventDefault();
      columnElement.classList.add("drag-over");
    });
    cardsElement.addEventListener("dragleave", () => columnElement.classList.remove("drag-over"));
    cardsElement.addEventListener("drop", () => {
      columnElement.classList.remove("drag-over");
      moveJob(draggedJobId, column.id);
    });

    columnJobs.forEach((job) => cardsElement.appendChild(renderCard(job)));
    board.appendChild(columnElement);
  });
}

function handleExtensionMessage(event) {
  if (event.source !== window) return;
  if (event.data?.source !== "hirelevel-extension") return;
  if (event.data?.type !== "ADD_JOB") return;

  const job = normalizeCapturedJob(event.data.job);
  if (!job) return;

  const existing = state.jobs.find((item) => item.url && item.url === job.url);
  if (existing) {
    state.jobs = state.jobs.map((item) => (item.id === existing.id ? { ...item, ...job, id: item.id } : item));
  } else {
    state.jobs.push(job);
  }

  saveState();
  renderBoard();
}

function normalizeCapturedJob(rawJob) {
  const title = cleanText(rawJob?.title);
  const company = cleanText(rawJob?.company);
  const description = cleanText(rawJob?.description);
  const url = cleanText(rawJob?.url);

  if (!title || !company) return null;

  return {
    id: createId(),
    title,
    company,
    description,
    url,
    dateApplied: new Date().toISOString().slice(0, 10),
    status: "applied",
    notes: "Captured from browser extension.",
  };
}

function renderLevelPanel() {
  const total = calculateTotalXp();
  const levelState = calculateLevel(total);

  document.querySelector("#levelText").textContent = `Level ${levelState.level}`;
  document.querySelector("#levelTitle").textContent = getLevelTitle(levelState.level);
  document.querySelector("#xpMeterFill").style.width = `${levelState.percent}%`;
  document.querySelector("#xpProgress").textContent =
    levelState.level === maxLevel
      ? "Max level reached"
      : `${formatNumber(levelState.currentXp)} / ${formatNumber(levelState.requiredXp)} XP`;
  document.querySelector("#totalXp").textContent = `${formatNumber(total)} total XP`;
}

function renderCard(job) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  const summary = card.querySelector(".card-summary");
  const details = card.querySelector(".card-details");
  const icon = card.querySelector(".company-icon");
  const faviconUrl = getFaviconUrl(job.url);

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
  });

  card.querySelector(".notes-input").addEventListener("change", (event) => {
    updateJob(job.id, { notes: event.target.value });
  });
  card.querySelector(".delete-job").addEventListener("click", () => deleteJob(job.id));
  card.querySelector(".edit-job").addEventListener("click", () => openJobDialog(job));

  const statusSelect = card.querySelector(".status-select");
  populateStatusSelect(statusSelect, job.status);
  statusSelect.addEventListener("change", (event) => moveJob(job.id, event.target.value));

  return card;
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
  columnForm.reset();
  columnDialog.showModal();
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
    fetchMessage.textContent = "The page blocked local reading. For LinkedIn, copy the visible job panel text, paste it below, and use Parse Pasted Text.";
  }
}

function parsePastedText() {
  const text = document.querySelector("#jobPageText").value;
  const parsed = parseJobPageText(text);

  if (!parsed.title && !parsed.company && !parsed.description) {
    fetchMessage.textContent = "I could not find job details in that pasted text. Try copying only the job details panel.";
    return;
  }

  const titleInput = document.querySelector("#jobTitle");
  const companyInput = document.querySelector("#jobCompany");
  const descriptionInput = document.querySelector("#jobDescription");

  titleInput.value = parsed.title || titleInput.value;
  companyInput.value = parsed.company || companyInput.value;
  descriptionInput.value = parsed.description || descriptionInput.value;
  fetchMessage.textContent = "Pasted text parsed. Review the fields before saving.";
}

function parseJobPageText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  if (!lines.length) return {};

  const uniqueLines = [];
  lines.forEach((line) => {
    if (uniqueLines[uniqueLines.length - 1] !== line) uniqueLines.push(line);
  });

  const descriptionStart = findMarkerIndex(uniqueLines, [
    "About the job",
    "Job description",
    "About this job",
    "Responsibilities",
    "What you'll do",
    "What you will do",
  ]);

  const headingLines = descriptionStart >= 0 ? uniqueLines.slice(0, descriptionStart) : uniqueLines;
  const usefulHeadingLines = headingLines.filter(isLikelyHeadingLine);
  const title = usefulHeadingLines[0] || "";
  const company = cleanCompanyLine(usefulHeadingLines[1] || "");
  const description =
    descriptionStart >= 0
      ? uniqueLines
          .slice(descriptionStart + 1)
          .filter(isLikelyDescriptionLine)
          .join("\n")
      : "";

  return {
    title,
    company,
    description,
  };
}

function findMarkerIndex(lines, markers) {
  return lines.findIndex((line) => markers.some((marker) => line.toLowerCase() === marker.toLowerCase()));
}

function isLikelyHeadingLine(line) {
  const lower = line.toLowerCase();
  const exactNoise = new Set([
    "linkedin",
    "home",
    "jobs",
    "messaging",
    "notifications",
    "me",
    "search",
    "save",
    "apply",
    "easy apply",
    "show more",
    "show less",
    "share",
    "report this job",
  ]);

  if (exactNoise.has(lower)) return false;
  if (lower.includes("applicants")) return false;
  if (lower.includes("posted")) return false;
  if (lower.includes("connections")) return false;
  if (lower.includes("promoted")) return false;
  if (lower.includes("see who")) return false;
  if (/^\d/.test(line)) return false;
  return line.length <= 120;
}

function isLikelyDescriptionLine(line) {
  const lower = line.toLowerCase();
  if (["show more", "show less", "apply", "easy apply", "save"].includes(lower)) return false;
  if (lower.startsWith("similar jobs")) return false;
  if (lower.startsWith("people also viewed")) return false;
  return true;
}

function cleanCompanyLine(line) {
  return cleanText(line.split(" · ")[0].split(" | ")[0]);
}

function extractJobMetadata(doc, url) {
  const jsonLd = [...doc.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => safeJson(script.textContent))
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .find((item) => item && (item["@type"] === "JobPosting" || item.title));

  const title = jsonLd?.title || getMeta(doc, "og:title") || doc.querySelector("title")?.textContent || "";
  const company =
    jsonLd?.hiringOrganization?.name ||
    getMeta(doc, "og:site_name") ||
    companyFromUrl(url);
  const description =
    stripHtml(jsonLd?.description || "") ||
    getMeta(doc, "description") ||
    getMeta(doc, "og:description") ||
    "";

  return {
    title: cleanText(title),
    company: cleanText(company),
    description: cleanText(description),
  };
}

function applyUrlHeuristics(url) {
  const titleInput = document.querySelector("#jobTitle");
  const companyInput = document.querySelector("#jobCompany");
  if (!companyInput.value) companyInput.value = companyFromUrl(url);
  if (!titleInput.value) titleInput.value = titleFromUrl(url);
}

function matchesQuery(job, query) {
  if (!query) return true;
  return [job.title, job.company, job.description, job.notes]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function moveJob(jobId, status) {
  if (!jobId) return;
  updateJob(jobId, { status });
  renderBoard();
}

function updateJob(jobId, patch) {
  state.jobs = state.jobs.map((job) => (job.id === jobId ? { ...job, ...patch } : job));
  saveState();
}

function deleteJob(jobId) {
  const job = state.jobs.find((item) => item.id === jobId);
  if (!job) return;
  if (!confirm(`Delete "${job.title}" from the tracker?`)) return;
  state.jobs = state.jobs.filter((item) => item.id !== jobId);
  saveState();
  renderBoard();
}

function deleteColumn(columnId) {
  const hasJobs = state.jobs.some((job) => job.status === columnId);
  if (hasJobs) {
    alert("Move or delete the jobs in this column before removing it.");
    return;
  }
  state.columns = state.columns.filter((column) => column.id !== columnId);
  saveState();
  renderBoard();
}

function populateStatusSelect(select, selected) {
  select.innerHTML = "";
  state.columns.forEach((column) => {
    const option = document.createElement("option");
    option.value = column.id;
    option.textContent = column.name;
    option.selected = column.id === selected;
    select.appendChild(option);
  });
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
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.columns) || !Array.isArray(imported.jobs)) {
      throw new Error("Invalid tracker file");
    }
    state = imported;
    saveState();
    renderBoard();
  } catch {
    alert("That JSON file does not look like a HireLevel export.");
  } finally {
    event.target.value = "";
  }
}

function isDefaultColumn(columnId) {
  return defaultColumns.some((column) => column.id === columnId);
}

function normalizeColumns(columns) {
  const incoming = Array.isArray(columns) && columns.length ? columns : defaultColumns;
  const defaultNames = new Map(defaultColumns.map((column) => [column.id, column.name]));

  return incoming.map((column) => ({
    ...column,
    name: defaultNames.get(column.id) || column.name,
  }));
}

function calculateTotalXp() {
  return state.jobs.reduce((total, job) => total + (statusXp[job.status] || 0), 0);
}

function calculateLevel(totalXp) {
  let level = 1;
  let remainingXp = totalXp;

  while (level < maxLevel) {
    const requiredXp = getLevelRequirement(level);
    if (remainingXp < requiredXp) {
      return {
        level,
        currentXp: remainingXp,
        requiredXp,
        percent: Math.min(100, Math.round((remainingXp / requiredXp) * 100)),
      };
    }
    remainingXp -= requiredXp;
    level += 1;
  }

  return {
    level: maxLevel,
    currentXp: 0,
    requiredXp: 0,
    percent: 100,
  };
}

function getLevelRequirement(level) {
  return 5 + 4 * (level - 1) ** 2;
}

function getLevelTitle(level) {
  if (level >= maxLevel) return "Job Holder";
  const tierIndex = Math.min(titleTiers.length - 1, Math.floor((level - 1) / 10));
  const numeral = romanNumerals[(level - 1) % 10];
  return `${titleTiers[tierIndex]} ${numeral}`;
}

function formatNumber(number) {
  return new Intl.NumberFormat().format(number);
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

function formatDate(date) {
  if (!date) return "No date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
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
  return cleanText(text)
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function slugify(text, ensureUnique = false) {
  const base =
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "column";

  if (!ensureUnique) return base;

  let candidate = base;
  let index = 2;
  while (state.columns.some((column) => column.id === candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function initials(company) {
  return cleanText(company)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "?";
}

function getFaviconUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}/favicon.ico`;
  } catch {
    return "";
  }
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
