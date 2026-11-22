/* STUDENIQU app: state, storage and rendering. */
(function () {
  'use strict';

  var P = window.Studeniqu.planner;
  var Chat = window.Studeniqu.chat;
  var KEY = 'studeniqu.v1';
  var STATUS = { todo: 'לביצוע', doing: 'בתהליך', done: 'הושלם' };

  var defaultAvailability = { 0: 3, 1: 3, 2: 3, 3: 3, 4: 3, 5: 2, 6: 0 };

  var state = load();
  var draft = null;          // {plan, options}
  var editingId = null;

  /* ---------- storage ---------- */

  function load() {
    var fresh = { tasks: [], availability: Object.assign({}, defaultAvailability), approvedPlan: null };
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return fresh;
      var data = JSON.parse(raw);
      return {
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        availability: Object.assign({}, defaultAvailability, data.availability || {}),
        approvedPlan: data.approvedPlan || null
      };
    } catch (e) {
      return fresh;
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }

  function today() { return P.toISO(new Date()); }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------- DOM helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'class') node.className = attrs[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function formatDate(iso) {
    var p = iso.split('-');
    return 'יום ' + P.DAY_NAMES[P.weekday(iso)] + ' ' + Number(p[2]) + '.' + Number(p[1]);
  }

  /* ---------- tasks ---------- */

  function findTask(id) { return state.tasks.filter(function (t) { return t.id === id; })[0]; }

  function sortedTasks() {
    var t0 = today();
    return state.tasks.slice().sort(function (a, b) {
      var ad = a.status === 'done', bd = b.status === 'done';
      if (ad !== bd) return ad ? 1 : -1;
      var ao = P.isOverdue(a, t0), bo = P.isOverdue(b, t0);
      if (ao !== bo) return ao ? -1 : 1;
      return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
    });
  }

  function resetForm() {
    editingId = null;
    $('task-form').reset();
    $('task-submit').textContent = 'הוספת משימה';
    $('task-cancel').hidden = true;
  }

  function onSubmitTask(e) {
    e.preventDefault();
    var title = $('task-title').value.trim();
    var due = $('task-due').value;
    if (!title || !due) return;
    var hoursRaw = $('task-hours').value;
    var data = {
      title: title,
      course: $('task-course').value.trim(),
      due: due,
      estHours: hoursRaw === '' ? null : Math.max(0, Number(hoursRaw))
    };
    if (editingId) {
      Object.assign(findTask(editingId), data);
    } else {
      state.tasks.push(Object.assign({ id: uid(), status: 'todo', subtasks: [] }, data));
    }
    save();
    resetForm();
    render();
  }

  function startEdit(task) {
    editingId = task.id;
    $('task-title').value = task.title;
    $('task-course').value = task.course || '';
    $('task-due').value = task.due;
    $('task-hours').value = task.estHours == null ? '' : task.estHours;
    $('task-submit').textContent = 'שמירת שינויים';
    $('task-cancel').hidden = false;
    $('task-title').focus();
  }

  function renderTask(task) {
    var t0 = today();
    var overdue = P.isOverdue(task, t0);
    var subs = task.subtasks || [];
    var doneSubs = subs.filter(function (s) { return s.done; }).length;

    var meta = el('div', { class: 'task-meta' }, [
      el('span', { text: (task.course ? task.course + ' · ' : '') + 'הגשה: ' + formatDate(task.due) }),
      overdue ? el('span', { class: 'late', text: ' · באיחור' }) : null,
      el('span', { text: ' · ' + (task.estHours > 0 ? task.estHours + ' שעות' : 'חסר משך') }),
      subs.length ? el('span', { text: ' · ' + doneSubs + '/' + subs.length + ' תתי-משימות' }) : null
    ]);

    var status = el('select', { 'aria-label': 'סטטוס', onchange: function (e) {
      task.status = e.target.value; save(); render();
    } });
    Object.keys(STATUS).forEach(function (k) {
      var o = el('option', { value: k, text: STATUS[k] });
      if (task.status === k) o.selected = true;
      status.appendChild(o);
    });

    var actions = el('div', { class: 'task-actions' }, [
      status,
      el('button', { type: 'button', class: 'btn small', text: 'עריכה', onclick: function () { startEdit(task); } }),
      el('button', { type: 'button', class: 'btn small danger', text: 'מחיקה', onclick: function () {
        if (!confirm('למחוק את "' + task.title + '"?')) return;
        state.tasks = state.tasks.filter(function (t) { return t.id !== task.id; });
        if (editingId === task.id) resetForm();
        save(); render();
      } })
    ]);

    var subList = el('ul', { class: 'subtasks' });
    subs.forEach(function (s, i) {
      var cb = el('input', { type: 'checkbox', 'aria-label': s.title, onchange: function (e) {
        s.done = e.target.checked; save(); render();
      } });
      cb.checked = !!s.done;
      subList.appendChild(el('li', { class: s.done ? 'done' : '' }, [
        cb,
        el('span', { text: s.title }),
        el('button', { type: 'button', class: 'btn small', text: '✕', 'aria-label': 'מחיקת תת-משימה', onclick: function () {
          subs.splice(i, 1); save(); render();
        } })
      ]));
    });

    var subInput = el('input', { placeholder: 'תת-משימה חדשה', maxlength: '120', 'aria-label': 'תת-משימה חדשה' });
    var subForm = el('form', { class: 'sub-form', onsubmit: function (e) {
      e.preventDefault();
      var v = subInput.value.trim();
      if (!v) return;
      task.subtasks = subs.concat([{ title: v, done: false }]);
      save(); render();
    } }, [subInput, el('button', { type: 'submit', class: 'btn small', text: 'הוספה' })]);

    return el('li', { class: 'task' + (overdue ? ' overdue' : '') + (task.status === 'done' ? ' done' : '') }, [
      el('div', { class: 'task-head' }, [
        el('div', null, [el('div', { class: 'task-title', text: task.title }), meta]),
        actions
      ]),
      subList,
      task.status === 'done' ? null : subForm
    ]);
  }

  function renderTasks() {
    var list = $('task-list');
    list.textContent = '';
    var shown = window.Studeniqu.search.filterTasks(sortedTasks(), $('task-search').value);
    shown.forEach(function (t) { list.appendChild(renderTask(t)); });
    $('task-empty').hidden = state.tasks.length > 0;
    $('task-no-results').hidden = !(state.tasks.length > 0 && shown.length === 0);
  }

  /* ---------- availability ---------- */

  function renderAvailability() {
    var box = $('availability');
    box.textContent = '';
    P.DAY_NAMES.forEach(function (name, wd) {
      var input = el('input', { type: 'number', min: '0', max: '24', step: '0.5', value: String(state.availability[wd] || 0),
        onchange: function (e) {
          var v = Math.min(24, Math.max(0, Number(e.target.value) || 0));
          state.availability[wd] = v; e.target.value = v; save();
        } });
      box.appendChild(el('label', null, [document.createTextNode(name), input]));
    });
  }

  /* ---------- plans ---------- */

  function renderDays(container, plan) {
    container.textContent = '';
    plan.days.forEach(function (day) {
      var used = Math.round((day.capacity - day.free) * 100) / 100;
      var box = el('div', { class: 'day' }, [
        el('div', { class: 'day-head' }, [
          el('span', { text: formatDate(day.date) }),
          el('span', { class: 'muted', text: used + ' / ' + day.capacity + ' שעות' })
        ])
      ]);
      if (!day.sessions.length) box.appendChild(el('div', { class: 'muted', text: day.capacity ? 'אין מקטעי למידה' : 'לא מתוכנן' }));
      // One line per task per day; blocks longer than 2 hours are split into sessions.
      var rows = [];
      day.sessions.forEach(function (s) {
        var row = rows.filter(function (r) { return r.taskId === s.taskId; })[0];
        if (row) { row.hours = Math.round((row.hours + s.hours) * 100) / 100; row.count++; }
        else rows.push({ taskId: s.taskId, title: s.title, course: s.course, hours: s.hours, count: 1 });
      });
      rows.forEach(function (r) {
        box.appendChild(el('div', { class: 'session' }, [
          el('span', { text: r.title + (r.course ? ' (' + r.course + ')' : '') }),
          el('span', { class: 'muted', text: r.hours + ' ש׳' + (r.count > 1 ? ' · ' + r.count + ' מקטעים עם הפסקה' : '') })
        ]));
      });
      container.appendChild(box);
    });
  }

  function renderDraftNotes(plan) {
    var box = $('draft-notes');
    box.textContent = '';
    if (plan.shortfall.length) {
      var ul = el('ul');
      plan.shortfall.forEach(function (s) {
        ul.appendChild(el('li', { text: s.title + ': חסרות ' + s.hours + ' שעות (הגשה ' + formatDate(s.due) + ')' }));
      });
      box.appendChild(el('div', { class: 'note warn' }, [
        el('strong', { text: 'אין מספיק זמן לכל המשימות.' }),
        ul,
        el('div', { text: 'אפשרות 1: לאשר את התוכנית כפי שהיא (המשימות הדחופות קודמות). ' +
          'אפשרות 2: להוסיף זמן דרך הצ׳אט, למשל "הוסף 2 שעות ביום חמישי". הזמינות הקבועה לא תשתנה בלי שתבקש/י.' })
      ]));
    }
    if (plan.missingEstimate.length) {
      box.appendChild(el('div', { class: 'note info', text: 'משימות בלי משך משוער לא נכנסו לתוכנית: ' +
        plan.missingEstimate.map(function (m) { return m.title; }).join(', ') + '. הוסיפו משך בעריכה.' }));
    }
    if (!plan.totalPlanned && !plan.shortfall.length && !plan.missingEstimate.length) {
      box.appendChild(el('div', { class: 'note info', text: 'אין משימות פתוחות לתכנן, או שאין זמן פנוי בטווח.' }));
    }
  }

  function addMsg(text, who) {
    var log = $('chat-log');
    log.appendChild(el('div', { class: 'msg ' + who, text: text }));
    log.scrollTop = log.scrollHeight;
  }

  function currentMode() {
    var r = document.querySelector('input[name="mode"]:checked');
    return r ? r.value : 'week';
  }

  function propose(options, intro) {
    var opts = options || Object.assign(P.defaultOptions(), { mode: currentMode() });
    var plan = P.buildPlan(state.tasks, state.availability, opts, today());
    draft = { plan: plan, options: opts };
    $('draft').hidden = false;
    renderDraftNotes(plan);
    renderDays($('draft-days'), plan);
    document.querySelector('input[name="mode"][value="' + opts.mode + '"]').checked = true;
    if (intro) {
      $('chat-log').textContent = '';
      addMsg(intro, 'bot');
    }
  }

  function onChat(e) {
    e.preventDefault();
    if (!draft) return;
    var text = $('chat-input').value.trim();
    if (!text) return;
    addMsg(text, 'user');
    $('chat-input').value = '';
    var res = Chat.applyCommand(text, draft.options);
    addMsg(res.reply, 'bot');
    if (res.ok) propose(res.options);
  }

  function approve() {
    if (!draft) return;
    state.approvedPlan = Object.assign({}, draft.plan, { approvedAt: new Date().toISOString() });
    draft = null;
    $('draft').hidden = true;
    save();
    render();
  }

  function reject() {
    draft = null;
    $('draft').hidden = true;
  }

  function renderApproved() {
    var plan = state.approvedPlan;
    $('approved').hidden = !plan;
    if (!plan) return;
    var at = new Date(plan.approvedAt);
    $('approved-meta').textContent = '(' + (plan.mode === 'day' ? 'יומית' : 'שבועית') + ', אושרה ' +
      at.getDate() + '.' + (at.getMonth() + 1) + ')';
    renderDays($('approved-days'), plan);
  }

  function renderReplan() {
    var missed = P.missedSessions(state.approvedPlan, state.tasks, today());
    var banner = $('replan-banner');
    banner.hidden = !missed.length;
    if (!missed.length) return;
    var titles = missed.map(function (m) { return m.title; }).filter(function (t, i, a) { return a.indexOf(t) === i; });
    $('replan-text').textContent = 'יש מקטעי למידה שעברו והמשימות עדיין לא הושלמו: ' + titles.join(', ') + '.';
  }

  function renderSummary() {
    var t0 = today();
    var open = state.tasks.filter(function (t) { return t.status !== 'done'; });
    $('stat-today').textContent = open.filter(function (t) { return t.due === t0; }).length;
    $('stat-overdue').textContent = open.filter(function (t) { return P.isOverdue(t, t0); }).length;
    $('stat-hours').textContent = state.approvedPlan ? state.approvedPlan.totalPlanned : 0;
  }

  /* Experimental charts: shown/hidden and table view are per-browser preferences. */
  var PREF_KEY = 'studeniqu.chartsPrefs';
  function chartPrefs() {
    try { return Object.assign({ show: true, table: false }, JSON.parse(localStorage.getItem(PREF_KEY)) || {}); }
    catch (e) { return { show: true, table: false }; }
  }
  function renderCharts() {
    if (!window.Studeniqu.charts) return;
    var prefs = chartPrefs();
    $('charts-toggle').checked = prefs.show;
    $('charts-table').checked = prefs.table;
    $('charts-body').hidden = !prefs.show;
    $('charts-table').disabled = !prefs.show;
    if (prefs.show) window.Studeniqu.charts.renderAll(state, today(), prefs.table);
  }
  function setChartPref(key, value) {
    var prefs = chartPrefs();
    prefs[key] = value;
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
    renderCharts();
  }

  function render() {
    renderSummary();
    renderTasks();
    renderApproved();
    renderReplan();
    renderCharts();
  }

  /* ---------- wiring ---------- */

  $('task-form').addEventListener('submit', onSubmitTask);
  $('task-cancel').addEventListener('click', resetForm);
  $('task-search').addEventListener('input', renderTasks);
  $('propose-btn').addEventListener('click', function () {
    propose(null, 'זו ההצעה שלי לפי המועדים והזמינות שלך. אפשר לבקש שינוי כאן.\n' + Chat.HELP);
  });
  $('replan-btn').addEventListener('click', function () {
    propose(null, 'הכנתי הצעה לתכנון מחדש מהיום, לפי מה שנשאר. היא תחליף את התוכנית הקודמת רק אם תאשר/י.');
    $('draft').scrollIntoView({ behavior: 'smooth' });
  });
  $('chat-form').addEventListener('submit', onChat);
  $('approve-btn').addEventListener('click', approve);
  $('reject-btn').addEventListener('click', reject);
  $('charts-toggle').addEventListener('change', function (e) { setChartPref('show', e.target.checked); });
  $('charts-table').addEventListener('change', function (e) { setChartPref('table', e.target.checked); });

  /* ---------- data: sample, export, import ---------- */

  var Data = window.Studeniqu.data;

  function dataMsg(text) { $('data-msg').textContent = text; }

  function replaceState(next) {
    state = next;
    draft = null;
    $('draft').hidden = true;
    resetForm();
    save();
    renderAvailability();
    render();
  }

  $('sample-btn').addEventListener('click', function () {
    if (state.tasks.length && !confirm('נתוני הדוגמה יחליפו את הנתונים הקיימים בדפדפן. להמשיך?')) return;
    replaceState(Data.fromSample(window.Studeniqu.sampleData, today()));
    dataMsg('נטענו נתוני דוגמה.');
  });

  $('export-btn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(Data.toExport(state), null, 2)], { type: 'application/json' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'studeniqu-' + today() + '.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    dataMsg('הנתונים יוצאו לקובץ.');
  });

  $('import-btn').addEventListener('click', function () { $('import-file').click(); });

  $('import-file').addEventListener('change', function (e) {
    var file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var next = Data.parseImport(JSON.parse(reader.result));
        if (state.tasks.length && !confirm('הייבוא יחליף את הנתונים הקיימים (' + next.tasks.length + ' משימות בקובץ). להמשיך?')) return;
        replaceState(next);
        dataMsg('יובאו ' + next.tasks.length + ' משימות.');
      } catch (err) {
        dataMsg('הייבוא נכשל: ' + (err instanceof SyntaxError ? 'הקובץ אינו JSON תקין.' : err.message));
      }
    };
    reader.readAsText(file);
  });

  renderAvailability();
  render();
})();
