// 使用方式（在终端，在项目根目录或任意目标目录下）：
//   osascript -l JavaScript scripts/export-calendar.jxa.js
//
// 功能：
//   导出最近 3 天内的日历事件，输出为纯文本到 stdout，
//   由 npm script 或 shell 重定向到 .log 文件。
//   输出格式与 export-apple-notes.jxa.js 类似，使用 "-----" 分隔每条记录。

ObjC.import('stdlib');
ObjC.import('Foundation');

// 输出到 stdout
const print = function (text) {
  const str = String(text) + "\n";
  const data = $.NSString.alloc.initWithString(str)
    .dataUsingEncoding($.NSUTF8StringEncoding);
  $.NSFileHandle.fileHandleWithStandardOutput.writeData(data);
};

// 输出到 stderr（进度、调试信息）
const printErr = function (text) {
  const str = String(text) + "\n";
  const data = $.NSString.alloc.initWithString(str)
    .dataUsingEncoding($.NSUTF8StringEncoding);
  $.NSFileHandle.fileHandleWithStandardError.writeData(data);
};

function run(argv) {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  printErr('开始导出最近 3 天的日历事件…');

  const CalendarApp = Application('Calendar');
  CalendarApp.includeStandardAdditions = true;

  let eventCounter = 0;

  const calendars = CalendarApp.calendars();
  printErr('找到日历数量: ' + calendars.length);
  calendars.forEach(function (cal) {
    const calName = String(cal.name());
    printErr('处理日历: ' + calName);

    // 使用 whose 在 Calendar 侧按时间范围先筛一遍，减少全量拉取
    const events = cal.events.whose({
      startDate: {
        '>=': threeDaysAgo,
        '<=': now
      }
    })();
    printErr('  符合时间范围的事件数量: ' + events.length);
    events.forEach(function (ev) {
      // 有些事件可能沒有开始時間，防御性处理
      let startDate, endDate;
      try {
        startDate = ev.startDate();
        endDate = ev.endDate();
      } catch (e) {
        return;
      }

      if (!startDate) return;

      // 尝试安全地获取标题用于调试输出，避免属性不存在时报错
      let debugTitle = '';
      try {
        debugTitle = String(ev.summary ? ev.summary() : '');
      } catch (e) {
        debugTitle = '';
      }
      printErr('    处理事件…' + debugTitle);

      const jsStart = new Date(startDate);

      eventCounter++;

      const jsEnd = endDate ? new Date(endDate) : null;
      const title = String(ev.summary ? ev.summary() : ev.title ? ev.title() : '');
      const location = (function () {
        try {
          return String(ev.location ? ev.location() : '');
        } catch (e) {
          return '';
        }
      })();
      const notes = (function () {
        try {
          return String(ev.description ? ev.description() : ev.notes ? ev.notes() : '');
        } catch (e) {
          return '';
        }
      })();

      print('-----');
      print('TYPE: CALENDAR_EVENT');
      print('ID: ' + String(ev.uid ? ev.uid() : ''));
      print('TITLE: ' + title);
      print('CALENDAR: ' + calName);
      print('START: ' + jsStart.toISOString());
      print('END: ' + (jsEnd ? jsEnd.toISOString() : ''));
      print('LOCATION: ' + location);
      print('NOTES:');
      if (notes) {
        print(notes);
      }

      if (eventCounter % 10 === 0) {
        printErr('  已导出日历事件数量: ' + eventCounter);
      }
    });
  });

  const endTime = new Date();
  const exportedAt = endTime.toISOString();

  print('');
  print('EXPORTED_AT: ' + exportedAt);
  print('EVENT_COUNT: ' + eventCounter);

  printErr('导出完成：日历事件 ' + eventCounter + ' 条。');
}
