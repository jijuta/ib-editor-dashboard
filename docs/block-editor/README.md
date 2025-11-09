# Block Editor 분석 문서

## 개요

`data/test.html`은 Notion과 유사한 블록 기반 에디터를 구현한 독립형 HTML 파일입니다. AI 기반 콘텐츠 생성 기능이 포함되어 있으며, 보안 인시던트 보고서 작성에 최적화되어 있습니다.

**파일 구조**: 총 4000+ 줄
- CSS: ~1400줄
- JavaScript: ~2600줄
- 인라인 HTML 구조

## 핵심 기능

### 1. 블록 기반 편집 시스템

#### 지원하는 블록 타입
- **텍스트 블록**: 일반 텍스트 및 마크다운
- **제목 블록**: H1 ~ H6
- **코드 블록**: 언어별 syntax highlighting
- **인용 블록**: Blockquote
- **리스트 블록**: 순서 있음/없음
- **테이블 블록**: GitHub 스타일 마크다운 테이블
- **차트 블록**: 파이/막대 차트

#### 블록 조작
```javascript
// 주요 함수
addBlock(index, type, content)    // 블록 추가
removeBlock(index)                 // 블록 삭제
mergeWithPrevious(index)          // 이전 블록과 병합
renderBlocks()                     // 전체 재렌더링
```

#### 키보드 단축키
- `Enter`: 새 블록 생성
- `Backspace` (빈 블록): 블록 삭제 및 이전 블록과 병합
- `↑/↓`: 블록 간 이동
- `/`: 슬래시 명령 메뉴 열기
- 드래그 앤 드롭: 블록 순서 변경

### 2. AI 통합 (Dual Provider)

#### Google Gemini
- **모델**: `gemini-2.0-flash-exp`
- **API**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`
- **스트리밍**: 실시간 텍스트 생성

#### Claude (Anthropic)
- **모델**: `claude-3-5-sonnet-20241022`
- **API**: `https://api.anthropic.com/v1/messages`
- **스트리밍**: Server-Sent Events

#### AI 기능

**1. 생성 (Generate)**
- 프롬프트 기반 콘텐츠 생성
- 컨텍스트 인식 (이전 블록 내용 참조)

**2. 요약 (Summarize)**
- 선택한 텍스트 요약
- 길이 조절 가능

**3. 번역 (Translate)**
- 한글 → 영어
- 영어 → 한글
- 컨텍스트 보존

**4. 조정 (Adjust)**
- **어조**: 격식체 ↔ 반말체
- **길이**: 확장 ↔ 축약
- **품질**: 문법 및 맞춤법 교정

### 3. 마크다운 렌더링

#### 지원 문법

| 문법 | 예시 | 렌더링 |
|------|------|--------|
| 헤더 | `# H1` ~ `###### H6` | H1 ~ H6 태그 |
| 볼드 | `**텍스트**`, `__텍스트__` | `<strong>` |
| 이탤릭 | `*텍스트*`, `_텍스트_` | `<em>` |
| 인라인 코드 | `` `코드` `` | `<code>` |
| 코드 블록 | ``` ```language ``` ``` | `<pre><code>` |
| 링크 | `[텍스트](URL)` | `<a>` |
| 리스트 | `- 항목`, `1. 항목` | `<ul>`, `<ol>` |
| 테이블 | GitHub 마크다운 | `<table>` |
| 인용 | `> 인용문` | `<blockquote>` |
| 구분선 | `---`, `***` | `<hr>` |

#### 차트 문법
```markdown
# 파이 차트
pie: 레이블1:값1, 레이블2:값2, 레이블3:값3

# 막대 차트
bar: 항목1:100, 항목2:200, 항목3:150
```

**렌더링**: HTML Canvas 기반, 자동 색상 팔레트

### 4. UI 컴포넌트

#### 모달 시스템

**AI 모달** (`#ai-modal`)
- 4개 탭: 생성, 요약, 번역, 조정
- 실시간 스트리밍 결과 표시
- 결과 삽입/복사 기능

**블록 타입 모달** (`#block-type-modal`)
- 사용 가능한 모든 블록 타입 표시
- 클릭으로 블록 삽입

**팀 모달** (`#team-modal`)
- 팀원 관리 인터페이스
- 역할 및 상태 표시

