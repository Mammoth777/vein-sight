ObjC.import('stdlib');

function run(argv) {
  const targetFolderName = argv && argv.length > 0 ? String(argv[0]) : null;
  const Notes = Application('Notes');
  Notes.includeStandardAdditions = true;

  const accounts = Notes.accounts();
  accounts.forEach(function (account) {
    const accountName = String(account.name());
    const folders = account.folders();

    folders.forEach(function (folder) {
      const folderName = String(folder.name());
      if (targetFolderName && folderName !== targetFolderName) return;

      console.log('测试文件夹：' + folderName);

      // 关键行：只做最小访问
      const notes = folder.notes();
      notes.forEach(function (note) {
        // 这里不需要实际处理 note，只是为了触发访问
        console.log(note.name())
      });
      console.log('notes 对象类型：' + Object.prototype.toString.call(notes));
      console.log('notes.length = ' + notes.length); // 这里很可能就会触发错误
    });
  });
}