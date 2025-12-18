// 使用方式（在终端，在项目根目录或任意目标目录下）：
//   osascript -l JavaScript scripts/export-apple-notes.jxa.js
// 可选参数：
//   osascript -l JavaScript scripts/export-apple-notes.jxa.js "目标文件夹名称"
// 不指定文件夹名称时，将导出所有账户下的所有笔记。
//
// 本脚本只负责从 Apple Notes 读取数据并以 JSON 形式输出到 stdout，
// 不直接写入文件。文件写入由 Node 脚本使用 fs 完成。
// 可以通过下方的 EXCLUDED_ACCOUNTS / EXCLUDED_FOLDERS 配置要排除的账户和文件夹。

ObjC.import('stdlib');
ObjC.import('Foundation');

// 定义重定向函数
const print = function(text) {
    const str = String(text) + "\n";
    const data = $.NSString.alloc.initWithString(str)
                  .dataUsingEncoding($.NSUTF8StringEncoding);
    $.NSFileHandle.fileHandleWithStandardOutput.writeData(data);
};

const printErr = function(text) {
    const str = String(text) + "\n";
    const data = $.NSString.alloc.initWithString(str)
                  .dataUsingEncoding($.NSUTF8StringEncoding);
    $.NSFileHandle.fileHandleWithStandardError.writeData(data);
}

// 可根据实际情况编辑：需要排除的账户和文件夹名称（区分大小写）。
const EXCLUDED_ACCOUNTS = [
  // 例如："本机上的“备忘录”",
];

const EXCLUDED_FOLDERS = [
  "Recently Deleted",
  "最近删除",
  // 例如："最近删除",
];

function run(argv) {

  const Notes = Application('Notes');
  Notes.includeStandardAdditions = true;

  const targetFolderName = argv && argv.length > 0 ? String(argv[0]) : null;

  const accounts = Notes.accounts();

  let noteCounter = 0;

  printErr('开始导出 Apple Notes …');

  accounts.forEach(function (account) {
    const accountName = String(account.name());
    if (EXCLUDED_ACCOUNTS.indexOf(accountName) !== -1) {
      return;
    }

    printErr('处理账户: ' + accountName);

    const folders = account.folders();

    folders.forEach(function (folder) {
      const folderName = String(folder.name());
      if (EXCLUDED_FOLDERS.indexOf(folderName) !== -1) {
        return;
      }
      if (targetFolderName && folderName !== targetFolderName) {
        return; // 跳过非目标文件夹
      }

      printErr('  处理文件夹: ' + folderName + '（账户: ' + accountName + '）');

      const rawNotes = folder.notes()

      rawNotes.forEach(function (note) {
        noteCounter++;
        const id = String(note.id());
        const title = String(note.name());
        const body = String(note.body());
        const creationDate = note.creationDate() ? note.creationDate().toString() : '';
        const modificationDate = note.modificationDate() ? note.modificationDate().toString() : '';
        const folderNameForNote = String(folder.name());
        const accountNameForNote = String(account.name());

        // 直接边遍历边输出一条完整记录
        print('-----');
        print('ID: ' + id);
        print('TITLE: ' + title);
        print('ACCOUNT: ' + accountNameForNote);
        print('FOLDER: ' + folderNameForNote);
        print('CREATED: ' + creationDate);
        print('MODIFIED: ' + modificationDate);
        print('SMART: false');
        print('BODY:');
        if (body) {
          print(body);
        }

        if (noteCounter % 10 === 0) {
          printErr('    已导出笔记数量: ' + noteCounter);
        }
      });
    });
  });

  const endTime = new Date();

  const exportedAt = endTime.toISOString();

  // 尾部元信息（汇总）
  print('');
  print('EXPORTED_AT: ' + exportedAt);
  print('NOTE_COUNT: ' + noteCounter);

  printErr('导出完成，总计笔记（含智能文件夹占位）: ' + noteCounter);
}