**팁 모달** (`#tips-modal`)
- 사용 방법 안내
- 키보드 단축키 설명

#### 툴바

**선택 툴바** (`#selection-toolbar`)
- 텍스트 선택 시 자동 표시
- 포맷팅 옵션: 볼드, 이탤릭, 코드, 링크
- AI 기능 바로가기: 요약, 번역

**슬래시 명령 메뉴** (`#slash-menu`)
- `/` 입력 시 활성화
- 빠른 블록 삽입
- 필터링 기능

### 5. 통계 및 모니터링

**실시간 통계** (우측 상단)
- 총 블록 수
- 총 단어 수
- 자동 업데이트

## 기술 스택

### 프론트엔드
- **HTML5**: 시맨틱 마크업
- **CSS3**: Flexbox, Grid, 애니메이션
- **Vanilla JavaScript**: ES6+, 비동기 처리

### API 통합
- **Fetch API**: HTTP 요청
- **Server-Sent Events**: AI 스트리밍
- **Canvas API**: 차트 렌더링

### 데이터 구조
```javascript
// 블록 데이터 모델
{
  id: number,        // 고유 ID
  type: string,      // 'text', 'heading', 'code', 등
  content: string    // 마크다운 콘텐츠
}
```

## 샘플 데이터 분석

파일에 포함된 보안 보고서 예시:

### 보고 기간
- **기간**: 2025-11-02 ~ 2025-11-03
- **총 알림**: 3,419건
- **고위험**: 1,250건 (36.6%)

### 주요 취약점
- **CVE-2024-38063**: Windows TCP/IP 원격 코드 실행
- **CVE-2024-43461**: Windows 권한 상승
- **CVE-2024-38213**: Windows Mark of the Web 우회

### MITRE ATT&CK 전술
- **T1566**: 피싱 (Initial Access)
- **T1078**: 유효한 계정 (Defense Evasion)
- **T1059**: 명령 및 스크립트 인터프리터 (Execution)
- **T1071**: 애플리케이션 계층 프로토콜 (Command and Control)

### 보안 솔루션
- Cortex XDR
- Microsoft Defender
- CrowdStrike Falcon
- Fortinet FortiGate
- Cisco SecureX

## 보안 문제 및 해결 방안

### 🚨 심각한 보안 이슈

#### 1. API 키 하드코딩
**문제**:
```javascript
const GEMINI_API_KEY = 'AIzaSyAPYop7mSPAZiCuPpSm9nEccnjjsPoFHNg';
const CLAUDE_API_KEY = 'sk-ant-api03-...';
```

**해결 방안**:
```javascript
// 환경 변수 사용
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// 또는 백엔드 프록시
async function callAI(prompt, provider) {
  return fetch('/api/ai', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer USER_TOKEN' },
    body: JSON.stringify({ prompt, provider })
  });
}
```

#### 2. XSS 취약점
**문제**:
```javascript
// innerHTML 사용으로 XSS 가능
td.innerHTML = escapeHtml(cell.trim());
```

**해결 방안**:
```javascript
// DOMPurify 사용
import DOMPurify from 'dompurify';
td.innerHTML = DOMPurify.sanitize(cell.trim());
```

#### 3. Rate Limiting 부재
**해결 방안**:
```javascript
// 간단한 rate limiter
class RateLimiter {
  constructor(maxCalls, timeWindow) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindow;
    this.calls = [];
  }

  async throttle(fn) {
    const now = Date.now();
    this.calls = this.calls.filter(t => now - t < this.timeWindow);

    if (this.calls.length >= this.maxCalls) {
      throw new Error('Rate limit exceeded');
    }

    this.calls.push(now);
    return fn();
  }
}

const limiter = new RateLimiter(10, 60000); // 10 calls per minute
```

#### 4. 데이터 지속성 부재
**해결 방안**:
```javascript
// localStorage 저장
function saveBlocks() {
  localStorage.setItem('blocks', JSON.stringify(blocks));
}

// 자동 저장
let autoSaveTimer;
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveBlocks, 3000);
}
```

## 개선 제안

### 단기 개선 (1-2주)
1. ✅ API 키 환경 변수화
2. ✅ localStorage 자동 저장
3. ✅ XSS 방지 강화
4. ✅ 기본 에러 처리

