const test = require("node:test");
const assert = require("node:assert/strict");
const { build, conversion } = require("../statistics.js");

const now = new Date("2026-09-06T12:00:00Z");
const day = (day) => `2026-08-${String(day).padStart(2, "0")}T12:00:00Z`;
const stage = (columnId, at, fromColumnId) => ({ type: fromColumnId ? "status" : "created", columnId, fromColumnId, at });
const job = (id, status, timeline = [], other = {}) => ({ id, status, timeline, company: "Acme", title: "Engineer", dateApplied: "2026-08-01", ...other });
const board = (jobs, columns = []) => ({ id: "board-a", jobs, columns });
const statsFor = (jobs, xp = [], columns = []) => build(board(jobs, columns), xp, { now });
const count = (stats, id) => stats.funnel.find((entry) => entry.id === id).count;

test("empty board yields explicit empty statistics without NaN", () => {
  const stats = build(null, null, { now });
  assert.equal(stats.totalJobs, 0);
  assert.equal(stats.stages.length, 6);
  assert.equal(stats.activity.length, 12);
  assert.equal(stats.funnel[0].percent, null);
  assert.equal(stats.medianResponseDays, null);
  assert.deepEqual(conversion(stats, "applied", "offer"), { fromId: "applied", toId: "offer", total: 0, converted: 0, percent: null, unknown: 0 });
  assert.ok(!JSON.stringify(stats).includes("NaN"));
});

test("dateApplied alone never makes saved or directly added interview jobs applied", () => {
  const stats = statsFor([job("saved", "saved"), job("direct", "interviewing", [stage("interviewing", day(3))])]);
  assert.equal(stats.appliedJobs, 0);
  assert.equal(count(stats, "interviewing"), 0);
  assert.equal(stats.stages.find((entry) => entry.id === "interviewing").ever, 1);
  assert.equal(stats.activity.reduce((sum, week) => sum + week.count, 0), 0);
});

test("milestones count unique applied jobs, retain rejection, and never infer skipped steps", () => {
  const stats = statsFor([
    job("full", "rejected", [stage("applied", day(1)), stage("received-answer", day(3), "applied"), stage("interviewing", day(5), "received-answer"), stage("received-answer", day(6), "interviewing"), stage("interviewing", day(7), "received-answer"), stage("offer", day(8), "interviewing"), stage("rejected", day(9), "offer")]),
    job("skip", "offer", [stage("applied", day(1)), stage("offer", day(6), "applied")]),
    job("waiting", "applied", [stage("applied", day(1))]),
  ]);
  assert.deepEqual(stats.funnel.map((entry) => entry.count), [3, 1, 1, 2, 1]);
  assert.equal(stats.funnel[3].previousCount, 1);
  assert.equal(stats.funnel[3].previousConverted, 1);
  assert.equal(stats.funnel[3].previousPercent, 100);
  assert.equal(stats.medianResponseDays, 2);
  assert.equal(conversion(stats, "received-answer", "interviewing").converted, 1);
});

test("legacy prose and retained XP agree without duplicate counting; reset XP keeps timeline history", () => {
  const jobs = [job("legacy", "offer", [
    { type: "created", title: "Captured to Applied", at: day(1) },
    { type: "xp", title: "Earned 5 XP", details: "Applied", at: day(1) },
    { type: "status", title: "Moved to First Positive Answer", details: "From Applied.", at: day(4) },
    { type: "status", title: "Moved to Offer", details: "From First Positive Answer.", at: day(8) },
  ])];
  const xp = [
    { boardId: "board-a", jobId: "legacy", columnId: "applied", earnedAt: day(1) },
    { boardId: "board-a", jobId: "legacy", columnId: "offer", earnedAt: day(8) },
  ];
  const withXp = statsFor(jobs, xp);
  const withoutXp = statsFor(jobs);
  assert.deepEqual(withXp.funnel, withoutXp.funnel);
  assert.equal(withoutXp.appliedJobs, 1);
  assert.equal(withoutXp.medianResponseDays, 3);
});

