#!/usr/bin/env node

// Node 包装脚本（简化版）：
// 1. 调用 JXA 脚本，从 Apple Notes 读取数据（stdout 输出纯文本）。
// 2. 不做任何解析，原样写入当前目录下的 notes-YYYYMMdd-hhmmss.log 文件。
// 3. 在终端输出简单的耗时与文件路径信息。

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';

const execFileAsync = promisify(execFile);

function formatTimestamp(date) {
  const pad = (n) => (n < 10 ? '0' + n : String(n));
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  return `${year}${month}${day}${hour}${minute}${second}`;
}

async function main() {
  const args = process.argv.slice(2); // 可选：目标文件夹名称

  const scriptPath = resolve('scripts/export-apple-notes.jxa.js');

  console.log('[VeinSight] 调用 osascript 导出 Apple Notes…');
  const start = Date.now();

  try {
    const { stdout, stderr } = await execFileAsync('osascript', ['-l', 'JavaScript', scriptPath, ...args], {
      maxBuffer: 20 * 1024 * 1024 // 20MB 缓冲，避免大量笔记时溢出
    });

    if (stderr && stderr.trim()) {
      // JXA 脚本目前不会往 stderr 写东西，这里仅作防御性输出
      console.error('[VeinSight] osascript stderr:', stderr.trim());
    }

    const timestamp = formatTimestamp(new Date());
    const fileName = `notes-${timestamp}.log`;
    const outPath = resolve(fileName);
    console.log(`[VeinSight] 写入原始导出日志：${outPath}`);

    // 注意：在 JXA 中，console.log 默认输出到 stderr，
    // 而不是 stdout。我们将 stdout 和 stderr 拼接后一起写入日志，
    // 这样你在终端里看到的内容，在 .log 文件中也能完整保留。
    const combined = stdout + (stderr || '');
    await fs.writeFile(outPath, combined, 'utf8');

    const durationMs = Date.now() - start;
    const durationSec = (durationMs / 1000).toFixed(2);
    console.log(`[VeinSight] 整体耗时：${durationSec} 秒（约 ${durationMs} ms）`);
  } catch (err) {
    console.error('[VeinSight] 导出失败：', err.message || err);
    process.exit(1);
  }
}

main();
