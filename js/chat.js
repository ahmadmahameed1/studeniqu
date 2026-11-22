/* STUDENIQU chat: turns Hebrew commands into changes to the plan options. Pure, no DOM. */
(function (root) {
  'use strict';

  var DAY_WORDS = [
    ['ראשון', 'א'], ['שני', 'ב'], ['שלישי', 'ג'], ['רביעי', 'ד'],
    ['חמישי', 'ה'], ['שישי', 'ו'], ['שבת', 'ש']
  ];

  var HELP =
    'אפשר לבקש:\n' +
    '• "בלי יום שישי": לא לתכנן ביום מסוים\n' +
    '• "בלי שישי ושבת" או "בלי סוף שבוע": כמה ימים בבת אחת\n' +
    '• "מקסימום 3 שעות ביום": להגביל את שעות הלמידה ביום\n' +
    '• "הוסף 2 שעות ביום חמישי": להוסיף זמן ליום מסוים (רק בתוכנית הזאת)\n' +
    '• "תוכנית יומית" או "תוכנית שבועית"\n' +
    '• "התחל מחדש": לבטל את כל השינויים';

  /* Every weekday mentioned in the text, in week order. Handles "ו"/"ב" prefixes and "סוף שבוע". */
  function findDays(text) {
    var found = [];
    for (var i = 0; i < DAY_WORDS.length; i++) {
      var full = DAY_WORDS[i][0], letter = DAY_WORDS[i][1];
      if (new RegExp('(^|[\\s"\'״׳,])ו?ב?(יום\\s+)?' + full + '($|[\\s.,!?])').test(text) ||
          new RegExp('יום\\s+' + letter + '[׳\']').test(text)) found.push(i);
    }
    if (/סוף\s*ה?שבוע|סופ["״]?ש(\s|$)/.test(text)) {
      [5, 6].forEach(function (d) { if (found.indexOf(d) === -1) found.push(d); });
      found.sort();
    }
    return found;
  }

  /* "יום שישי" for one day, "הימים שישי ושבת" / "הימים ראשון, שני ורביעי" for several. */
  function dayList(days, names) {
    var n = days.map(function (d) { return names[d]; });
    if (n.length === 1) return 'יום ' + n[0];
    return 'הימים ' + n.slice(0, -1).join(', ') + ' ו' + n[n.length - 1];
  }

  function findNumber(text) {
    var m = text.match(/(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : null;
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /*
   * Returns {ok, options, reply}. options is a new object; the input is not changed.
   */
  function applyCommand(text, options) {
    var t = String(text || '').trim();
    var opts = clone(options);
    var names = root.Studeniqu.planner.DAY_NAMES;

    if (!t) return { ok: false, options: opts, reply: HELP };

    if (/התחל מחדש|אפס/.test(t)) {
      var mode = opts.mode;
      opts = root.Studeniqu.planner.defaultOptions();
      opts.mode = mode;
      return { ok: true, options: opts, reply: 'ביטלתי את כל השינויים. הנה הצעה חדשה.' };
    }

    if (/יומית/.test(t)) {
      opts.mode = 'day';
      return { ok: true, options: opts, reply: 'עברתי לתוכנית יומית (היום בלבד).' };
    }
    if (/שבועית/.test(t)) {
      opts.mode = 'week';
      return { ok: true, options: opts, reply: 'עברתי לתוכנית שבועית (7 ימים מהיום).' };
    }

    if (/(מקסימום|לכל היותר|עד)\s*\d/.test(t) && /ביום|ליום/.test(t) && findDays(t).length === 0) {
      var max = findNumber(t);
      opts.maxPerDay = max;
      return { ok: true, options: opts, reply: 'הגבלתי ל-' + max + ' שעות למידה ביום לכל היותר.' };
    }

    if (/הוסף|תוסיף|להוסיף/.test(t)) {
      var hours = findNumber(t), addDays = findDays(t);
      if (hours == null || !addDays.length) {
        return { ok: false, options: opts, reply: 'לא הבנתי כמה שעות ובאיזה יום. לדוגמה: "הוסף 2 שעות ביום חמישי".' };
      }
      addDays.forEach(function (day) {
        opts.extraHours[day] = (Number(opts.extraHours[day]) || 0) + hours;
        var ex = opts.excludedDays.indexOf(day);
        if (ex !== -1) opts.excludedDays.splice(ex, 1);
      });
      var where = addDays.length === 1 ? 'ב' + dayList(addDays, names) : 'בכל אחד מ' + dayList(addDays, names);
      return { ok: true, options: opts, reply: 'הוספתי ' + hours + ' שעות ' + where + ' לתוכנית הזאת. הזמינות הקבועה שלך לא השתנתה.' };
    }

    if (/בלי|ללא|לא ללמוד|פנוי/.test(t)) {
      var offDays = findDays(t);
      if (!offDays.length) {
        return { ok: false, options: opts, reply: 'לא הבנתי איזה יום. לדוגמה: "בלי יום שישי".' };
      }
      offDays.forEach(function (d) { if (opts.excludedDays.indexOf(d) === -1) opts.excludedDays.push(d); });
      return { ok: true, options: opts, reply: 'הוצאתי את ' + dayList(offDays, names) + ' מהתוכנית.' };
    }

    return { ok: false, options: opts, reply: 'לא הבנתי את הבקשה.\n' + HELP };
  }

  root.Studeniqu = root.Studeniqu || {};
  root.Studeniqu.chat = { applyCommand: applyCommand, HELP: HELP };
})(window);
