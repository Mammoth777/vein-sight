// 使用方式（在终端，在项目根目录或任意目标目录下）：
//   osascript -l JavaScript scripts/export-reminders.jxa.js
//
// 功能：
//   导出最近 3 天内的提醒事项，输出为纯文本到 stdout，
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

  printErr('开始导出最近 3 天的提醒事项…');

  const RemindersApp = Application('Reminders');
  RemindersApp.includeStandardAdditions = true;

  let reminderCounter = 0;

  const reminderLists = RemindersApp.lists();
  reminderLists.forEach(function (list) {
    const listName = String(list.name());
    const reminders = list.reminders();

    reminders.forEach(function (r) {
      let dueDate;
      try {
        dueDate = r.dueDate();
      } catch (e) {
        dueDate = null;
      }

      let jsDue = null;
      if (dueDate) {
        jsDue = new Date(dueDate);
      }

      // 如果没有到期日，则跳过（你也可以按需改成导出所有）
      if (!jsDue) return;

      if (jsDue < threeDaysAgo || jsDue > now) return;

      reminderCounter++;

      const title = String(r.name ? r.name() : '');
      const body = (function () {
        try {
          return String(r.body ? r.body() : '');
        } catch (e) {
          return '';
        }
      })();
      const completed = (function () {
        try {
          return !!r.completed();
        } catch (e) {
          return false;
        }
      })();
      const completedDate = (function () {
        try {
          const d = r.completionDate && r.completionDate();
          return d ? new Date(d).toISOString() : '';
        } catch (e) {
          return '';
        }
      })();

      print('-----');
      print('TYPE: REMINDER');
      print('ID: ' + String(r.id ? r.id() : ''));
      print('TITLE: ' + title);
      print('LIST: ' + listName);
      print('DUE: ' + (jsDue ? jsDue.toISOString() : ''));
      print('COMPLETED: ' + (completed ? 'true' : 'false'));
      print('COMPLETED_AT: ' + completedDate);
      print('NOTES:');
      if (body) {
        print(body);
      }

      if (reminderCounter % 10 === 0) {
        printErr('  已导出提醒事项数量: ' + reminderCounter);
      }
    });
  });

  const endTime = new Date();
  const exportedAt = endTime.toISOString();

  print('');
  print('EXPORTED_AT: ' + exportedAt);
  print('REMINDER_COUNT: ' + reminderCounter);

  printErr('导出完成：提醒事项 ' + reminderCounter + ' 条。');
}