test("custom stage names colliding with each other or defaults never resolve ambiguous prose", () => {
  const columns = [{ id: "custom-applied", name: "Applied", type: "custom" }, { id: "custom-a", name: "Phone Screen", type: "custom" }, { id: "custom-b", name: " phone  screen ", type: "custom" }];
  const stats = statsFor([
    job("ambiguous", "saved", [{ type: "created", title: "Added to Applied", at: day(1) }, { type: "status", title: "Moved to Phone Screen", details: "From Applied.", at: day(2) }]),
    job("explicit", "custom-applied", [stage("custom-applied", day(1))]),
    job("real", "applied", [stage("applied", day(1))]),
  ], [], columns);
  assert.equal(stats.appliedJobs, 1);
  assert.equal(stats.stages.find((entry) => entry.id === "custom-a").ever, 0);
  assert.equal(stats.stages.find((entry) => entry.id === "custom-applied").ever, 1);
});

test("historical custom IDs survive deletion and exact names identify old prose", () => {
  const stats = statsFor([job("custom", "offer", [
    stage("applied", day(1)),
    { ...stage("custom-phone", day(2), "applied"), columnName: "Phone screen" },
    { ...stage("offer", day(4), "custom-phone"), fromColumnName: "Phone screen" },
  ])]);
  assert.deepEqual(stats.stages.find((entry) => entry.id === "custom-phone"), { id: "custom-phone", name: "Phone screen", type: "custom", historical: true, current: 0, ever: 1 });
  assert.equal(conversion(stats, "custom-phone", "offer").converted, 1);
  assert.equal(conversion(stats, "applied", "custom-phone").converted, 1);
});

test("other boards, deleted jobs, duplicate XP, and duplicate job IDs are excluded", () => {
  const stats = statsFor([job("one", "saved"), job("one", "applied")], [
    { boardId: "board-b", jobId: "one", columnId: "applied", earnedAt: day(1) },
    { boardId: "board-a", jobId: "deleted", columnId: "applied", earnedAt: day(1) },
    { boardId: "board-a", jobId: "one", columnId: "custom-only", earnedAt: day(2) },
    { boardId: "board-a", jobId: "one", columnId: "custom-only", earnedAt: day(2) },
  ]);
  assert.equal(stats.totalJobs, 1);
  assert.equal(stats.appliedJobs, 0);
  assert.equal(stats.stages.find((entry) => entry.id === "custom-only").ever, 1);
});

test("reverse moves do not become successful forward conversions", () => {
  const stats = statsFor([job("reverse", "applied", [stage("offer", day(1)), stage("interviewing", day(2), "offer"), stage("applied", day(3), "interviewing")])]);
  assert.equal(count(stats, "offer"), 0);
  assert.equal(count(stats, "interviewing"), 0);
  assert.equal(conversion(stats, "applied", "offer").unknown, 0);
  assert.equal(conversion(stats, "offer", "applied").converted, 1);
});

test("the previous-stage funnel preserves a chronological applied cohort across revisits", () => {
  const stats = statsFor([job("revisit", "received-answer", [stage("received-answer", day(1)), stage("interviewing", day(2), "received-answer"), stage("applied", day(3), "interviewing"), stage("received-answer", day(4), "applied")])]);
  assert.equal(count(stats, "received-answer"), 1);
  assert.equal(count(stats, "interviewing"), 0);
  assert.equal(conversion(stats, "received-answer", "interviewing").converted, 1);
  assert.equal(conversion(stats, "received-answer", "interviewing", { appliedOnly: true }).converted, 0);
});

test("same-timestamp timeline order or explicit moves prove order, XP ties do not", () => {
  const stats = statsFor([
    job("timeline", "offer", [stage("applied", day(1)), stage("received-answer", day(1)), stage("offer", day(1))]),
    job("direct", "offer", [stage("offer", day(1), "applied")]),
    job("xp", "offer"),
  ], [
    { boardId: "board-a", jobId: "xp", columnId: "applied", earnedAt: day(1) },
    { boardId: "board-a", jobId: "xp", columnId: "offer", earnedAt: day(1) },
  ]);
  const result = conversion(stats, "applied", "offer");
  assert.equal(result.converted, 2);
  assert.equal(result.unknown, 1);
  assert.equal(stats.medianResponseDays, 0);
});

