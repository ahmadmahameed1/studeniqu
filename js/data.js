/* STUDENIQU data: sample loading, export and import validation. Pure, no DOM. */
(function (root) {
  'use strict';

  var P = root.Studeniqu.planner;
  var STATUSES = ['todo', 'doing', 'done'];
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  /* Turn sample data (relative dates, course ids) into app state. */
  function fromSample(sample, todayISO) {
    var courseName = {};
    sample.courses.forEach(function (c) { courseName[c.id] = c.name; });
    return {
      tasks: sample.tasks.map(function (t) {
        return {
          id: t.id,
          title: t.title,
          course: courseName[t.courseId] || '',
          due: P.addDays(todayISO, t.dueInDays),
          estHours: t.estHours,
          status: t.status,
          subtasks: t.subtasks.map(function (s) { return { title: s.title, done: !!s.done }; })
        };
      }),
      availability: Object.assign({}, sample.availability),
      approvedPlan: null
    };
  }

  function toExport(state) {
    return {
      app: 'studeniqu',
      version: 1,
      exportedAt: new Date().toISOString(),
      availability: state.availability,
      tasks: state.tasks,
      approvedPlan: state.approvedPlan || null
    };
  }

  function fail(msg) { throw new Error(msg); }

  function str(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }

  /* Validate an imported file (see data/schema.json). Returns clean state or throws with a Hebrew message. */
  function parseImport(obj) {
    if (!obj || typeof obj !== 'object' || obj.app !== 'studeniqu') fail('הקובץ אינו קובץ נתונים של STUDENIQU.');
    if (obj.version !== 1) fail('גרסת הקובץ אינה נתמכת.');
    if (!Array.isArray(obj.tasks)) fail('בקובץ חסרה רשימת משימות.');

    var seen = {};
    var tasks = obj.tasks.map(function (t, i) {
      var n = i + 1;
      if (!t || typeof t !== 'object') fail('משימה ' + n + ' אינה תקינה.');
      var title = str(t.title, 120);
      if (!title) fail('למשימה ' + n + ' אין כותרת.');
      if (typeof t.due !== 'string' || !DATE_RE.test(t.due)) fail('למשימה "' + title + '" אין מועד הגשה תקין.');
      var id = str(t.id, 64) || ('import-' + n);
      if (seen[id]) id = id + '-' + n;
      seen[id] = true;
      var est = t.estHours == null || t.estHours === '' ? null : Number(t.estHours);
      if (est !== null && !(est >= 0 && est <= 200)) fail('למשימה "' + title + '" יש משך לא תקין.');
      return {
        id: id,
        title: title,
        course: str(t.course, 80),
        due: t.due,
        estHours: est,
        status: STATUSES.indexOf(t.status) !== -1 ? t.status : 'todo',
        subtasks: (Array.isArray(t.subtasks) ? t.subtasks : [])
          .filter(function (s) { return s && str(s.title, 120); })
          .map(function (s) { return { title: str(s.title, 120), done: s.done === true }; })
      };
    });

    var availability = {};
    for (var d = 0; d < 7; d++) {
      var v = obj.availability ? Number(obj.availability[d]) : 0;
      availability[d] = v >= 0 && v <= 24 ? v : 0;
    }

    var plan = obj.approvedPlan;
    var approvedPlan = plan && typeof plan === 'object' && Array.isArray(plan.days) ? plan : null;

    return { tasks: tasks, availability: availability, approvedPlan: approvedPlan };
  }

  root.Studeniqu.data = { fromSample: fromSample, toExport: toExport, parseImport: parseImport };
})(window);
