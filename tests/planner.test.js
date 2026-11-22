(function () {
  'use strict';
  var P = window.Studeniqu.planner;
  var C = window.Studeniqu.chat;
  var results = [];

  function test(name, fn) {
    try { fn(); results.push({ name: name, ok: true }); }
    catch (e) { results.push({ name: name, ok: false, err: e.message }); }
  }
  function eq(a, b, msg) {
    var sa = JSON.stringify(a), sb = JSON.stringify(b);
    if (sa !== sb) throw new Error((msg || '') + ' expected ' + sb + ' got ' + sa);
  }
  function ok(v, msg) { if (!v) throw new Error(msg || 'expected true'); }

  // 2026-11-22 is a Sunday (weekday 0)
  var TODAY = '2026-11-22';
  var AVAIL = { 0: 3, 1: 3, 2: 3, 3: 3, 4: 3, 5: 2, 6: 0 };
  function task(id, due, est, extra) {
    return Object.assign({ id: id, title: id, course: '', due: due, estHours: est, status: 'todo', subtasks: [] }, extra || {});
  }
  function hoursFor(plan, id) {
    return plan.days.reduce(function (s, d) {
      return s + d.sessions.filter(function (x) { return x.taskId === id; }).reduce(function (a, x) { return a + x.hours; }, 0);
    }, 0);
  }

  test('date helpers', function () {
    eq(P.weekday(TODAY), 0);
    eq(P.addDays(TODAY, 7), '2026-11-29');
    eq(P.addDays('2026-12-31', 1), '2027-01-01');
  });

  test('remaining hours shrink with completed subtasks', function () {
    eq(P.remainingHours(task('a', TODAY, 4, { subtasks: [{ done: true }, { done: false }] })), 2);
    eq(P.remainingHours(task('a', TODAY, 4, { status: 'done' })), 0);
    eq(P.remainingHours(task('a', TODAY, null)), 0);
  });

  test('weekly plan covers 7 days and respects capacity', function () {
    var plan = P.buildPlan([task('a', '2026-11-28', 30)], AVAIL, { mode: 'week' }, TODAY);
    eq(plan.days.length, 7);
    plan.days.forEach(function (d) { ok(d.capacity - d.free <= d.capacity + 1e-9, 'over capacity on ' + d.date); });
    eq(plan.days[6].sessions.length, 0, 'Saturday has 0 availability');
  });

  test('daily plan covers only today', function () {
    var plan = P.buildPlan([task('a', '2026-11-25', 5)], AVAIL, { mode: 'day' }, TODAY);
    eq(plan.days.length, 1);
    eq(hoursFor(plan, 'a'), 3);
  });

  test('earliest deadline is planned first', function () {
    var plan = P.buildPlan([task('late', '2026-11-27', 3), task('soon', '2026-11-23', 3)], AVAIL, { mode: 'week' }, TODAY);
    eq(plan.days[0].sessions[0].taskId, 'soon');
  });

  test('no sessions after the due date', function () {
    var plan = P.buildPlan([task('a', '2026-11-23', 10)], AVAIL, { mode: 'week' }, TODAY);
    plan.days.forEach(function (d) {
      if (d.date > '2026-11-23') eq(d.sessions.length, 0, 'session after due on ' + d.date);
    });
    eq(hoursFor(plan, 'a'), 6);
    eq(plan.shortfall, [{ taskId: 'a', title: 'a', due: '2026-11-23', hours: 4 }]);
  });

  test('sessions are at most 2 hours', function () {
    var plan = P.buildPlan([task('a', '2026-11-28', 10)], AVAIL, { mode: 'week' }, TODAY);
    plan.days.forEach(function (d) { d.sessions.forEach(function (s) { ok(s.hours <= 2); }); });
  });

  test('overdue tasks come first and still get planned', function () {
    var plan = P.buildPlan([task('next', '2026-11-24', 2), task('old', '2026-11-20', 2)], AVAIL, { mode: 'week' }, TODAY);
    eq(plan.days[0].sessions[0].taskId, 'old');
    eq(hoursFor(plan, 'old'), 2);
  });

  test('tasks without estimate are reported, not planned', function () {
    var plan = P.buildPlan([task('x', '2026-11-24', null)], AVAIL, { mode: 'week' }, TODAY);
    eq(plan.missingEstimate, [{ taskId: 'x', title: 'x' }]);
    eq(plan.totalPlanned, 0);
  });

  test('options: excluded day, max per day, extra hours', function () {
    var base = { mode: 'week', excludedDays: [0], maxPerDay: 1, extraHours: { 6: 2 } };
    var plan = P.buildPlan([task('a', '2026-11-28', 20)], AVAIL, base, TODAY);
    eq(plan.days[0].capacity, 0, 'Sunday excluded');
    eq(plan.days[1].capacity, 1, 'max 1 per day');
    eq(plan.days[6].capacity, 2, 'Saturday 0 + 2 extra');
  });

  test('missed sessions are detected for re-planning', function () {
    var tasks = [task('a', '2026-11-25', 2), task('b', '2026-11-25', 2, { status: 'done' })];
    var plan = P.buildPlan(tasks.concat([task('b2', '2026-11-25', 0)]), AVAIL, { mode: 'week' }, TODAY);
    plan.days[0].sessions.push({ taskId: 'b', title: 'b', hours: 1 });
    var missed = P.missedSessions(plan, tasks, '2026-11-23');
    eq(missed.map(function (m) { return m.taskId; }), ['a']);
    eq(P.missedSessions(plan, tasks, TODAY), []);
  });

  test('chat: exclude a day', function () {
    var r = C.applyCommand('בלי יום שישי', P.defaultOptions());
    ok(r.ok); eq(r.options.excludedDays, [5]);
    eq(C.applyCommand('ללא שני', P.defaultOptions()).options.excludedDays, [1]);
    eq(C.applyCommand('בלי יום ו׳', P.defaultOptions()).options.excludedDays, [5]);
  });

  test('chat: max hours per day', function () {
    var r = C.applyCommand('מקסימום 3 שעות ביום', P.defaultOptions());
    ok(r.ok); eq(r.options.maxPerDay, 3);
  });

  test('chat: add hours to a day removes exclusion', function () {
    var start = Object.assign(P.defaultOptions(), { excludedDays: [4] });
    var r = C.applyCommand('הוסף 2 שעות ביום חמישי', start);
    ok(r.ok); eq(r.options.extraHours, { 4: 2 }); eq(r.options.excludedDays, []);
    eq(start.excludedDays, [4], 'input not mutated');
  });

  test('chat: mode and reset', function () {
    eq(C.applyCommand('תוכנית יומית', P.defaultOptions()).options.mode, 'day');
    var r = C.applyCommand('התחל מחדש', { mode: 'day', excludedDays: [1], maxPerDay: 2, extraHours: { 3: 1 } });
    eq(r.options, { mode: 'day', excludedDays: [], maxPerDay: null, extraHours: {} });
  });

  test('chat: unknown text is not applied', function () {
    var r = C.applyCommand('מה שלומך', P.defaultOptions());
    ok(!r.ok);
    var r2 = C.applyCommand('בלי', P.defaultOptions());
    ok(!r2.ok);
  });

  var D = window.Studeniqu.data;
  var SAMPLE = window.Studeniqu.sampleData;

  test('sample data loads with dates relative to today', function () {
    var s = D.fromSample(SAMPLE, TODAY);
    eq(s.tasks.length, SAMPLE.tasks.length);
    eq(s.tasks[0].due, '2026-11-24');
    eq(s.tasks[0].course, 'מבני נתונים');
    eq(s.approvedPlan, null);
    ok(s.tasks.some(function (t) { return P.isOverdue(t, TODAY); }), 'sample has an overdue task');
  });

  test('sample data is valid for import', function () {
    var s = D.fromSample(SAMPLE, TODAY);
    var back = D.parseImport(D.toExport(s));
    eq(back.tasks, s.tasks);
    eq(back.availability, { 0: 3, 1: 2, 2: 3, 3: 2, 4: 3, 5: 4, 6: 0 });
  });

  test('sample data produces a plan with a shortfall', function () {
    var s = D.fromSample(SAMPLE, TODAY);
    var plan = P.buildPlan(s.tasks, s.availability, { mode: 'week' }, TODAY);
    ok(plan.totalPlanned > 0);
    eq(plan.missingEstimate.map(function (m) { return m.taskId; }), ['sample-5']);
  });

  test('import rejects foreign or broken files', function () {
    function throws(obj) { try { D.parseImport(obj); } catch (e) { return true; } return false; }
    ok(throws(null));
    ok(throws({ app: 'other', version: 1, tasks: [] }));
    ok(throws({ app: 'studeniqu', version: 2, tasks: [] }));
    ok(throws({ app: 'studeniqu', version: 1, tasks: [{ title: '', due: '2026-11-22' }] }));
    ok(throws({ app: 'studeniqu', version: 1, tasks: [{ title: 'x', due: '22/11/2026' }] }));
    ok(throws({ app: 'studeniqu', version: 1, tasks: [{ title: 'x', due: '2026-11-22', estHours: -3 }] }));
  });

  test('import cleans values', function () {
    var r = D.parseImport({ app: 'studeniqu', version: 1, availability: { 0: 30, 1: 2 },
      tasks: [{ id: 'a', title: '  x  ', due: '2026-11-22', status: 'weird', subtasks: [{ title: 's', done: 'yes' }, null] },
              { id: 'a', title: 'y', due: '2026-11-23', estHours: '3' }] });
    eq(r.tasks[0].title, 'x');
    eq(r.tasks[0].status, 'todo');
    eq(r.tasks[0].subtasks, [{ title: 's', done: false }]);
    eq(r.tasks[1].id, 'a-2', 'duplicate id renamed');
    eq(r.tasks[1].estHours, 3);
    eq(r.availability[0], 0, 'out-of-range hours reset');
    eq(r.availability[1], 2);
  });

  var CH = window.Studeniqu.charts;

  test('charts: data from sample with an approved plan', function () {
    var s = D.fromSample(SAMPLE, TODAY);
    s.approvedPlan = P.buildPlan(s.tasks, s.availability, { mode: 'week' }, TODAY);
    var c = CH.chartData(s, TODAY);
    eq(c.hoursByDay.length, 7);
    eq(c.hoursByDay[0].label, 'ראשון');
    eq(Math.round(c.hoursByDay.reduce(function (a, d) { return a + d.planned; }, 0) * 100) / 100, s.approvedPlan.totalPlanned);
    c.hoursByDay.forEach(function (d) { ok(d.planned <= d.capacity, 'planned over capacity'); });
    eq(c.tasksByStatus.map(function (x) { return x.value; }), [4, 1, 1]);
    eq(c.overdue, 1);
  });

  test('charts: remaining hours by course, sorted, done and unestimated excluded', function () {
    var s = { tasks: [
      task('a', '2026-11-25', 4, { course: 'א' }),
      task('b', '2026-11-25', 6, { course: 'ב', subtasks: [{ done: true }, { done: false }] }),
      task('c', '2026-11-25', 5, { course: 'א' }),
      task('d', '2026-11-25', 9, { course: 'ג', status: 'done' }),
      task('e', '2026-11-25', null, { course: 'ד' }),
      task('f', '2026-11-25', 1)
    ], approvedPlan: null };
    var c = CH.chartData(s, TODAY);
    eq(c.remainingByCourse, [{ label: 'א', value: 9 }, { label: 'ב', value: 3 }, { label: 'ללא קורס', value: 1 }]);
    eq(c.hoursByDay, []);
  });

  var failed = results.filter(function (r) { return !r.ok; }).length;
  var ul = document.getElementById('results');
  results.forEach(function (r) {
    var li = document.createElement('li');
    li.className = r.ok ? 'pass' : 'fail';
    li.textContent = (r.ok ? '✓ ' : '✗ ') + r.name + (r.ok ? '' : ': ' + r.err);
    ul.appendChild(li);
  });
  var summary = document.getElementById('summary');
  summary.textContent = (results.length - failed) + ' / ' + results.length + ' עברו';
  summary.className = failed ? 'fail' : 'pass';
  window.TEST_RESULTS = { total: results.length, failed: failed, results: results };
})();
