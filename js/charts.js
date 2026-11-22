/*
 * STUDENIQU charts (EXPERIMENTAL).
 * chartData() is pure and tested; the render* functions draw inline SVG (no libraries).
 */
(function (root) {
  'use strict';

  var P = root.Studeniqu.planner;
  var SVG = 'http://www.w3.org/2000/svg';
  var STATUS_LABELS = { todo: 'לביצוע', doing: 'בתהליך', done: 'הושלם' };

  function round(n) { return Math.round(n * 100) / 100; }

  /* Pure: numbers behind the three charts. */
  function chartData(state, todayISO) {
    var plan = state.approvedPlan;
    var hoursByDay = plan ? plan.days.map(function (d) {
      var used = d.sessions.reduce(function (s, x) { return s + x.hours; }, 0);
      return { date: d.date, label: P.DAY_NAMES[P.weekday(d.date)], planned: round(used), capacity: d.capacity };
    }) : [];

    var tasksByStatus = ['todo', 'doing', 'done'].map(function (k) {
      return { key: k, label: STATUS_LABELS[k], value: state.tasks.filter(function (t) { return t.status === k; }).length };
    });

    var byCourse = {};
    state.tasks.forEach(function (t) {
      var h = P.remainingHours(t);
      if (h <= 0) return;
      var name = t.course || 'ללא קורס';
      byCourse[name] = round((byCourse[name] || 0) + h);
    });
    var remainingByCourse = Object.keys(byCourse)
      .map(function (k) { return { label: k, value: byCourse[k] }; })
      .sort(function (a, b) { return b.value - a.value; });

    var open = state.tasks.filter(function (t) { return t.status !== 'done'; });
    return {
      hoursByDay: hoursByDay,
      tasksByStatus: tasksByStatus,
      remainingByCourse: remainingByCourse,
      overdue: open.filter(function (t) { return P.isOverdue(t, todayISO); }).length
    };
  }

  /* ---------- rendering ---------- */

  function svgEl(tag, attrs, text) {
    var n = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    var steps = [1, 2, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200];
    for (var i = 0; i < steps.length; i++) if (steps[i] >= v) return steps[i];
    return Math.ceil(v / 50) * 50;
  }

  /* Rounded-top bar path anchored to the baseline (4px data-end radius). */
  function barPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }

  /* Rounded-end horizontal bar growing right-to-left from the baseline at xEnd. */
  function hBarPath(xEnd, y, w, h, r) {
    r = Math.min(r, h / 2, w);
    var x = xEnd - w;
    return 'M' + xEnd + ',' + y + 'H' + (x + r) + 'Q' + x + ',' + y + ' ' + x + ',' + (y + r) +
      'V' + (y + h - r) + 'Q' + x + ',' + (y + h) + ' ' + (x + r) + ',' + (y + h) + 'H' + xEnd + 'Z';
  }

  /* Vertical bars, first item on the right (RTL). */
  function renderColumns(container, items, unit) {
    container.textContent = '';
    var W = 360, H = 190, top = 16, bottom = 28, left = 8, right = 30;
    var plotW = W - left - right, plotH = H - top - bottom;
    var max = niceMax(Math.max.apply(null, items.map(function (d) { return Math.max(d.planned, d.capacity); })));
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });

    [0, max / 2, max].forEach(function (v) {
      var y = top + plotH - (v / max) * plotH;
      svg.appendChild(svgEl('line', { x1: left, x2: left + plotW, y1: y, y2: y, class: v ? 'grid' : 'baseline' }));
      svg.appendChild(svgEl('text', { x: W - 4, y: y + 4, class: 'tick', 'text-anchor': 'end' }, String(round(v))));
    });

    var slot = plotW / items.length;
    var bw = Math.min(28, slot - 8);
    items.forEach(function (d, i) {
      var cx = left + plotW - slot * (i + 0.5);
      var g = svgEl('g', { class: 'mark', tabindex: '0' });
      g.appendChild(svgEl('title', null, d.label + ': ' + d.planned + ' ' + unit + ' מתוך ' + d.capacity + ' פנויות'));
      g.appendChild(svgEl('rect', { x: cx - slot / 2, y: top, width: slot, height: plotH, class: 'hit' }));
      if (d.capacity > 0) {
        var ch = (d.capacity / max) * plotH;
        g.appendChild(svgEl('rect', { x: cx - bw / 2, y: top + plotH - ch, width: bw, height: ch, rx: 4, class: 'capacity' }));
      }
      if (d.planned > 0) {
        var h = (d.planned / max) * plotH;
        g.appendChild(svgEl('path', { d: barPath(cx - bw / 2, top + plotH - h, bw, h, 4), class: 'bar' }));
      }
      g.appendChild(svgEl('text', { x: cx, y: H - 8, class: 'tick', 'text-anchor': 'middle' }, d.label));
      svg.appendChild(g);
    });
    container.appendChild(svg);
  }

  /* Horizontal bars with labels on the right (RTL) and the value at the bar end. */
  function renderBars(container, items, unit) {
    container.textContent = '';
    var rowH = 26, top = 4, labelW = 110, valueW = 44, W = 360;
    var H = top * 2 + rowH * items.length;
    var xEnd = W - labelW;
    var plotW = xEnd - valueW;
    var max = Math.max.apply(null, items.map(function (d) { return d.value; })) || 1;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });

    items.forEach(function (d, i) {
      var y = top + i * rowH;
      var g = svgEl('g', { class: 'mark', tabindex: '0' });
      g.appendChild(svgEl('title', null, d.label + ': ' + d.value + ' ' + unit));
      g.appendChild(svgEl('rect', { x: 0, y: y, width: W, height: rowH, class: 'hit' }));
      g.appendChild(svgEl('text', { x: W - 4, y: y + rowH / 2 + 4, class: 'label', 'text-anchor': 'end' }, d.label));
      var w = (d.value / max) * plotW;
      if (w > 0) g.appendChild(svgEl('path', { d: hBarPath(xEnd - 6, y + 5, w, rowH - 10, 4), class: 'bar' }));
      g.appendChild(svgEl('text', { x: xEnd - 6 - w - 6, y: y + rowH / 2 + 4, class: 'value', 'text-anchor': 'end' }, String(d.value)));
      svg.appendChild(g);
    });
    svg.appendChild(svgEl('line', { x1: xEnd - 6, x2: xEnd - 6, y1: top, y2: H - top, class: 'baseline' }));
    container.appendChild(svg);
  }

  function renderTable(container, headers, rows) {
    container.textContent = '';
    var table = document.createElement('table');
    table.className = 'chart-table';
    var tr = document.createElement('tr');
    headers.forEach(function (h) { var th = document.createElement('th'); th.textContent = h; tr.appendChild(th); });
    table.appendChild(tr);
    rows.forEach(function (r) {
      var row = document.createElement('tr');
      r.forEach(function (c) { var td = document.createElement('td'); td.textContent = c; row.appendChild(td); });
      table.appendChild(row);
    });
    container.appendChild(table);
  }

  function empty(container, text) {
    container.textContent = '';
    var p = document.createElement('p');
    p.className = 'muted';
    p.textContent = text;
    container.appendChild(p);
  }

  /* Render all charts into the elements with the given ids. */
  function renderAll(state, todayISO, asTable) {
    var data = chartData(state, todayISO);
    var hours = document.getElementById('chart-hours');
    var status = document.getElementById('chart-status');
    var course = document.getElementById('chart-course');

    if (!data.hoursByDay.length) empty(hours, 'אין עדיין תוכנית מאושרת.');
    else if (asTable) renderTable(hours, ['יום', 'שעות מתוכננות', 'שעות פנויות'],
      data.hoursByDay.map(function (d) { return [d.label + ' ' + d.date.slice(8) + '.' + Number(d.date.slice(5, 7)), d.planned, d.capacity]; }));
    else renderColumns(hours, data.hoursByDay, 'שעות');

    if (!state.tasks.length) empty(status, 'אין עדיין משימות.');
    else if (asTable) renderTable(status, ['סטטוס', 'משימות'], data.tasksByStatus.map(function (d) { return [d.label, d.value]; }));
    else renderBars(status, data.tasksByStatus, 'משימות');

    if (!data.remainingByCourse.length) empty(course, 'אין שעות למידה שנותרו (או שחסר משך משוער).');
    else if (asTable) renderTable(course, ['קורס', 'שעות שנותרו'], data.remainingByCourse.map(function (d) { return [d.label, d.value]; }));
    else renderBars(course, data.remainingByCourse, 'שעות');

    return data;
  }

  root.Studeniqu.charts = { chartData: chartData, renderAll: renderAll };
})(window);