### 중기 개선 (1-2개월)
1. 🔄 백엔드 API 프록시 구축
2. 🔄 사용자 인증 시스템
3. 🔄 데이터베이스 연동
4. 🔄 버전 관리 기능
5. 🔄 협업 편집 (WebSocket)

### 장기 개선 (3-6개월)
1. 📋 React/Next.js로 마이그레이션
2. 📋 TypeScript 전환
3. 📋 컴포넌트 테스트 (Jest/Vitest)
4. 📋 PDF/DOCX 내보내기
5. 📋 이미지 업로드 및 관리
6. 📋 템플릿 시스템
7. 📋 플러그인 아키텍처

## 프레임워크 마이그레이션 로드맵

### Next.js 16 + React 19 전환 계획

#### Phase 1: 컴포넌트 분리
```typescript
// components/block-editor/
├── BlockEditor.tsx          // 메인 컨테이너
├── Block.tsx               // 개별 블록
├── BlockRenderer.tsx       // 마크다운 렌더러
├── AIModal.tsx             // AI 모달
├── SelectionToolbar.tsx    // 선택 툴바
└── SlashMenu.tsx           // 슬래시 메뉴
```

#### Phase 2: 상태 관리
```typescript
// Zustand 사용 예시
import { create } from 'zustand';

interface BlockState {
  blocks: Block[];
  addBlock: (index: number, type: string, content: string) => void;
  removeBlock: (index: number) => void;
  updateBlock: (index: number, content: string) => void;
}

const useBlockStore = create<BlockState>((set) => ({
  blocks: [],
  addBlock: (index, type, content) => set((state) => ({
    blocks: [
      ...state.blocks.slice(0, index),
      { id: Date.now(), type, content },
      ...state.blocks.slice(index)
    ]
  })),
  // ...
}));
```

#### Phase 3: API Routes
```typescript
// app/api/ai/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { prompt, provider, context } = await req.json();

  // 서버에서 API 키 관리
  const apiKey = process.env.GEMINI_API_KEY;

  // 스트리밍 응답
  const stream = new ReadableStream({
    async start(controller) {
      // AI API 호출 및 스트리밍
    }
  });

  return new NextResponse(stream);
}
```

## 사용 예시

### 기본 사용법
1. 브라우저에서 `test.html` 열기
2. 블록에 텍스트 입력 (마크다운 지원)
3. `/` 입력으로 새 블록 타입 선택
4. 드래그로 블록 순서 변경

### AI 기능 사용
1. 텍스트 선택 후 툴바에서 "AI" 클릭
2. 또는 `/ai` 슬래시 명령
3. 원하는 작업 선택 (생성/요약/번역/조정)
4. 결과를 현재 위치에 삽입

### 차트 삽입
```markdown
# 공격 유형별 분포
pie: 피싱:450, 멀웨어:320, DDoS:180, SQL Injection:95

# 월별 인시던트 추이
bar: 1월:120, 2월:145, 3월:98, 4월:210
```

## 참고 자료

### 관련 기술 문서
- [Markdown Spec](https://spec.commonmark.org/)
- [Canvas API](https://developer.mozilla.org/ko/docs/Web/API/Canvas_API)
- [Server-Sent Events](https://developer.mozilla.org/ko/docs/Web/API/Server-sent_events)
- [Google Gemini API](https://ai.google.dev/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)

### 유사 프로젝트
- [Notion](https://notion.so) - 블록 기반 에디터의 표준
- [Tiptap](https://tiptap.dev/) - 확장 가능한 리치 텍스트 에디터
- [EditorJS](https://editorjs.io/) - 블록 스타일 에디터
- [ProseMirror](https://prosemirror.net/) - 에디터 프레임워크

## 라이센스 및 저작권

현재 라이센스 정보 없음. 프로젝트 사용 전 라이센스 명시 필요.

## 변경 이력

### v1.0 (현재)
- ✅ 기본 블록 편집 기능
- ✅ Gemini/Claude AI 통합
- ✅ 마크다운 렌더링
- ✅ 차트 생성
- ✅ 한글/영어 번역

### 계획 중
- 🔄 데이터 지속성
- 🔄 다중 사용자 지원
- 🔄 백엔드 API
- 🔄 보안 강화

---

**작성일**: 2025-11-08
**버전**: 1.0
**작성자**: Claude Code Analysis
