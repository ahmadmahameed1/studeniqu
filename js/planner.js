/* STUDENIQU planner: pure functions, no DOM access. */
(function (root) {
  'use strict';

  var DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var MAX_SESSION_HOURS = 2;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function toISO(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function parseISO(iso) {
    var p = iso.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function addDays(iso, n) {
    var d = parseISO(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  }

  function weekday(iso) { return parseISO(iso).getDay(); }

  function round(n) { return Math.round(n * 100) / 100; }

  /* Hours still needed for a task, reduced by completed subtasks. */
  function remainingHours(task) {
    if (task.status === 'done' || !(task.estHours > 0)) return 0;
    var subs = task.subtasks || [];
    if (!subs.length) return task.estHours;
    var open = subs.filter(function (s) { return !s.done; }).length;
    return round(task.estHours * open / subs.length);
  }

  function isOverdue(task, todayISO) {
    return task.status !== 'done' && !!task.due && task.due < todayISO;
  }

  /* Total free study hours in a week (days 0-6). Missing or invalid values count as 0. */
  function weeklyHours(availability) {
    var sum = 0;
    for (var wd = 0; wd < 7; wd++) {
      var v = Number((availability || {})[wd]);
      if (v > 0) sum += v;
    }
    return round(sum);
  }

  /* Whole days from todayISO to iso (negative when iso is in the past). */
  function daysUntil(iso, todayISO) {
    return Math.round((parseISO(iso) - parseISO(todayISO)) / 86400000);
  }

  /* Short Hebrew countdown to a task's due date, or '' when not relevant. */
  function dueLabel(task, todayISO) {
    if (task.status === 'done' || !task.due) return '';
    var n = daysUntil(task.due, todayISO);
    if (n === 0) return 'היום';
    if (n === 1) return 'מחר';
    if (n > 1) return 'בעוד ' + n + ' ימים';
    return n === -1 ? 'באיחור של יום' : 'באיחור של ' + (-n) + ' ימים';
  }

  function defaultOptions() {
    return { mode: 'week', excludedDays: [], maxPerDay: null, extraHours: {} };
  }

  /*
   * Build a proposed plan.
   * tasks: [{id, title, course, due:'YYYY-MM-DD', estHours, status, subtasks:[{title, done}]}]
   * availability: {0..6: hours} (0 = Sunday)
   * options: {mode:'day'|'week', excludedDays:[weekday], maxPerDay:number|null, extraHours:{weekday:hours}}
   */
  function buildPlan(tasks, availability, options, todayISO) {
    var opts = Object.assign(defaultOptions(), options || {});
    var horizon = opts.mode === 'day' ? 1 : 7;
    var lastDay = addDays(todayISO, horizon - 1);

    var days = [];
    for (var i = 0; i < horizon; i++) {
      var date = addDays(todayISO, i);
      var wd = weekday(date);
      var cap = Number(availability[wd]) || 0;
      if (opts.maxPerDay != null) cap = Math.min(cap, opts.maxPerDay);
      cap += Number(opts.extraHours[wd]) || 0;
      if (opts.excludedDays.indexOf(wd) !== -1) cap = 0;
      days.push({ date: date, weekday: wd, capacity: round(cap), free: round(cap), sessions: [] });
    }

    var open = tasks.filter(function (t) { return t.status !== 'done'; });
    var missingEstimate = open.filter(function (t) { return !(t.estHours > 0); });
    var plannable = open
      .filter(function (t) { return remainingHours(t) > 0; })
      .sort(function (a, b) {
        var ao = isOverdue(a, todayISO), bo = isOverdue(b, todayISO);
        if (ao !== bo) return ao ? -1 : 1;
        var ad = a.due || '9999-12-31', bd = b.due || '9999-12-31';
        return ad < bd ? -1 : ad > bd ? 1 : 0;
      });

    var shortfall = [];
    plannable.forEach(function (task) {
      var left = remainingHours(task);
      var overdue = isOverdue(task, todayISO);
      days.forEach(function (day) {
        if (left <= 0) return;
        if (!overdue && task.due && day.date > task.due) return;
        while (left > 0 && day.free > 0) {
          var chunk = round(Math.min(left, day.free, MAX_SESSION_HOURS));
          day.sessions.push({ taskId: task.id, title: task.title, course: task.course || '', hours: chunk });
          day.free = round(day.free - chunk);
          left = round(left - chunk);
        }
      });
      var dueInHorizon = overdue || (task.due && task.due <= lastDay);
      if (left > 0 && dueInHorizon) {
        shortfall.push({ taskId: task.id, title: task.title, due: task.due, hours: left });
      }
    });

    var totalPlanned = round(days.reduce(function (sum, d) { return sum + (d.capacity - d.free); }, 0));
    return {
      mode: opts.mode,
      startDate: todayISO,
      options: opts,
      days: days,
      shortfall: shortfall,
      missingEstimate: missingEstimate.map(function (t) { return { taskId: t.id, title: t.title }; }),
      totalPlanned: totalPlanned
    };
  }

  /* Approved-plan sessions on past days whose task is still not done. */
  function missedSessions(plan, tasks, todayISO) {
    if (!plan) return [];
    var byId = {};
    tasks.forEach(function (t) { byId[t.id] = t; });
    var missed = [];
    plan.days.forEach(function (day) {
      if (day.date >= todayISO) return;
      day.sessions.forEach(function (s) {
        var t = byId[s.taskId];
        if (t && t.status !== 'done') missed.push({ date: day.date, taskId: s.taskId, title: s.title });
      });
    });
    return missed;
  }

  var api = {
    DAY_NAMES: DAY_NAMES,
    toISO: toISO,
    addDays: addDays,
    weekday: weekday,
    remainingHours: remainingHours,
    isOverdue: isOverdue,
    daysUntil: daysUntil,
    dueLabel: dueLabel,
    weeklyHours: weeklyHours,
    defaultOptions: defaultOptions,
    buildPlan: buildPlan,
    missedSessions: missedSessions
  };

  root.Studeniqu = root.Studeniqu || {};
  root.Studeniqu.planner = api;
})(window);
