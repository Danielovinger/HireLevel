const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { build, conversion } = require("../statistics.js");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const plain = (value) => JSON.parse(JSON.stringify(value));

// Execute the app's real persistence, event producers, and card renderer without
// running app startup, browser-extension messaging, or storage/animation effects.
// Top-level app functions have an unindented closing brace; their full bodies
// are extracted, including their own nested functions and template strings.
function appFunction(name) {
  const match = source.match(new RegExp(`^function ${name}\\([^\\n]*\\)[^\\n]*\\{\\r?\\n[\\s\\S]*?^\\}`, "m"));
  assert.ok(match, `App function ${name} must exist`);
  return match[0];
}

function node() {
  const children = new Map();
  return {
    dataset: {}, children: [], listeners: {}, classList: { add() {}, remove() {} },
    querySelector(selector) {
      if (!children.has(selector)) children.set(selector, node());
      return children.get(selector);
    },
    querySelectorAll() { return []; },
    append(...items) { this.children.push(...items); },
    appendChild(item) { this.children.push(item); },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    toggleAttribute() {}, cloneNode() { return node(); },
  };
}

function appHarness() {
  let nextId = 0;
  const context = vm.createContext({
    console, Intl, Date, URL,
    crypto: { randomUUID: () => `test-id-${++nextId}` },
    document: { createElement: node },
    cardTemplate: { content: { firstElementChild: node() } },
    jobForm: node(), jobDialog: { close() {} }, editingJobId: null,
    FormData: class { get(name) { return context.formValues[name] || ""; } },
    formValues: {},
    state: { activeBoardId: "test-board", boards: [], xpEvents: [], settings: { xpMode: "global" } },
    calculateLevel: () => ({ level: 1 }), calculateVisibleXp: () => 0,
    formatNumber: String, showLevelUpConfetti() {}, showXpToast() {},
    getCompanyIconUrl: () => "", renderCompanyIcon() {},
  });
  const functions = [
    "cleanText", "createId", "normalizeTimeline", "normalizeContacts", "ensureJobCollections",
    "stageEventMetadata", "createTimelineEvent", "addJobTimelineEvent", "addJobTimelineEventToJob",
    "createXpEvent", "getColumnXp", "getColumnName", "awardXpForColumn", "moveJob", "getAppendIndexForStatus",
    "normalizeCapturedJob", "normalizeInitialCaptureStatus", "normalizeCapturedNote", "normalizeImageDataUrl",
    "createBoard", "cloneDefaultColumns", "normalizeColumns", "isDefaultColumn", "getActiveBoard", "ensureActiveBoard",
    "getDefaultSettings", "normalizeSettings", "normalizeAchievements", "normalizeAppEvents", "migrateState",
    "renderCard", "renderContactLog", "renderTimeline", "populateStatusSelect", "formatDate", "formatDateTime",
  ];
  const constants = ["defaultColumns", "statusXp"].map((name) => {
    const match = source.match(new RegExp(`^const ${name} = [\\s\\S]*?^[\\]}];`, "m"));
    assert.ok(match, `App constant ${name} must exist`);
    return match[0];
  });
  const customXp = source.match(/^const CUSTOM_COLUMN_XP = .+;$/m);
  assert.ok(customXp);
  vm.runInContext([...constants, customXp[0], ...functions.map(appFunction), `
    function saveState() { lastSavedState = JSON.stringify(state); }
    function renderApp() { getActiveBoard().jobs.forEach(renderCard); }
    state.boards.push({ id: "test-board", name: "Test board", columns: cloneDefaultColumns(), jobs: [] });
  `].join("\n"), context);
  const submit = source.match(/^jobForm\.addEventListener\("submit",[\s\S]*?^\}\);/m);
  assert.ok(submit, "The real job form submit handler must exist");
  vm.runInContext(submit[0], context);
  context.submitJob = (values) => {
    context.formValues = { title: "Engineer", company: "Acme", dateApplied: "2026-08-01", status: "applied", ...values };
    context.jobForm.listeners.submit({ preventDefault() {} });
    return context.state.boards[0].jobs[0];
  };
  return context;
}

test("normalization and real card rendering retain stage IDs and unknown dates", () => {
  const app = appHarness();
  const timeline = [
    { id: "legacy", type: "status", title: "Moved to Screening", details: "From Applied.", columnId: " custom-screen ", columnName: " Screening ", fromColumnId: " applied ", fromColumnName: " Applied " },
    { id: "bad-date", type: "note", title: "Imported note", at: "not-a-date" },
  ];
  const before = JSON.stringify(timeline);
  const normalized = app.normalizeTimeline(timeline);
  assert.deepEqual(plain(normalized[0]), { id: "legacy", type: "status", title: "Moved to Screening", details: "From Applied.", at: "", columnId: "custom-screen", columnName: "Screening", fromColumnId: "applied", fromColumnName: "Applied" });
  assert.equal(JSON.stringify(timeline), before);
  const job = { id: "job", title: "Engineer", company: "Acme", status: "applied", dateApplied: "2026-08-01", timeline: normalized, contacts: [] };
  assert.doesNotThrow(() => app.renderCard(job));
  assert.deepEqual(plain(job.timeline), plain(normalized));
  assert.equal(app.formatDateTime(job.timeline[0].at), "No date");
  assert.equal(app.formatDateTime(job.timeline[1].at), "Unknown date");
});

