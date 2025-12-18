// 简单的 Node 服务，用于从前端接收 Notes JSON，转发给本地 Ollama 做分析。
// 启动方式：
//   node server.js
// 依赖：需要本机已安装并运行 `ollama serve`（默认 http://127.0.0.1:11434）。

import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 8787;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600'
    });
    return res.end();
  }

  if (req.method === 'POST' && url.pathname === '/analyze') {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      // 简单防御：限制 body 大小
      if (raw.length > 2 * 1024 * 1024) {
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(raw || '{}');
        const notes = Array.isArray(payload.notes) ? payload.notes : [];

        if (!notes.length) {
          return sendJson(res, 400, { error: 'notes 数组为空，请确认已正确上传导出的 JSON。' });
        }

        // 为避免上下文过大，这里只取前 N 条做 MVP 分析。
        const MAX_NOTES = 20;
        const selected = notes.slice(0, MAX_NOTES);

        const plainText = selected
          .map((n, idx) => {
            const title = n.title || `记录 ${idx + 1}`;
            const date = n.creationDate || n.modificationDate || '';
            const body = (n.body || '').replace(/\s+/g, ' ').trim();
            return `# 记录 ${idx + 1}\n标题: ${title}\n时间: ${date}\n内容: ${body}`;
          })
          .join('\n\n');

        const systemPrompt = [
          '你是一名温和的观察者，结合数据层和心理层的视角，',
          '基于用户最近一批日记/备忘录，给出一段简短的整体观察。',
          '只做趋势和模式的描述，不做任何医学诊断或人格判断。',
          '使用中文回答，控制在 300 字以内。'
        ].join('');

        const userPrompt = [
          '以下是用户从 Apple Notes 导出的若干条记录（已按时间大致排序）：\n\n',
          plainText,
          '\n\n请你：',
          '\n1. 用几句话概括这批记录的大致氛围（可以提到情绪、精力、主题）。',
          '\n2. 指出 1-3 个反复出现的主题或关注点。',
          '\n3. 提出 1-2 个温和的反思问题，供用户之后写日记时参考。',
          '\n注意：不要使用任何诊断性词汇，不要下结论式的人格评价。'
        ].join('');

        const ollamaResponse = await fetch(OLLAMA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            stream: false
          })
        });

        if (!ollamaResponse.ok) {
          const text = await ollamaResponse.text();
          return sendJson(res, 502, { error: '调用 Ollama 失败', detail: text });
        }

        const data = await ollamaResponse.json();
        const content = data && data.message && data.message.content
          ? data.message.content
          : JSON.stringify(data);

        return sendJson(res, 200, { result: content });
      } catch (err) {
        console.error(err);
        return sendJson(res, 500, { error: '服务器内部错误', detail: String(err) });
      }
    });

    return;
  }

  // 其他路径
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`VeinSight backend listening on http://localhost:${PORT}`);
  console.log(`Forwarding /analyze to Ollama at ${OLLAMA_URL} (model: ${OLLAMA_MODEL})`);
});
