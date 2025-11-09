#!/usr/bin/env node
/**
 * Convert investigation Markdown to HTML
 * 기존 CLI가 생성한 마크다운 파일을 풍부한 HTML 보고서로 변환
 */

import { readFile, writeFile, copyFile } from 'fs/promises';
import path from 'path';
import { marked } from 'marked';

/**
 * 마크다운을 섹션별로 파싱
 */
function parseMarkdownSections(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {};

  // Split by ## headers
  const parts = markdown.split(/\n(?=## )/);

  for (const part of parts) {
    // Check if this part starts with ##
    if (part.trim().startsWith('##')) {
      const lines = part.split('\n');
      const titleLine = lines[0];
      const title = titleLine.replace(/^##\s*/, '').trim();
      const content = lines.slice(1).join('\n').trim();

      if (title) {
        sections[title] = content;
      }
    }
  }

  return sections;
}

/**
 * 메인 함수
 */
async function main() {
  const incidentId = process.argv[2];

  if (!incidentId) {
    console.error('Usage: npx tsx script/markdown-to-html.ts <incident_id>');
    process.exit(1);
  }

  try {
    console.log(`[MD2HTML] 🔄 Converting incident ${incidentId} to HTML...`);

    // 최신 마크다운 파일 찾기
    const { readdirSync } = await import('fs');
    const dir = path.join(process.cwd(), 'data', 'investigations');
    const files = readdirSync(dir)
      .filter(f => f.startsWith(`incident_${incidentId}_`) && f.endsWith('.md'))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error(`No markdown file found for incident ${incidentId}`);
    }

    // 가장 최신 파일 선택
    const latestFile = path.join(dir, files[0]);
    console.log(`[MD2HTML] 📄 Reading: ${latestFile}`);

    const markdown = await readFile(latestFile, 'utf-8');
    const sections = parseMarkdownSections(markdown);

    // HTML 생성
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Incident ${incidentId} - Full Investigation Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            font-size: 36px;
            margin-bottom: 20px;
            color: #667eea;
            border-bottom: 4px solid #667eea;
            padding-bottom: 15px;
        }
        h2 {
            font-size: 28px;
            margin: 40px 0 20px 0;
            color: #764ba2;
            border-left: 6px solid #764ba2;
            padding-left: 15px;
        }
        h3 {
            font-size: 22px;
            margin: 25px 0 15px 0;
            color: #555;
        }
        p {
            margin: 15px 0;
            line-height: 1.8;
        }
        pre {
            background: #f4f4f4;
            padding: 20px;
            border-radius: 6px;
            overflow-x: auto;
            border-left: 4px solid #667eea;
        }
        code {
            background: #f0f0f0;
            padding: 3px 8px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #667eea;
            color: white;
            font-weight: 600;
        }
        tr:hover {
            background: #f9f9f9;
        }
        ul, ol {
            margin: 15px 0 15px 30px;
        }
        li {
            margin: 8px 0;
            line-height: 1.6;
        }
        hr {
            margin: 40px 0;
            border: none;
            border-top: 2px solid #e0e0e0;
        }
        .badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            margin: 0 5px;
        }
        .badge.high { background: #ef4444; color: white; }
        .badge.medium { background: #fbbf24; color: #333; }
        .badge.low { background: #10b981; color: white; }
        .badge.false-positive { background: #10b981; color: white; }
        .badge.true-positive { background: #ef4444; color: white; }
        .section {
            margin: 30px 0;
            padding: 25px;
            background: #fafafa;
            border-radius: 8px;
            border-left: 5px solid #667eea;
        }
        .ai-section {
            background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
            border-left-color: #764ba2;
        }
        .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
        }
        .print-btn:hover {
            background: #5568d3;
        }
        @media print {
            .print-btn { display: none; }
            body { background: white; }
            .container { box-shadow: none; padding: 20px; }
        }
        strong {
            color: #667eea;
            font-weight: 600;
        }
        .content h3 {
            font-size: 20px;
            margin: 20px 0 10px 0;
            color: #667eea;
        }
        .content ul {
            list-style-type: disc;
            padding-left: 30px;
        }
        .content ol {
            list-style-type: decimal;
            padding-left: 30px;
        }
        .content table {
            border-collapse: collapse;
            margin: 15px 0;
        }
        .content th {
            background: #667eea;
            color: white;
        }
        .content td {
            border: 1px solid #ddd;
        }
        .content code {
            background: #f0f0f0;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 13px;
        }
        .content pre {
            background: #f4f4f4;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            border-left: 4px solid #667eea;
        }
        .content pre code {
            background: transparent;
            padding: 0;
        }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">📄 Print Report</button>

    <div class="container">
        <h1>🔍 Incident Investigation: ${incidentId}</h1>

        ${Object.entries(sections).map(([title, content]) => {
          const isAISection = title.includes('AI') || title.includes('분석');
          const htmlContent = marked.parse(content);
          return `
            <div class="section ${isAISection ? 'ai-section' : ''}">
              <h2>${title.replace(/🤖|📊|✅|📋|🔒|🗂️|🌐|⚙️/g, '')}</h2>
              <div class="content">${htmlContent}</div>
            </div>
          `;
        }).join('')}

        <hr>
        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 40px;">
            <p>Generated by Incident Investigation System</p>
            <p>${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;

    // HTML 파일 저장
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const filename = `incident_${incidentId}_${timestamp}.html`;
    const filepath = path.join(process.cwd(), 'public', 'reports', filename);

    await writeFile(filepath, html, 'utf-8');
    console.log(`[MD2HTML] ✅ HTML saved: ${filepath}`);
    console.log(`[MD2HTML] 🌐 Access: http://localhost:40017/reports/${filename}`);

    // JSON 파일도 복사
    const jsonFiles = readdirSync(dir)
      .filter(f => f.startsWith(`incident_${incidentId}_`) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (jsonFiles.length > 0) {
      const latestJson = path.join(dir, jsonFiles[0]);
      const jsonFilename = filename.replace('.html', '.json');
      const jsonDest = path.join(process.cwd(), 'public', 'reports', jsonFilename);
      await copyFile(latestJson, jsonDest);
      console.log(`[MD2HTML] 📄 JSON copied: ${jsonDest}`);
    }

  } catch (error) {
    console.error('[MD2HTML] ❌ Error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
