# Block Editor 개선 계획 및 대시보드 통합 방안

## 목차
1. [현재 상태 분석](#현재-상태-분석)
2. [개선 아이디어](#개선-아이디어)
3. [대시보드 템플릿 활용 방안](#대시보드-템플릿-활용-방안)
4. [통합 아키텍처](#통합-아키텍처)
5. [구현 로드맵](#구현-로드맵)
6. [기술적 도전 과제](#기술적-도전-과제)

---

## 현재 상태 분석

### 블록 에디터 (test.html)
**강점**:
- ✅ 완전한 기능의 블록 기반 편집기
- ✅ AI 통합 (Gemini + Claude)
- ✅ 마크다운 + 차트 렌더링
- ✅ 직관적인 UX (Notion 스타일)

**약점**:
- ❌ 데이터 지속성 없음 (메모리만 사용)
- ❌ API 키 노출
- ❌ 단일 HTML 파일 (모듈화 부족)
- ❌ 시각화 제한적 (기본 차트만)
- ❌ 협업 기능 없음
- ❌ 반응형 대시보드 부재

### 대시보드 템플릿 (DashboardGridLayout)
**강점**:
- ✅ Masonry + Grid 듀얼 모드
- ✅ 드래그 앤 드롭 레이아웃 편집
- ✅ localStorage 지속성
- ✅ 반응형 (4개 breakpoint)
- ✅ 16개 위젯 컴포넌트
- ✅ Next.js 16 + React 19

**기회**:
- 📊 풍부한 차트 위젯 (8종)
- 📋 테이블, 캘린더, 팀원 위젯
- 🎨 모던 UI (shadcn/ui)
- 🔄 실시간 레이아웃 조정

---

## 개선 아이디어

### 1. 블록 타입 확장

#### 1.1 대시보드 블록
```typescript
// 새로운 블록 타입
type BlockType =
  | 'text'           // 기존
  | 'heading'        // 기존
  | 'code'           // 기존
  | 'chart'          // 개선 필요
  | 'table'          // 개선 필요
  | 'dashboard'      // 🆕 대시보드 위젯
  | 'widget-grid'    // 🆕 위젯 그리드
  | 'metric-card'    // 🆕 메트릭 카드
  | 'calendar'       // 🆕 캘린더 뷰
  | 'team'           // 🆕 팀원 목록
  | 'activity'       // 🆕 활동 피드
  | 'kanban'         // 🆕 칸반 보드
  | 'timeline'       // 🆕 타임라인
  | 'gallery'        // 🆕 이미지 갤러리
```

**예시: 대시보드 블록 삽입**
```markdown
/dashboard

# 또는 슬래시 명령으로

/widget area-chart
/widget pie-chart
/widget table
/widget calendar
```

#### 1.2 인터랙티브 차트 블록
```typescript
// 현재: 정적 차트
pie: 레이블1:값1, 레이블2:값2

// 개선: 인터랙티브 차트 (recharts 활용)
```chart:area-interactive
{
  "title": "월별 보안 이벤트 추이",
  "data": [
    { "month": "1월", "incidents": 120, "alerts": 450 },
    { "month": "2월", "incidents": 145, "alerts": 520 }
  ],
  "xKey": "month",
  "yKeys": ["incidents", "alerts"]
}
```

#### 1.3 실시간 데이터 블록
```typescript
// 🆕 실시간 메트릭 블록
```widget:stats
{
  "endpoint": "/api/stats/realtime",
  "refresh": 5000,
  "metrics": [
    { "label": "활성 인시던트", "key": "active_incidents", "trend": true },
    { "label": "평균 응답 시간", "key": "avg_response_time", "format": "duration" }
  ]
}
```

### 2. AI 기능 강화

#### 2.1 AI 기반 위젯 추천
```typescript
// 사용자가 텍스트 입력 시 AI가 적절한 위젯 제안
// 예: "지난 주 인시던트 통계를 보고 싶어"
// AI 응답:
{
  "suggestion": "area-chart",
  "reason": "시계열 데이터 시각화에 적합",
  "config": {
    "title": "주간 인시던트 통계",
    "dataSource": "/api/incidents/weekly"
  }
}
```

#### 2.2 자연어 → 차트 변환
```typescript
// 사용자 입력: "피싱 공격 450건, 멀웨어 320건, DDoS 180건을 파이 차트로 보여줘"
// AI가 자동으로 변환:
```chart:pie
{
  "title": "공격 유형별 분포",
  "data": [
    { "name": "피싱", "value": 450 },
    { "name": "멀웨어", "value": 320 },
    { "name": "DDoS", "value": 180 }
  ]
}
```

#### 2.3 AI 보고서 생성
```typescript
// 🆕 "AI 보고서 생성" 기능
// 입력: 날짜 범위 선택
// 출력:
// - 경영진 요약 (자동 생성)
// - 주요 지표 위젯 (자동 배치)
// - 트렌드 차트 (자동 선택)
// - 권장 사항 (AI 분석)
```

### 3. 데이터 지속성 및 협업

#### 3.1 멀티 레벨 저장
```typescript
// Level 1: localStorage (현재)
localStorage.setItem('blocks', JSON.stringify(blocks));

// Level 2: IndexedDB (오프라인 지원)
const db = await openDB('block-editor', 1);
await db.put('documents', { id: docId, blocks, updatedAt: Date.now() });

// Level 3: 서버 저장 (협업)
await fetch('/api/documents', {
  method: 'POST',
  body: JSON.stringify({ id: docId, blocks, version: 1 })
});
```

#### 3.2 실시간 협업
```typescript
// WebSocket 기반 동시 편집
const ws = new WebSocket('wss://api.example.com/collab');

ws.onmessage = (event) => {
  const { type, blockId, content, userId } = JSON.parse(event.data);

  if (type === 'block-update') {
    updateBlock(blockId, content);
    showUserCursor(userId, blockId);
  }
};

// 사용자 커서 표시
function showUserCursor(userId, blockId) {
  const user = collaborators.find(u => u.id === userId);
  // 다른 사용자가 편집 중인 블록에 색상 표시
}
```

#### 3.3 버전 관리
```typescript
// 🆕 문서 버전 히스토리
interface DocumentVersion {
  id: string;
  version: number;
  blocks: Block[];
  createdAt: Date;
  createdBy: string;
  changes: string; // AI 생성 변경 요약
}

// 사용 예시
const versions = await getDocumentVersions(docId);
// → [
//   { version: 3, changes: "차트 3개 추가, 요약 섹션 업데이트" },
//   { version: 2, changes: "테이블 데이터 수정" },
//   { version: 1, changes: "초기 문서 생성" }
// ]
```

### 4. 템플릿 시스템

#### 4.1 보안 보고서 템플릿
```typescript
const securityReportTemplate = {
  name: "주간 보안 보고서",
  thumbnail: "/templates/security-report.png",
  blocks: [
    { type: 'heading', content: '# 경영진 요약' },
    { type: 'text', content: '[AI가 자동 생성할 영역]' },

    { type: 'heading', content: '## 주요 지표' },
    { type: 'widget-grid', content: {
      layout: 'masonry',
      widgets: [
        { type: 'stats', config: { metric: 'total_incidents' } },
        { type: 'stats', config: { metric: 'high_severity' } },
        { type: 'stats', config: { metric: 'avg_response_time' } }
      ]
    }},

    { type: 'heading', content: '## 인시던트 추이' },
    { type: 'chart', content: {
      type: 'area-interactive',
      dataSource: '/api/incidents/trend'
    }},

    { type: 'heading', content: '## 주요 취약점' },
    { type: 'table', content: {
      dataSource: '/api/vulnerabilities/top',
      columns: ['CVE', 'CVSS', '영향 시스템', '상태']
    }}
  ]
};
```

#### 4.2 대시보드 템플릿
```typescript
const dashboardTemplates = {
  "soc-overview": {
    name: "SOC 개요 대시보드",
    widgets: [
      { id: 'incidents-trend', type: 'area-chart', position: { x: 0, y: 0, w: 2, h: 3 } },
      { id: 'severity-pie', type: 'pie-chart', position: { x: 2, y: 0, w: 1, h: 3 } },
      { id: 'recent-alerts', type: 'table', position: { x: 0, y: 3, w: 3, h: 4 } }
    ]
  },

  "executive-summary": {
    name: "경영진 요약",
    widgets: [
      { id: 'key-metrics', type: 'stats-grid', position: { x: 0, y: 0, w: 4, h: 2 } },
      { id: 'risk-radar', type: 'radar-chart', position: { x: 0, y: 2, w: 2, h: 3 } },
      { id: 'compliance', type: 'progress-widget', position: { x: 2, y: 2, w: 2, h: 3 } }
    ]
  },

  "incident-response": {
    name: "인시던트 대응",
    widgets: [
      { id: 'active-incidents', type: 'kanban', position: { x: 0, y: 0, w: 3, h: 5 } },
      { id: 'team-activity', type: 'activity-feed', position: { x: 3, y: 0, w: 1, h: 5 } }
    ]
  }
};
```

### 5. 내보내기 및 공유

#### 5.1 다양한 포맷 지원
```typescript
// PDF 내보내기 (jsPDF + html2canvas)
async function exportToPDF(blocks: Block[]) {
  const pdf = new jsPDF();

  for (const block of blocks) {
    if (block.type === 'widget-grid') {
      // 위젯을 이미지로 캡처
      const canvas = await html2canvas(blockElement);
      pdf.addImage(canvas, 'PNG', 10, y, 190, height);
    } else {
      // 텍스트 블록
      pdf.text(block.content, 10, y);
    }
  }

  pdf.save('security-report.pdf');
}

// PowerPoint 내보내기 (PptxGenJS)
async function exportToPPTX(blocks: Block[]) {
  const pptx = new PptxGenJS();

  for (const block of blocks) {
    if (block.type === 'heading') {
      const slide = pptx.addSlide();
      slide.addText(block.content, { x: 0.5, y: 0.5, fontSize: 24 });
    } else if (block.type === 'chart') {
      const slide = pptx.addSlide();
      slide.addChart(pptx.ChartType.pie, chartData, { x: 1, y: 1, w: 8, h: 5 });
    }
  }

  pptx.writeFile({ fileName: 'presentation.pptx' });
}

// Markdown 내보내기
function exportToMarkdown(blocks: Block[]): string {
  return blocks.map(block => {
    if (block.type === 'widget-grid') {
      return '<!-- 위젯은 마크다운으로 변환 불가 -->';
    }
    return block.content;
  }).join('\n\n');
}
```

#### 5.2 공유 및 퍼블리싱
```typescript
// 🆕 공개 URL 생성
async function publishDocument(docId: string) {
  const response = await fetch('/api/documents/publish', {
    method: 'POST',
    body: JSON.stringify({ docId, visibility: 'public' })
  });

  const { shareUrl } = await response.json();
  // → https://reports.example.com/shared/abc123def

  return shareUrl;
}

// 🆕 임베드 코드 생성
function generateEmbedCode(docId: string, options: EmbedOptions) {
  return `
    <iframe
      src="https://reports.example.com/embed/${docId}"
      width="${options.width}"
      height="${options.height}"
      frameborder="0"
      allowfullscreen
    ></iframe>
  `;
}
```

---

## 대시보드 템플릿 활용 방안

### 방안 1: 블록 에디터 내 위젯 삽입

#### 개념
블록 에디터의 특수 블록으로 대시보드 위젯을 삽입

#### 구현
```typescript
// components/block-editor/blocks/DashboardBlock.tsx
'use client';

import { ChartAreaInteractive } from '@/components/blocks/dashboard-01/chart-area-interactive';
import { ChartPie } from '@/components/blocks/dashboard-01/chart-pie';
import { SimpleTable } from '@/components/blocks/dashboard-01/simple-table';

interface DashboardBlockProps {
  widgetType: string;
  config: Record<string, any>;
}

export function DashboardBlock({ widgetType, config }: DashboardBlockProps) {
  const widgetMap = {
    'area-chart': ChartAreaInteractive,
    'pie-chart': ChartPie,
    'table': SimpleTable,
    // ... 나머지 16개 위젯
  };

  const Widget = widgetMap[widgetType];

  return (
    <div className="dashboard-block my-4 p-4 border rounded-lg">
      <Widget {...config} />
    </div>
  );
}
```

#### 사용 예시
```markdown
# 보안 현황 보고서

최근 24시간 동안의 인시던트 현황입니다.

<!-- 위젯 삽입 -->
/widget area-chart

다음은 심각도별 분포입니다.

<!-- 위젯 삽입 -->
/widget pie-chart

상세 내역은 아래 테이블을 참고하세요.

<!-- 위젯 삽입 -->
/widget table
```

### 방안 2: 대시보드 모드 전환

#### 개념
편집 모드 / 대시보드 모드 전환 버튼 추가

#### UI 설계
```
+----------------------------------------------------------+
| [편집] [대시보드] [프리젠테이션] [공유]                |  ← 모드 전환
+----------------------------------------------------------+
| 편집 모드:                                                |
| - 일반 블록 에디터                                        |
| - 텍스트, 마크다운, 코드 등                              |
|                                                           |
+----------------------------------------------------------+

↓ 전환

+----------------------------------------------------------+
| [편집] [대시보드] [프리젠테이션] [공유]                |
+----------------------------------------------------------+
| 대시보드 모드:                                           |
| +----------------+  +----------------+                    |
| | Area Chart     |  | Pie Chart      |                    |
| |                |  |                |                    |
| +----------------+  +----------------+                    |
| +----------------------------------+                      |
| | Data Table                        |                      |
| +----------------------------------+                      |
+----------------------------------------------------------+
```

#### 구현
```typescript
// app/reports/[id]/page.tsx
'use client';

import { useState } from 'react';
import { BlockEditor } from '@/components/block-editor';
import { DashboardGridLayout } from '@/components/dashboard-grid-layout';

type ViewMode = 'edit' | 'dashboard' | 'presentation';

export default function ReportPage() {
  const [mode, setMode] = useState<ViewMode>('edit');
  const [blocks, setBlocks] = useState([...]);

  // 블록에서 위젯 추출
  const widgets = blocks
    .filter(b => b.type === 'widget')
    .map(b => <Widget key={b.id} {...b.config} />);

  return (
    <div>
      <header>
        <Button onClick={() => setMode('edit')}>편집</Button>
        <Button onClick={() => setMode('dashboard')}>대시보드</Button>
        <Button onClick={() => setMode('presentation')}>프리젠테이션</Button>
      </header>

      {mode === 'edit' && (
        <BlockEditor blocks={blocks} onChange={setBlocks} />
      )}

      {mode === 'dashboard' && (
        <DashboardGridLayout>
          {widgets}
        </DashboardGridLayout>
      )}

      {mode === 'presentation' && (
        <PresentationView blocks={blocks} />
      )}
    </div>
  );
}
```

### 방안 3: 드래그 앤 드롭 위젯 팔레트

#### 개념
좌측에 위젯 팔레트, 우측에 에디터 캔버스

#### UI 레이아웃
```
+------------------+----------------------------------------+
| 위젯 팔레트      | 에디터 캔버스                          |
|                  |                                        |
| 📊 차트          | # 보안 보고서                          |
|  ├ Area Chart    |                                        |
|  ├ Bar Chart     | 최근 보안 이벤트 요약...               |
|  ├ Pie Chart     |                                        |
|  └ Radar Chart   | [드롭 영역: 여기에 위젯 끌어놓기]     |
|                  |                                        |
| 📋 데이터        |                                        |
|  ├ Table         |                                        |
|  └ Stats Cards   |                                        |
|                  |                                        |
| 📅 기타          |                                        |
|  ├ Calendar      |                                        |
|  ├ Team          |                                        |
|  └ Activity      |                                        |
+------------------+----------------------------------------+
```

#### 구현
```typescript
// components/block-editor/WidgetPalette.tsx
import { useDraggable } from '@dnd-kit/core';

const widgets = [
  { id: 'area-chart', name: 'Area Chart', icon: '📊', category: '차트' },
  { id: 'pie-chart', name: 'Pie Chart', icon: '🥧', category: '차트' },
  { id: 'table', name: 'Table', icon: '📋', category: '데이터' },
  // ...
];

export function WidgetPalette() {
  return (
    <aside className="w-64 border-r p-4">
      <h3 className="font-bold mb-4">위젯</h3>

      {Object.entries(groupBy(widgets, 'category')).map(([category, items]) => (
        <div key={category} className="mb-4">
          <h4 className="text-sm font-semibold mb-2">{category}</h4>
          {items.map(widget => (
            <DraggableWidget key={widget.id} widget={widget} />
          ))}
        </div>
      ))}
    </aside>
  );
}

function DraggableWidget({ widget }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: widget.id,
    data: { type: 'widget', widget }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-move"
    >
      <span>{widget.icon}</span>
      <span className="text-sm">{widget.name}</span>
    </div>
  );
}
```

### 방안 4: 스마트 레이아웃 제안

#### 개념
AI가 콘텐츠를 분석하고 최적의 위젯 레이아웃 제안

#### 프로세스
```
1. 사용자가 보고서 작성 (텍스트 + 데이터)
   ↓
2. AI가 내용 분석
   - "월별 추이" 언급 → Area Chart 제안
   - "분포" 언급 → Pie Chart 제안
   - "상세 목록" 언급 → Table 제안
   ↓
3. 레이아웃 자동 생성
   - 중요도 기반 위젯 크기 조정
   - 관련 위젯 그룹핑
   ↓
4. 사용자 승인 후 적용
```

#### 구현
```typescript
// lib/ai/layout-suggester.ts
interface LayoutSuggestion {
  widgetType: string;
  reason: string;
  position: { x: number; y: number; w: number; h: number };
  dataSource: string;
}

async function suggestLayout(blocks: Block[]): Promise<LayoutSuggestion[]> {
  const prompt = `
다음 보안 보고서 내용을 분석하고 적절한 대시보드 위젯을 제안해주세요:

${blocks.map(b => b.content).join('\n\n')}

사용 가능한 위젯:
- area-chart: 시계열 추이 (2x3)
- pie-chart: 비율 분포 (1x3)
- bar-chart: 비교 (1x3)
- radar-chart: 다차원 평가 (1x3)
- table: 상세 데이터 (2x4)
- stats-card: 주요 지표 (1x2)

JSON 형식으로 응답:
{
  "suggestions": [
    {
      "widgetType": "area-chart",
      "reason": "월별 인시던트 추이 시각화",
      "position": { "x": 0, "y": 0, "w": 2, "h": 3 },
      "dataSource": "/api/incidents/monthly"
    }
  ]
}
  `;

  const response = await callAI(prompt, 'gemini');
  return JSON.parse(response).suggestions;
}
```

---

## 통합 아키텍처

### 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     프론트엔드 (Next.js 16)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐     ┌──────────────────────┐      │
│  │   Block Editor       │────▶│  Dashboard Layout    │      │
│  │  - 텍스트 편집       │     │  - Masonry/Grid      │      │
│  │  - 마크다운 렌더링   │     │  - 드래그 앤 드롭    │      │
│  │  - 위젯 블록 삽입    │     │  - 16개 위젯         │      │
│  └──────────────────────┘     └──────────────────────┘      │
│           │                              │                    │
│           └──────────┬───────────────────┘                   │
│                      ▼                                        │
│         ┌────────────────────────┐                           │
│         │   Unified Data Layer   │                           │
│         │  - Zustand Store       │                           │
│         │  - Block State         │                           │
│         │  - Widget Config       │                           │
│         │  - Layout State        │                           │
│         └────────────────────────┘                           │
│                      │                                        │
└──────────────────────┼────────────────────────────────────────┘
                       │
┌──────────────────────┼────────────────────────────────────────┐
│                      ▼         백엔드 (API Routes)            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  /api/docs   │  │  /api/ai     │  │  /api/data   │       │
│  │  - CRUD      │  │  - Gemini    │  │  - 인시던트  │       │
│  │  - 버전 관리 │  │  - Claude    │  │  - 취약점    │       │
│  │  - 협업      │  │  - 프록시    │  │  - 메트릭    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│           │                 │                  │              │
└───────────┼─────────────────┼──────────────────┼──────────────┘
            │                 │                  │
┌───────────┼─────────────────┼──────────────────┼──────────────┐
│           ▼                 ▼                  ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  PostgreSQL  │  │  OpenSearch  │  │  Redis       │       │
│  │  - 문서      │  │  - 로그      │  │  - 캐시      │       │
│  │  - 사용자    │  │  - 인시던트  │  │  - 세션      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                          데이터 레이어                        │
└─────────────────────────────────────────────────────────────┘
```

### 데이터 모델

```typescript
// prisma/schema.prisma

// 문서
model Document {
  id          String   @id @default(cuid())
  title       String
  blocks      Block[]
  layout      Layout?
  createdBy   User     @relation(fields: [userId], references: [id])
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  versions    DocumentVersion[]
  published   Boolean  @default(false)
  shareUrl    String?  @unique
}

// 블록
model Block {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id])
  type        String   // 'text', 'heading', 'widget', etc.
  content     Json     // 텍스트 또는 위젯 설정
  order       Int      // 블록 순서
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// 대시보드 레이아웃
model Layout {
  id          String   @id @default(cuid())
  documentId  String   @unique
  document    Document @relation(fields: [documentId], references: [id])
  layouts     Json     // react-grid-layout 포맷
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// 버전
model DocumentVersion {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id])
  version     Int
  blocks      Json
  layout      Json?
  changes     String   // AI 생성 변경 요약
  createdBy   String
  createdAt   DateTime @default(now())
}
```

### API 엔드포인트

```typescript
// app/api/documents/route.ts

// 문서 생성
POST /api/documents
{
  "title": "주간 보안 보고서",
  "template": "security-report" // 선택사항
}
→ { "id": "doc_123", "url": "/reports/doc_123" }

// 문서 조회
GET /api/documents/[id]
→ { "id", "title", "blocks", "layout", "version" }

// 블록 업데이트
PATCH /api/documents/[id]/blocks
{
  "blockId": "blk_456",
  "content": { ... }
}

// 레이아웃 저장
PATCH /api/documents/[id]/layout
{
  "layouts": { "xl": [...], "lg": [...] }
}

// AI 프록시
POST /api/ai
{
  "provider": "gemini" | "claude",
  "prompt": "...",
  "context": { "documentId": "doc_123" }
}
→ Stream<string>

// 데이터 소스
GET /api/data/incidents/trend?start=2025-01-01&end=2025-01-07
→ [ { "date": "2025-01-01", "count": 45 }, ... ]

GET /api/data/vulnerabilities/top?limit=10
→ [ { "cve": "CVE-2024-38063", "cvss": 9.8, ... }, ... ]
```

---

## 구현 로드맵

### Phase 1: 기반 구축 (2주)

#### Week 1: Next.js 마이그레이션
- [ ] test.html → React 컴포넌트 변환
- [ ] 블록 에디터 코어 구현
  - `<BlockEditor />` 메인 컴포넌트
  - `<Block />` 개별 블록 컴포넌트
  - `<BlockRenderer />` 마크다운 렌더러
- [ ] 상태 관리 (Zustand)
- [ ] 기본 UI 스타일링

**목표**: test.html 기능을 Next.js에서 재현

#### Week 2: 데이터베이스 통합
- [ ] Prisma 스키마 정의
- [ ] API Routes 구현
  - `/api/documents` CRUD
  - `/api/blocks` 업데이트
- [ ] localStorage → DB 마이그레이션
- [ ] 자동 저장 기능

**목표**: 데이터 지속성 확보

### Phase 2: 위젯 통합 (2주)

#### Week 3: 위젯 블록 개발
- [ ] `DashboardBlock` 컴포넌트
- [ ] 16개 위젯 임포트 및 래핑
- [ ] 위젯 삽입 UI (슬래시 명령)
- [ ] 위젯 설정 모달

**목표**: 블록 에디터에서 위젯 사용 가능

#### Week 4: 대시보드 모드
- [ ] 편집/대시보드 모드 전환
- [ ] 블록 → 위젯 변환 로직
- [ ] 레이아웃 저장/불러오기
- [ ] Masonry/Grid 모드 통합

**목표**: 듀얼 모드 작동

### Phase 3: AI 강화 (2주)

#### Week 5: AI 백엔드
- [ ] `/api/ai` 프록시 구현
- [ ] API 키 환경 변수화
- [ ] 스트리밍 SSE 구현
- [ ] Rate limiting

**목표**: 안전한 AI 통합

#### Week 6: AI 기능 확장
- [ ] 위젯 추천 시스템
- [ ] 자연어 → 차트 변환
- [ ] AI 보고서 자동 생성
- [ ] 레이아웃 제안

**목표**: AI 기능 차별화

### Phase 4: 협업 및 공유 (2주)

#### Week 7: 협업 기능
- [ ] WebSocket 서버 (Socket.io)
- [ ] 실시간 동기화
- [ ] 사용자 커서 표시
- [ ] 충돌 해결

**목표**: 다중 사용자 편집

#### Week 8: 공유 및 내보내기
- [ ] 공개 URL 생성
- [ ] PDF 내보내기
- [ ] PowerPoint 내보내기
- [ ] 임베드 코드

**목표**: 결과물 공유

### Phase 5: 템플릿 및 최적화 (1주)

#### Week 9: 템플릿 시스템
- [ ] 템플릿 정의 (5종)
- [ ] 템플릿 선택 UI
- [ ] 템플릿 커스터마이징
- [ ] 템플릿 공유

**목표**: 빠른 보고서 작성

### Phase 6: 테스트 및 배포 (1주)

#### Week 10: QA 및 배포
- [ ] E2E 테스트 (Playwright)
- [ ] 성능 최적화
- [ ] 접근성 개선
- [ ] 프로덕션 배포

**목표**: 안정적 출시

---

## 기술적 도전 과제

### 1. 실시간 협업의 충돌 해결

#### 문제
```
사용자 A: 블록 3 수정 중
사용자 B: 블록 3 동시 수정
→ 충돌 발생
```

#### 해결: Operational Transformation (OT)
```typescript
// lib/collab/ot.ts
interface Operation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
}

function transform(op1: Operation, op2: Operation): Operation {
  // OT 알고리즘 구현
  // op1이 op2보다 먼저 적용되었을 때 op2를 변환
}

// 예시
const op1 = { type: 'insert', position: 5, content: 'Hello' };
const op2 = { type: 'delete', position: 3, length: 2 };
const transformed = transform(op1, op2);
// → { type: 'insert', position: 3, content: 'Hello' }
```

### 2. 대용량 데이터 렌더링 성능

#### 문제
```
100개 이상의 위젯이 있는 대시보드
→ 렌더링 느림, 메모리 과다 사용
```

#### 해결: 가상화 + Lazy Loading
```typescript
// 가상 스크롤
import { useVirtualizer } from '@tanstack/react-virtual';

function BlockList({ blocks }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // 예상 블록 높이
  });

  return (
    <div ref={parentRef} style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(item => (
          <div key={item.key} style={{ transform: `translateY(${item.start}px)` }}>
            <Block block={blocks[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}

// 위젯 Lazy Loading
const ChartAreaInteractive = lazy(() =>
  import('@/components/blocks/dashboard-01/chart-area-interactive')
);

function DashboardBlock({ widgetType }) {
  return (
    <Suspense fallback={<WidgetSkeleton />}>
      <ChartAreaInteractive />
    </Suspense>
  );
}
```

### 3. AI 스트리밍의 안정성

#### 문제
```
네트워크 불안정 → 스트림 중단
긴 응답 → 타임아웃
```

#### 해결: Retry + Checkpoint
```typescript
// lib/ai/streaming.ts
async function* streamAI(prompt: string, options: {
  maxRetries?: number;
  timeout?: number;
  onCheckpoint?: (text: string) => void;
}) {
  let retries = 0;
  let accumulated = '';

  while (retries < (options.maxRetries || 3)) {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({ prompt, resume: accumulated }),
        signal: AbortSignal.timeout(options.timeout || 30000)
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        accumulated += chunk;
        yield chunk;

        // 주기적으로 checkpoint 저장
        if (accumulated.length % 1000 === 0) {
          options.onCheckpoint?.(accumulated);
        }
      }

      break; // 성공

    } catch (error) {
      retries++;
      if (retries >= (options.maxRetries || 3)) {
        throw error;
      }
      await sleep(1000 * retries); // exponential backoff
    }
  }
}
```

### 4. 다양한 데이터 소스 통합

#### 문제
```
OpenSearch: 인시던트 데이터
PostgreSQL: 사용자 데이터
외부 API: 위협 인텔리전스
→ 각기 다른 포맷, 인증, 속도
```

#### 해결: Adapter Pattern
```typescript
// lib/data-sources/adapter.ts
interface DataSourceAdapter {
  connect(): Promise<void>;
  query(params: QueryParams): Promise<any[]>;
  transform(data: any): StandardFormat;
}

class OpenSearchAdapter implements DataSourceAdapter {
  async query(params: QueryParams) {
    const result = await opensearch.search({
      index: params.index,
      body: { query: params.query }
    });
    return result.hits.hits.map(hit => this.transform(hit));
  }

  transform(hit: any): StandardFormat {
    return {
      id: hit._id,
      timestamp: hit._source['@timestamp'],
      severity: hit._source.severity,
      // ...
    };
  }
}

class PostgresAdapter implements DataSourceAdapter {
  async query(params: QueryParams) {
    const result = await prisma.incident.findMany({
      where: params.where,
      orderBy: params.orderBy
    });
    return result.map(row => this.transform(row));
  }

  transform(row: any): StandardFormat {
    return {
      id: row.id,
      timestamp: row.createdAt,
      severity: row.severityLevel,
      // ...
    };
  }
}

// 사용
const dataSources = {
  'opensearch': new OpenSearchAdapter(),
  'postgres': new PostgresAdapter(),
  'api': new ExternalAPIAdapter()
};

async function fetchData(source: string, params: QueryParams) {
  const adapter = dataSources[source];
  await adapter.connect();
  return adapter.query(params);
}
```

---

## 예상 성과

### 정량적 성과
- 📈 보고서 작성 시간: **60분 → 15분** (75% 단축)
- 🎨 차트 생성 시간: **10분 → 30초** (95% 단축)
- 🤝 협업 효율: **이메일 왕복 → 실시간 편집**
- 📊 데이터 시각화: **정적 이미지 → 인터랙티브 위젯**

### 정성적 성과
- ✅ 일관된 보고서 포맷 (템플릿)
- ✅ AI 기반 인사이트 자동 생성
- ✅ 실시간 대시보드 모니터링
- ✅ 다양한 포맷 내보내기 (PDF, PPTX, MD)

---

## 다음 단계

### 즉시 시작 가능
1. **프로토타입 개발**: Phase 1 Week 1 시작
2. **디자인 목업**: Figma로 UI/UX 설계
3. **기술 스택 검증**: Next.js 16 + React 19 호환성 테스트

### 의사결정 필요
1. **호스팅**: Vercel vs Self-hosted
2. **AI Provider**: Gemini vs Claude vs OpenAI (비용/성능)
3. **데이터베이스**: PostgreSQL vs MongoDB (문서 저장)
4. **협업 프로토콜**: OT vs CRDT

### 리소스 요구사항
- **개발자**: 2-3명 (풀스택)
- **디자이너**: 1명 (UI/UX)
- **기간**: 10주 (약 2.5개월)
- **예산**: AI API 비용, 호스팅 비용

---

**문서 버전**: 1.0
**작성일**: 2025-11-08
**다음 리뷰**: Phase 1 완료 후
