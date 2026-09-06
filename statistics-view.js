/* Local-only presentation. All job-supplied labels are written with textContent. */
const HireLevelStatisticsView = (() => {
  const number = new Intl.NumberFormat();
  const decimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
  const tones = { applied: "applied", "received-answer": "response", interviewing: "interview", offer: "offer", rejected: "rejected" };
  let latestStats;
  let renderedBoardId;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const at = (id) => document.getElementById(id);
  const count = (value) => number.format(value || 0);
  const percent = (value) => value == null ? "—" : `${decimal.format(value)}%`;
  const track = (value) => {
    const bar = element("div", "stats-track");
    bar.setAttribute("aria-hidden", "true");
    const fill = element("span");
    fill.style.width = `${Math.max(0, Math.min(100, value || 0))}%`;
    bar.append(fill);
    return bar;
  };
  function options(select, items, selected) {
    select.replaceChildren(...items.map((item) => {
      const option = element("option", "", item.name + (item.historical ? " (removed)" : item.type === "custom" ? " (custom)" : ""));
      option.value = item.id;
      return option;
    }));
    if (items.some((item) => item.id === selected)) select.value = selected;
  }
  function render(board, boards, xpEvents) {
    const stats = HireLevelStatistics.build(board, xpEvents);
    latestStats = stats;
    options(at("statisticsBoardSelect"), boards, board.id);
    const sameBoard = renderedBoardId === board.id;
    const from = sameBoard ? at("statsFromStage").value : "applied";
    const to = sameBoard ? at("statsToStage").value : "received-answer";
    options(at("statsFromStage"), stats.stages, from);
    options(at("statsToStage"), stats.stages, to);
    renderedBoardId = board.id;
    at("statsFromStage").onchange = renderTransition;
    at("statsToStage").onchange = renderTransition;
    at("statsRankingScope").onchange = renderRankings;
    at("statsEmpty").hidden = stats.totalJobs > 0;
    at("statsHeroSummary").textContent = `${count(stats.totalJobs)} jobs tracked. ${count(stats.distinctCompanies)} companies on your radar. A little perspective for your next move.`;
    const positive = stats.funnel.find((stage) => stage.id === "received-answer");
    const offers = stats.funnel.find((stage) => stage.id === "offer");
    at("statsKpis").replaceChildren(...[
      ["Jobs on the board", stats.totalJobs, "Every saved possibility", "custom"],
      ["Applications sent", stats.appliedJobs, "Jobs known to have reached Applied", "applied"],
      ["Positive responses", positive?.count || 0, `${percent(positive?.percent)} of applied jobs · recorded afterward`, "response"],
      ["Offers reached", offers?.count || 0, `${percent(offers?.percent)} of applied jobs · recorded afterward`, "offer"],
    ].map(([label, value, caption, tone]) => {
      const card = element("div", "stats-kpi");
      card.dataset.tone = tone;
      card.append(element("span", "stats-label", label), element("strong", "stats-value", count(value)), element("span", "stats-caption", caption));
      return card;
    }));
    at("statsJourney").replaceChildren(...stats.funnel.filter((stage) => stage.id !== "rejected").map((stage, index) => {
      const card = element("div", "stats-step");
      card.dataset.tone = tones[stage.id] || "custom";
      card.append(element("span", "stats-step-number", `0${index + 1}`), element("span", "stats-label", stage.name), element("strong", "stats-step-count", count(stage.count)), element("span", "stats-step-rate", stage.id === "applied" ? "Your starting group" : `${percent(stage.percent)} of applied jobs`), track(stage.percent));
      if (stage.previousId && stage.id !== "applied") {
        const previousName = stats.stages.find((item) => item.id === stage.previousId)?.name || "previous stage";
        card.append(element("small", "stats-caption", `${percent(stage.previousPercent)} from ${previousName} · same Applied group`));
      }
      return card;
    }));
    const rejection = stats.funnel.find((stage) => stage.id === "rejected");
    at("statsRejection").replaceChildren(element("strong", "", `${count(rejection?.count)} reached Reject`), element("span", "stats-caption", `${percent(rejection?.percent)} of applied jobs · recorded afterward. One outcome, not the whole story.`));
    at("statsStageRows").replaceChildren(...stats.stages.map((stage) => {
      const row = element("tr");
      const label = element("th", "stats-stage-name", stage.name);
      label.scope = "row";
      if (stage.type === "custom" || stage.historical) label.append(element("small", "stats-caption", stage.historical ? "Removed stage" : "Custom stage"));
      row.append(label, element("td", "", count(stage.current)), element("td", "", count(stage.ever)));
      return row;
    }));
    renderTransition();
    renderRankings();
    renderActivity(stats);
    const source = stats.sources[0];
    const busiest = stats.activity.reduce((best, week) => week.count > (best?.count || 0) ? week : best, null);
    at("statsFacts").replaceChildren(...[
      [stats.medianResponseDays == null ? "—" : `${decimal.format(stats.medianResponseDays)} days`, "To a first positive response", `Median across ${count(stats.responseSampleSize)} jobs with dated records`],
      [count(stats.contacts), "Contacts in your corner", "Contact entries on this board"],
      [source?.name || "—", "Your most-used capture source", source ? `${count(source.count)} tracked jobs` : "Capture a job to start the story"],
      [busiest ? count(busiest.count) : "—", "Your busiest recent week", busiest ? `Week of ${busiest.label} · past 12 weeks` : "Your next application starts the streak"],
      [count(stats.stages.filter((stage) => stage.type === "custom" && !stage.historical).length), "Your workflow, your rules", "Custom stages on this board"],
      [count(stats.stages.reduce((total, stage) => total + stage.ever, 0)), "Steps on the map", "Unique job-and-stage visits, including Saved"],
    ].map(([value, label, caption]) => {
      const card = element("div", "stats-fact");
      card.append(element("strong", "", value), element("span", "", label), element("small", "stats-caption", caption));
      return card;
    }));
    at("statsCoverage").textContent = `${count(stats.history.withHistory)} of ${count(stats.totalJobs)} jobs have stage history. ${count(stats.history.withoutHistory)} rely on their current stage only. Missing history is left unknown, never guessed.`;
  }
  function renderTransition() {
    if (!latestStats) return;
    const fromId = at("statsFromStage").value;
    const toId = at("statsToStage").value;
    const container = at("statsTransition");
    if (fromId === toId) {
      container.replaceChildren(element("p", "stats-caption", "Choose two different stages to explore the journey between them."));
      return;
    }
    const result = HireLevelStatistics.conversion(latestStats, fromId, toId);
    const destination = latestStats.stages.find((stage) => stage.id === toId)?.name || "the destination";
    container.replaceChildren(element("strong", "stats-value", percent(result.percent)), element("p", "", `${count(result.converted)} of ${count(result.total)} jobs were later recorded in ${destination}.`), element("p", "stats-caption", "Counts each job once. Other stages may happen in between; jobs without enough history cannot confirm a conversion."));
  }
  function renderRankings() {
    if (!latestStats) return;
    const tracked = at("statsRankingScope").value === "tracked";
    renderRanking(at("statsCompanies"), tracked ? latestStats.trackedCompanies : latestStats.companies);
    renderRanking(at("statsPositions"), tracked ? latestStats.trackedPositions : latestStats.positions);
  }
  function renderRanking(container, items) {
    if (!items.length) {
      container.replaceChildren(element("li", "stats-empty", "No jobs in this group yet. A fresh page of possibilities."));
      return;
    }
    const maximum = items[0].count;
    container.replaceChildren(...items.slice(0, 5).map((item, index) => {
      const row = element("li");
      const content = element("div", "stats-rank-content");
      const label = element("div", "stats-rank-label");
      label.append(element("span", "", item.name), element("strong", "", `${count(item.count)} · ${percent(item.percent)}`));
      content.append(label, track(item.count / maximum * 100));
      row.append(element("span", "stats-rank-index", String(index + 1).padStart(2, "0")), content);
      return row;
    }));
  }
  function renderActivity(stats) {
    const maximum = Math.max(1, ...stats.activity.map((week) => week.count));
    const total = stats.activity.reduce((sum, week) => sum + week.count, 0);
    at("statsActivitySummary").textContent = `${count(total)} applications · weeks start Monday (UTC)`;
    at("statsActivity").replaceChildren(...stats.activity.map((week) => {
      const column = element("div", "stats-week");
      column.setAttribute("role", "listitem");
      column.setAttribute("aria-label", `Week of ${week.label}: ${count(week.count)} applications`);
      const bar = element("div", "stats-week-bar");
      const fill = element("span");
      fill.style.height = `${week.count / maximum * 100}%`;
      bar.setAttribute("aria-hidden", "true");
      bar.append(fill);
      column.append(element("strong", "stats-week-count", count(week.count)), bar, element("span", "stats-week-label", week.label));
      return column;
    }));
    at("statsActivityNote").textContent = `${count(stats.history.datedApplications)} applied jobs have a usable date across all time. ${count(stats.history.unknownApplicationDates)} have no usable application date and are excluded from this chart.`;
  }
  return { render };
})();
