/* STUDENIQU search: filter tasks by title or course. Pure, no DOM. */
(function (root) {
  'use strict';

  function normalize(text) {
    return String(text || '').trim().toLowerCase();
  }

  /*
   * Returns the tasks whose title or course contains the query.
   * An empty query returns all tasks. The input array is not changed.
   */
  function filterTasks(tasks, query) {
    var q = normalize(query);
    if (!q) return tasks.slice();
    return tasks.filter(function (t) {
      return normalize(t.title).indexOf(q) !== -1 || normalize(t.course).indexOf(q) !== -1;
    });
  }

  root.Studeniqu = root.Studeniqu || {};
  root.Studeniqu.search = { filterTasks: filterTasks };
})(window);
