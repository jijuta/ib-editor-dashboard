#!/usr/bin/env node
/**
 * MCP_SERVERS_MANUAL.md를 HTML로 변환
 */

import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

const MD_FILE = path.join(process.cwd(), 'MCP_SERVERS_MANUAL.md');
const HTML_FILE = path.join(process.cwd(), 'public/reports/MCP_SERVERS_MANUAL.html');

async function convertToHTML() {
  console.log('📄 MD 파일 읽기:', MD_FILE);

  const mdContent = fs.readFileSync(MD_FILE, 'utf-8');

  console.log('🔄 Markdown → HTML 변환 중...');
  const bodyContent = await marked.parse(mdContent);

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP 서버 완전 매뉴얼 - DeFender X SIEM</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>

  <style>
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-code: #1e293b;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --border: #e2e8f0;
      --accent: #3b82f6;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --bg-code: #0f172a;
        --text-primary: #f1f5f9;
        --text-secondary: #cbd5e1;
        --border: #334155;
        --accent: #60a5fa;
      }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
      line-height: 1.7;
      color: var(--text-primary);
      background: var(--bg-secondary);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: var(--bg-primary);
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 1rem;
      color: var(--text-primary);
      border-bottom: 4px solid var(--accent);
      padding-bottom: 0.5rem;
    }

    h2 {
      font-size: 2rem;
      font-weight: 700;
      margin-top: 3rem;
      margin-bottom: 1rem;
      color: var(--text-primary);
      border-left: 6px solid var(--accent);
      padding-left: 1rem;
    }

    h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      color: var(--accent);
    }

    h4 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
      color: var(--text-primary);
    }

    pre {
      background: var(--bg-code) !important;
      border-radius: 0.5rem;
      padding: 1.5rem;
      overflow-x: auto;
      margin: 1.5rem 0;
      border: 1px solid var(--border);
    }

    code {
      background: var(--bg-secondary);
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.9em;
      color: #e11d48;
    }

    pre code {
      background: transparent;
      padding: 0;
      color: #e2e8f0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      background: var(--bg-primary);
      border: 1px solid var(--border);
    }

    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    th {
      background: var(--bg-secondary);
      font-weight: 600;
      color: var(--text-primary);
    }

    tr:hover {
      background: var(--bg-secondary);
    }

    blockquote {
      border-left: 4px solid var(--accent);
      padding-left: 1rem;
      margin: 1.5rem 0;
      color: var(--text-secondary);
      font-style: italic;
    }

    ul, ol {
      margin: 1rem 0;
      padding-left: 2rem;
    }

    li {
      margin: 0.5rem 0;
    }

    a {
      color: var(--accent);
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: border-color 0.2s;
    }

    a:hover {
      border-bottom-color: var(--accent);
    }

    .back-to-top {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--accent);
      color: white;
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .back-to-top.visible {
      opacity: 1;
    }

    html {
      scroll-behavior: smooth;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="mb-6 text-sm text-gray-500">
      <a href="/reports/" class="hover:text-blue-600">← 문서 포털</a> |
      <a href="/" class="hover:text-blue-600">홈으로</a> |
      <span>생성일: ${new Date().toLocaleString('ko-KR')}</span>
    </div>

    ${bodyContent}

    <hr class="my-8 border-gray-300">

    <div class="text-center text-sm text-gray-500">
      <p>🤖 DeFender X SIEM - AI 기반 보안 인시던트 분석 시스템</p>
      <p>이 문서는 <code>MCP_SERVERS_MANUAL.md</code>에서 자동 생성되었습니다.</p>
      <p>버전: 1.0 | 마지막 업데이트: ${new Date().toLocaleDateString('ko-KR')}</p>
    </div>
  </div>

  <div class="back-to-top" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">
    ↑
  </div>

  <script>
    window.addEventListener('scroll', () => {
      const backToTop = document.querySelector('.back-to-top');
      if (window.scrollY > 300) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    });

    if (window.Prism) {
      Prism.highlightAll();
    }

    document.querySelectorAll('h2, h3, h4').forEach(heading => {
      const id = heading.textContent
        .toLowerCase()
        .replace(/[^\w\s가-힣]/g, '')
        .replace(/\s+/g, '-');
      heading.id = id;
      heading.style.cursor = 'pointer';
      heading.onclick = () => {
        window.location.hash = id;
      };
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(HTML_FILE, html, 'utf-8');

  const stats = fs.statSync(HTML_FILE);
  const sizeKB = (stats.size / 1024).toFixed(2);

  console.log('✅ HTML 파일 생성 완료!');
  console.log('   - 파일 경로:', HTML_FILE);
  console.log('   - 파일 크기:', sizeKB, 'KB');
  console.log('   - 웹 URL: http://localhost:40017/reports/MCP_SERVERS_MANUAL.html');
}

convertToHTML().catch(error => {
  console.error('❌ 변환 실패:', error);
  process.exit(1);
});