test("manual creation, form status edits, plain edits, drag moves, and XP retain ID history through rendering", () => {
  const app = appHarness();
  const board = app.state.boards[0];
  board.columns.push({ id: "custom-screen", name: "Applied", type: "custom" });
  const created = app.submitJob({});
  const createdEvent = created.timeline.find((event) => event.type === "created");
  assert.equal(createdEvent.columnId, "applied");
  assert.equal(createdEvent.columnName, "Applied");
  assert.equal(created.timeline.find((event) => event.type === "xp").columnId, "applied");

  app.editingJobId = created.id;
  const edited = app.submitJob({ status: "custom-screen" });
  const statusEvent = edited.timeline.find((event) => event.type === "status");
  assert.deepEqual([statusEvent.fromColumnId, statusEvent.columnId, statusEvent.fromColumnName, statusEvent.columnName], ["applied", "custom-screen", "Applied", "Applied"]);
  app.submitJob({ status: "custom-screen", notes: "Updated details" });
  assert.equal(board.jobs[0].timeline.filter((event) => event.type === "status").length, 1);
  assert.equal(board.jobs[0].timeline.at(-1).type, "edited");

  app.moveJob(created.id, "received-answer");
  const moved = board.jobs[0];
  const movedEvent = moved.timeline.filter((event) => event.type === "status").at(-1);
  assert.equal(movedEvent.fromColumnId, "custom-screen");
  assert.equal(movedEvent.columnId, "received-answer");
  assert.equal(movedEvent.fromColumnName, "Applied");
  assert.equal(movedEvent.columnName, "First Positive Answer");
  assert.equal(moved.timeline.filter((event) => event.type === "xp").at(-1).columnId, "received-answer");

  // Reordering within a stage must not invent another stage transition.
  app.moveJob(created.id, "received-answer");
  assert.equal(board.jobs[0].timeline.filter((event) => event.type === "status").length, 2);
  const loaded = JSON.parse(app.lastSavedState);
  loaded.boards[0].columns = loaded.boards[0].columns.filter((column) => column.id !== "custom-screen");
  const stats = build(loaded.boards[0], []); // XP reset must leave useful event history.
  assert.equal(stats.appliedJobs, 1);
  assert.equal(conversion(stats, "applied", "custom-screen").converted, 1);
  assert.equal(conversion(stats, "custom-screen", "received-answer").converted, 1);
  assert.equal(stats.stages.find((stage) => stage.id === "custom-screen").historical, true);
});

test("browser capture distinguishes saved from applied despite both receiving dateApplied", () => {
  const app = appHarness();
  const saved = app.normalizeCapturedJob({ title: "Engineer", company: "Acme", source: "LinkedIn", status: "saved" });
  const applied = app.normalizeCapturedJob({ title: "Designer", company: "Other", source: "Indeed", status: "applied" });
  app.renderCard(saved);
  app.renderCard(applied);
  assert.equal(saved.timeline[0].columnId, "saved");
  assert.equal(applied.timeline[0].columnId, "applied");
  assert.ok(saved.timeline[0].at);
  assert.ok(saved.dateApplied);
  const stats = build({ id: "board", jobs: [saved, applied] }, []);
  assert.equal(stats.totalJobs, 2);
  assert.equal(stats.appliedJobs, 1);
  assert.equal(stats.companies[0].name, "Other");
});

test("legacy migration retains stage membership without manufacturing event dates", () => {
  const app = appHarness();
  const migrated = app.migrateState({ jobs: [
    { id: "old-applied", title: "Engineer", company: "Acme", status: "applied", dateApplied: "2020-01-01" },
    { id: "old-interview", title: "Designer", company: "Other", status: "interviewing", dateApplied: "2020-01-02" },
    { id: "old-saved", title: "Analyst", company: "Third", status: "saved", dateApplied: "2020-01-03" },
  ] });
  assert.equal(migrated.xpEvents.length, 2);
  assert.ok(migrated.xpEvents.every((event) => event.earnedAt === ""));
  const stats = build(migrated.boards[0], migrated.xpEvents, { now: new Date("2026-09-06T12:00:00Z") });
  assert.equal(stats.appliedJobs, 1);
  assert.equal(stats.history.fallbackApplicationDates, 1);
  assert.equal(stats.activity.reduce((sum, week) => sum + week.count, 0), 0);
  assert.equal(stats.medianResponseDays, null);
  assert.equal(stats.funnel.find((stage) => stage.id === "interviewing").count, 0);
  const reloaded = app.migrateState(plain(migrated));
  assert.ok(reloaded.xpEvents.every((event) => event.earnedAt === ""));
});

test("historical rejection labels resolve only when no custom stage shares the name", () => {
  const job = (title) => ({ id: title, status: "saved", timeline: [
    { type: "created", title: "Added to Applied", at: "2026-08-01T00:00:00Z" },
    { type: "status", title: `Moved to ${title}`, details: "From Applied.", at: "2026-08-02T00:00:00Z" },
  ] });
  const jobs = [job("Rejected / Withdrawn"), job("Rejected")];
  const stats = build({ id: "board", jobs }, []);
  assert.equal(conversion(stats, "applied", "rejected").converted, 2);
  const ambiguous = build({ id: "board", jobs, columns: [
    { id: "custom-rejected", name: "Rejected", type: "custom" },
    { id: "custom-withdrawn", name: "Rejected / Withdrawn", type: "custom" },
  ] }, []);
  assert.equal(conversion(ambiguous, "applied", "rejected").converted, 0);
  assert.equal(ambiguous.stages.find((stage) => stage.id === "custom-rejected").ever, 0);
});
