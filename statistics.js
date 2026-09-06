(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HireLevelStatistics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DAY = 86400000;
  const DEFAULT_STAGES = [
    { id: "saved", name: "Saved" },
    { id: "applied", name: "Applied" },
    { id: "received-answer", name: "First Positive Answer" },
    { id: "interviewing", name: "Interviewing" },
    { id: "offer", name: "Offer" },
    { id: "rejected", name: "Reject" },
  ];
  const STAGE_EVENT_TYPES = new Set(["created", "captured", "status", "xp"]);
  const clean = (value) => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  const key = (value) => clean(value).toLocaleLowerCase("en-US");
  const percent = (count, total) => total ? count / total * 100 : null;
  const list = (value) => Array.isArray(value) ? value : [];

  // Accept ISO dates only, including an explicit timezone for event timestamps.
  // Date.parse alone silently accepts impossible dates such as February 30.
  function timestamp(value, allowDateOnly = false) {
    if (typeof value !== "string") return null;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
    if (!match) return null;
    const [, year, month, day, rest] = match;
    if (!rest && !allowDateOnly) return null;
    if (rest && !/^T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(rest)) return null;
    const calendar = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (calendar.getUTCFullYear() !== Number(year) || calendar.getUTCMonth() + 1 !== Number(month) || calendar.getUTCDate() !== Number(day)) return null;
    const parsed = Date.parse(rest ? value : `${value}T00:00:00Z`);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function rankings(jobs, field, unknownName) {
    const entries = new Map();
    jobs.forEach((job) => {
      const name = clean(job[field]) || unknownName;
      const identity = key(name);
      const entry = entries.get(identity) || { name, count: 0 };
      entry.count += 1;
      entries.set(identity, entry);
    });
    return [...entries.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map((entry) => ({ ...entry, percent: percent(entry.count, jobs.length) }));
  }

  function isBefore(first, second) {
    if (first.at === null || second.at === null) return false;
    if (first.at !== second.at) return first.at < second.at;
    // The timeline is append-only. Separate XP records have no comparable
    // sequence, so equal timestamps there do not prove an ordering.
    return first.source === "timeline" && second.source === "timeline" && first.order < second.order;
  }

  function relation(job, fromId, toId) {
    if (fromId === toId) return { converted: false, unknown: false };
    if (job.moves.some((move) => move.fromId === fromId && move.toId === toId)) return { converted: true, unknown: false };
    const from = job.observations.filter((item) => item.id === fromId);
    const to = job.observations.filter((item) => item.id === toId);
    if (from.some((a) => to.some((b) => isBefore(a, b)))) return { converted: true, unknown: false };
    const unknown = from.some((a) => to.some((b) => a.at === null || b.at === null || (a.at === b.at && !(a.source === "timeline" && b.source === "timeline"))));
    return { converted: false, unknown };
  }

  /**
   * Unique jobs with a recorded visit to fromId followed by a visit to toId.
   * Stages may have other stages between them; skipped stages are never inferred.
   * appliedOnly limits the denominator to jobs confirmed to reach fromId after
   * Applied (or all applied jobs when fromId is Applied). Its numerator requires
   * the target visit to follow that qualifying visit, preserving the same cohort.
   * unknown counts jobs with both stages but insufficient ordering evidence.
   * percent is 0..100, or null for an empty denominator. Same-stage pairs return
   * zero converted; callers should disable selecting the same stage twice.
   */
  function conversion(stats, fromId, toId, options = {}) {
    let cohort = list(stats && stats.jobs).filter((job) => job.stages.includes(fromId));
    if (options.appliedOnly) {
      cohort = cohort.filter((job) => fromId === "applied" || relation(job, "applied", fromId).converted);
    }
    let converted = 0;
    let unknown = 0;
    cohort.forEach((job) => {
      let result = relation(job, fromId, toId);
      if (options.appliedOnly && fromId !== "applied" && result.converted) {
        result = appliedChainRelation(job, fromId, toId);
      }
      if (result.converted) converted += 1;
      else if (result.unknown) unknown += 1;
    });
    return { fromId, toId, total: cohort.length, converted, percent: percent(converted, cohort.length), unknown };
  }

  function appliedChainRelation(job, fromId, toId) {
    const applied = job.observations.filter((item) => item.id === "applied");
    const from = job.observations.filter((item) => item.id === fromId);
    const to = job.observations.filter((item) => item.id === toId);
    if (from.some((middle) => applied.some((start) => isBefore(start, middle)) && to.some((end) => isBefore(middle, end)))) {
      return { converted: true, unknown: false };
    }
    // An undated direct move can establish a two-stage transition, but cannot
    // establish where a third stage occurred relative to it.
    return { converted: false, unknown: from.some((point) => point.at === null) || applied.some((point) => point.at === null) || to.some((point) => point.at === null) };
  }

  /**
   * Read-only statistics for jobs currently retained on one board. XP from other
   * boards and deleted jobs is excluded. Explicit stage IDs take precedence;
   * old prose is understood only when its exact normalized name is unambiguous.
   * Current status proves stage membership, never an earlier unlogged stage.
   * dateApplied supplies an activity date only for independently proven applied
   * jobs; it is never evidence that a saved job has applied.
   *
   * Returns plain JSON data: totals, history coverage, stage ever/current counts,
   * an applied-cohort funnel, applied and tracked company/title rankings, source
   * counts, 12 Monday-based UTC activity weeks, response timing, and per-job
   * evidence used by conversion(). All percentages use 0..100 or null when empty.
   */
  function build(board, xpEvents, options = {}) {
    board = board || {};
    const rawJobs = [];
    const seenJobIds = new Set();
    list(board.jobs).forEach((job, index) => {
      if (!job || typeof job !== "object") return;
      const id = clean(job.id) || `unidentified-job-${index}`;
      if (seenJobIds.has(id)) return;
      seenJobIds.add(id);
      rawJobs.push({ job, id });
    });
    const filteredXp = list(xpEvents).filter((event) => event && event.boardId === board.id && seenJobIds.has(event.jobId) && clean(event.columnId));
    const stageMap = new Map(DEFAULT_STAGES.map((stage) => [stage.id, { ...stage, type: "default", historical: false, current: 0, ever: 0 }]));
    list(board.columns).forEach((column) => {
      if (!column || !clean(column.id)) return;
      const previous = stageMap.get(column.id);
      stageMap.set(column.id, { id: column.id, name: clean(column.name) || column.id, type: previous ? "default" : "custom", historical: false, current: 0, ever: 0 });
    });
    const discover = (id, name) => {
      id = clean(id);
      if (!id) return;
      const previous = stageMap.get(id);
      if (!previous) stageMap.set(id, { id, name: clean(name) || id, type: "custom", historical: true, current: 0, ever: 0 });
      else if (previous.historical && previous.name === id && clean(name)) previous.name = clean(name);
    };
    rawJobs.forEach(({ job }) => {
      discover(job.status);
      list(job.timeline).forEach((event) => {
        if (!event || !STAGE_EVENT_TYPES.has(event.type)) return;
        discover(event.columnId, event.columnName);
        discover(event.fromColumnId, event.fromColumnName);
      });
    });
    filteredXp.forEach((event) => discover(event.columnId, event.columnName));
    const names = new Map();
    const addName = (name, id) => {
      if (!key(name)) return;
      if (!names.has(key(name))) names.set(key(name), new Set());
      names.get(key(name)).add(id);
    };
    stageMap.forEach((stage) => addName(stage.name, stage.id));
    DEFAULT_STAGES.forEach((stage) => addName(stage.name, stage.id));
    // Default labels used by older releases. Keep them in the same ambiguity
    // index as custom names so a custom "Rejected" column is never conflated.
    ["Rejected / Withdrawn", "Rejected"].forEach((name) => addName(name, "rejected"));
    // Preserve old display names for renamed columns when metadata identifies
    // them. Ambiguous aliases never resolve to either stage.
    rawJobs.forEach(({ job }) => list(job.timeline).forEach((event) => {
      if (!event || !STAGE_EVENT_TYPES.has(event.type)) return;
      if (stageMap.has(event.columnId)) addName(event.columnName, event.columnId);
      if (stageMap.has(event.fromColumnId)) addName(event.fromColumnName, event.fromColumnId);
    }));
    const resolveName = (name) => {
      const matches = names.get(key(name));
      return matches && matches.size === 1 ? [...matches][0] : "";
    };
    const jobs = rawJobs.map(({ job, id }) => {
      const observations = [];
      const moves = [];
      const stages = new Set();
      let hasHistory = false;
      const observe = (columnId, at, source, order, entry = true) => {
        if (!stageMap.has(columnId)) return;
        stages.add(columnId);
        observations.push({ id: columnId, at, source, order, entry });
      };
      list(job.timeline).forEach((event, index) => {
        if (!event || !STAGE_EVENT_TYPES.has(event.type)) return;
        let destination = clean(event.columnId);
        let origin = clean(event.fromColumnId);
        if (!destination) {
          if (event.type === "xp") destination = resolveName(event.details);
          else {
            const match = clean(event.title).match(/^(?:Moved|Added|Captured) to (.+)$/);
            if (match) destination = resolveName(match[1]);
          }
        }
        if (!origin && event.type === "status") {
          const match = clean(event.details).match(/^From (.+)\.$/);
          if (match) origin = resolveName(match[1]);
        }
        const at = timestamp(event.at);
        if (destination || origin) hasHistory = true;
        observe(origin, at, "timeline", index * 2, false);
        observe(destination, at, "timeline", index * 2 + 1);
        if (origin && destination && origin !== destination) moves.push({ fromId: origin, toId: destination, at, order: index });
      });
      filteredXp.filter((event) => event.jobId === id).forEach((event) => {
        hasHistory = true;
        observe(event.columnId, timestamp(event.earnedAt), "xp", null);
      });
      const currentStage = clean(job.status);
      if (stageMap.has(currentStage)) {
        stageMap.get(currentStage).current += 1;
        if (!stages.has(currentStage)) observe(currentStage, null, "current", null);
      }
      stages.forEach((stageId) => stageMap.get(stageId).ever += 1);
      const appliedTimes = observations.filter((item) => item.id === "applied" && item.entry && item.at !== null).map((item) => item.at);
      const appliedAt = stages.has("applied") ? (appliedTimes.length ? Math.min(...appliedTimes) : timestamp(job.dateApplied, true)) : null;
      return {
        id, currentStage, stages: [...stages], observations, moves, hasHistory,
        appliedAt, appliedDateIsFallback: stages.has("applied") && !appliedTimes.length && appliedAt !== null,
        company: clean(job.company), title: clean(job.title), source: clean(job.source),
        contacts: list(job.contacts).filter((contact) => contact && clean(contact.name)).length,
      };
    });
    const applied = jobs.filter((job) => job.stages.includes("applied"));
    const responseDays = [];
    applied.forEach((job) => {
      const starts = job.observations.filter((point) => point.id === "applied" && point.entry && point.at !== null);
      if (!starts.length) return;
      const firstApplied = starts.reduce((first, point) => point.at < first.at || (point.at === first.at && isBefore(point, first)) ? point : first);
      const responses = job.observations.filter((point) => point.id === "received-answer" && point.entry && isBefore(firstApplied, point));
      if (responses.length) responseDays.push((Math.min(...responses.map((point) => point.at)) - firstApplied.at) / DAY);
    });
    responseDays.sort((a, b) => a - b);
    const middle = Math.floor(responseDays.length / 2);
    const medianResponseDays = responseDays.length ? (responseDays.length % 2 ? responseDays[middle] : (responseDays[middle - 1] + responseDays[middle]) / 2) : null;
    const suppliedNow = options.now instanceof Date ? options.now.getTime() : typeof options.now === "number" ? options.now : timestamp(options.now, true);
    const now = suppliedNow !== null && Number.isFinite(suppliedNow) ? suppliedNow : Date.now();
    const week = new Date(now);
    week.setUTCHours(0, 0, 0, 0);
    week.setUTCDate(week.getUTCDate() - (week.getUTCDay() + 6) % 7);
    const currentWeek = week.getTime();
    const activity = Array.from({ length: 12 }, (_, index) => {
      const start = currentWeek - (11 - index) * 7 * DAY;
      return {
        start: new Date(start).toISOString().slice(0, 10),
        label: new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        count: applied.filter((job) => job.appliedAt !== null && job.appliedAt >= start && job.appliedAt < start + 7 * DAY && job.appliedAt <= now).length,
      };
    });
    const stats = {
      totalJobs: jobs.length,
      appliedJobs: applied.length,
      distinctCompanies: new Set(jobs.map((job) => key(job.company)).filter(Boolean)).size,
      contacts: jobs.reduce((total, job) => total + job.contacts, 0),
      history: {
        withHistory: jobs.filter((job) => job.hasHistory).length,
        withoutHistory: jobs.filter((job) => !job.hasHistory).length,
        datedApplications: applied.filter((job) => job.appliedAt !== null).length,
        unknownApplicationDates: applied.filter((job) => job.appliedAt === null).length,
        fallbackApplicationDates: applied.filter((job) => job.appliedDateIsFallback).length,
      },
      stages: [...stageMap.values()],
      companies: rankings(applied, "company", "Company not recorded"),
      positions: rankings(applied, "title", "Position not recorded"),
      trackedCompanies: rankings(jobs, "company", "Company not recorded"),
      trackedPositions: rankings(jobs, "title", "Position not recorded"),
      sources: rankings(jobs, "source", "Source not recorded"),
      activity, medianResponseDays, responseSampleSize: responseDays.length, jobs,
    };
    const funnelStages = ["applied", "received-answer", "interviewing", "offer", "rejected"];
    stats.funnel = funnelStages.map((id, index) => {
      const result = id === "applied" ? { converted: applied.length, percent: percent(applied.length, applied.length), unknown: 0 } : conversion(stats, "applied", id);
      const previousId = index > 0 ? (id === "rejected" ? "applied" : funnelStages[index - 1]) : null;
      const previous = previousId ? conversion(stats, previousId, id, { appliedOnly: true }) : null;
      return {
        id, name: stageMap.get(id).name, count: result.converted, percent: result.percent, unknown: result.unknown,
        previousId, previousCount: previous ? previous.total : null,
        previousConverted: previous ? previous.converted : null, previousPercent: previous ? previous.percent : null,
      };
    });
    return stats;
  }

  return { build, conversion };
});
