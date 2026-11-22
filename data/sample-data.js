/*
 * STUDENIQU sample data: a 2nd-year student with 5 courses during a busy week.
 * Dates are relative ("dueInDays" from today) so the sample always fits the current week.
 * Loaded as a classic script so it also works when index.html is opened from disk.
 */
(function (root) {
  'use strict';

  var sampleData = {
    version: 1,
    description: 'סטודנטית שנה ב׳, 5 קורסים, שבוע עמוס עם 2 מטלות, בוחן ועבודה סמינריונית',
    courses: [
      { id: 'ds', name: 'מבני נתונים' },
      { id: 'stat', name: 'סטטיסטיקה' },
      { id: 'soc', name: 'סוציולוגיה' },
      { id: 'phys', name: 'פיזיקה' },
      { id: 'hist', name: 'היסטוריה' }
    ],
    availability: { 0: 3, 1: 2, 2: 3, 3: 2, 4: 3, 5: 4, 6: 0 },
    tasks: [
      {
        id: 'sample-1', title: 'תרגיל 3', courseId: 'ds', dueInDays: 2, estHours: 6, status: 'doing',
        subtasks: [
          { title: 'שאלה 1', done: true },
          { title: 'שאלה 2', done: false },
          { title: 'שאלה 3', done: false }
        ]
      },
      { id: 'sample-2', title: 'בוחן אמצע', courseId: 'stat', dueInDays: 4, estHours: 5, status: 'todo', subtasks: [] },
      {
        id: 'sample-3', title: 'עבודה סמינריונית', courseId: 'soc', dueInDays: 6, estHours: 12, status: 'todo',
        subtasks: [
          { title: 'סקירת ספרות', done: false },
          { title: 'כתיבת מבוא', done: false },
          { title: 'ניתוח ממצאים', done: false },
          { title: 'סיכום ומקורות', done: false }
        ]
      },
      { id: 'sample-4', title: 'דוח מעבדה', courseId: 'phys', dueInDays: -1, estHours: 2, status: 'todo', subtasks: [] },
      { id: 'sample-5', title: 'קריאת פרק 4', courseId: 'hist', dueInDays: 3, estHours: null, status: 'todo', subtasks: [] },
      { id: 'sample-6', title: 'תרגיל 2', courseId: 'ds', dueInDays: -5, estHours: 4, status: 'done', subtasks: [] }
    ]
  };

  root.Studeniqu = root.Studeniqu || {};
  root.Studeniqu.sampleData = sampleData;
})(window);