test("invalid and absent timestamps are not fabricated; direct moves still prove transitions", () => {
  const stats = statsFor([
    job("invalid", "offer", [stage("applied", "2026-02-30T12:00:00Z"), stage("offer", "not a date")], { dateApplied: "2026-02-30" }),
    job("direct", "offer", [stage("offer", "", "applied")], { dateApplied: "" }),
    job("current", "applied", [], { dateApplied: "2026-08-03" }),
    job("saved", "saved", [], { dateApplied: "2026-08-04" }),
  ]);
  assert.equal(stats.appliedJobs, 3);
  assert.equal(count(stats, "offer"), 1);
  assert.equal(conversion(stats, "applied", "offer").unknown, 1);
  assert.equal(stats.history.unknownApplicationDates, 2);
  assert.equal(stats.history.fallbackApplicationDates, 1);
  assert.equal(stats.history.withoutHistory, 2);
  assert.equal(stats.activity.reduce((sum, week) => sum + week.count, 0), 1);
  assert.equal(stats.medianResponseDays, null);
});

test("rankings normalize case/space, keep exact distinct titles, and separate applied from tracked", () => {
  const stats = statsFor([
    job("one", "applied", [], { company: " ACME  Corp ", title: "Software Engineer", source: "LinkedIn", contacts: [{ name: "A" }, { name: "B" }] }),
    job("two", "applied", [], { company: "acme corp", title: " software  engineer ", source: "linkedin" }),
    job("three", "saved", [], { company: "Other", title: "Senior Software Engineer", source: "" }),
  ]);
  assert.deepEqual(stats.companies, [{ name: "ACME Corp", count: 2, percent: 100 }]);
  assert.equal(stats.positions[0].count, 2);
  assert.equal(stats.trackedPositions.length, 2);
  assert.equal(stats.distinctCompanies, 2);
  assert.equal(stats.contacts, 2);
  assert.equal(stats.sources[0].count, 2);
});

test("activity uses earliest proven application, Monday UTC buckets, and ignores future/old dates", () => {
  const stats = statsFor([
    job("earliest", "applied", [stage("applied", "2026-08-30T23:59:59Z"), stage("applied", "2026-09-01T00:00:00Z")]),
    job("monday", "applied", [], { dateApplied: "2026-08-31" }),
    job("future", "applied", [], { dateApplied: "2026-09-10" }),
    job("old", "applied", [], { dateApplied: "2020-01-01" }),
  ]);
  assert.equal(stats.activity.at(-1).start, "2026-08-31");
  assert.equal(stats.activity.at(-1).count, 1);
  assert.equal(stats.activity.at(-2).count, 1);
  assert.equal(stats.activity.reduce((sum, week) => sum + week.count, 0), 2);
});

test("median excludes fallback dates and reversed responses, and handles even sample sizes", () => {
  const stats = statsFor([
    job("two", "received-answer", [stage("applied", day(1)), stage("received-answer", day(3), "applied")]),
    job("four", "received-answer", [stage("applied", day(1)), stage("received-answer", day(5), "applied")]),
    job("fallback", "received-answer", [stage("received-answer", day(20), "applied")]),
    job("reverse", "applied", [stage("received-answer", day(1)), stage("applied", day(10))]),
  ]);
  assert.equal(stats.medianResponseDays, 3);
  assert.equal(stats.responseSampleSize, 2);
});

test("build is read-only even with frozen input and malformed collections", () => {
  const frozenJob = Object.freeze({ ...job("one", "applied", Object.freeze([Object.freeze(stage("applied", day(1)))])), contacts: "not an array" });
  const input = Object.freeze({ ...board(Object.freeze([frozenJob, null])), columns: Object.freeze([]) });
  const xp = Object.freeze([null, Object.freeze({ boardId: "board-a", jobId: "one", columnId: "offer", earnedAt: day(2) })]);
  const before = JSON.stringify({ input, xp });
  const stats = build(input, xp, { now });
  assert.equal(count(stats, "offer"), 1);
  assert.equal(JSON.stringify({ input, xp }), before);
  assert.doesNotThrow(() => JSON.stringify(stats));
});
