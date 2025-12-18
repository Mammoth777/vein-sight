import './style.css'

const app = document.querySelector('#app')

app.innerHTML = `
  <div class="vs-container">
    <h1>VeinSight MVP</h1>
    <p class="vs-subtitle">本地 Apple Notes 导出 + Ollama 简单分析</p>

    <section class="vs-section">
      <h2>步骤 1：导出 Apple Notes</h2>
      <ol class="vs-steps">
        <li>在终端进入项目根目录。</li>
        <li>确保已授予“终端”访问“备忘录”的权限（首次运行时 macOS 会弹窗询问）。</li>
        <li>运行：<code>pnpm export:notes</code>（或 <code>npm run export:notes</code>），脚本会在当前目录生成 <code>notes-YYYYMMdd-hhmmss.json</code>。</li>
        <li>如果只想导出某个文件夹，可以手动执行：<code>osascript -l JavaScript scripts/export-apple-notes.jxa.js "文件夹名"</code>，同样会在当前目录生成时间戳文件。</li>
      </ol>
    </section>

    <section class="vs-section">
      <h2>步骤 2：上传导出的 JSON 并分析</h2>
      <div class="vs-upload">
        <input type="file" id="fileInput" accept="application/json" />
        <button id="analyzeBtn" disabled>发送到模型分析</button>
      </div>
      <p id="fileInfo" class="vs-hint"></p>
      <pre id="status" class="vs-status"></pre>
    </section>

    <section class="vs-section">
      <h2>步骤 3：查看简单分析结果</h2>
      <pre id="result" class="vs-result"></pre>
    </section>
  </div>
`

const fileInput = document.getElementById('fileInput')
const analyzeBtn = document.getElementById('analyzeBtn')
const statusEl = document.getElementById('status')
const resultEl = document.getElementById('result')
const fileInfoEl = document.getElementById('fileInfo')

let notesPayload = null

fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0]
  if (!file) {
    notesPayload = null
    analyzeBtn.disabled = true
    fileInfoEl.textContent = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const json = JSON.parse(reader.result)
      const notes = Array.isArray(json.notes) ? json.notes : []
      if (!notes.length) {
        throw new Error('JSON 中未找到 notes 数组')
      }
      notesPayload = { notes }
      analyzeBtn.disabled = false
      fileInfoEl.textContent = `已加载 ${notes.length} 条笔记（将取前 20 条用于 MVP 分析）`
      statusEl.textContent = ''
      resultEl.textContent = ''
    } catch (err) {
      notesPayload = null
      analyzeBtn.disabled = true
      fileInfoEl.textContent = ''
      statusEl.textContent = `解析 JSON 失败：${err.message}`
    }
  }
  reader.onerror = () => {
    notesPayload = null
    analyzeBtn.disabled = true
    fileInfoEl.textContent = ''
    statusEl.textContent = '读取文件出错'
  }

  reader.readAsText(file, 'utf-8')
})

analyzeBtn.addEventListener('click', async () => {
  if (!notesPayload) return

  statusEl.textContent = '正在调用本地模型进行分析…'
  resultEl.textContent = ''
  analyzeBtn.disabled = true

  try {
    const resp = await fetch('http://localhost:8787/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notesPayload)
    })

    if (!resp.ok) {
      const text = await resp.text()
      statusEl.textContent = `后端错误：${resp.status} ${resp.statusText}`
      resultEl.textContent = text
    } else {
      const data = await resp.json()
      statusEl.textContent = '分析完成'
      resultEl.textContent = data.result || JSON.stringify(data, null, 2)
    }
  } catch (err) {
    statusEl.textContent = `请求失败：${err.message}`
  } finally {
    analyzeBtn.disabled = !notesPayload
  }
})
