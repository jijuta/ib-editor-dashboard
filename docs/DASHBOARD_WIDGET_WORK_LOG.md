# Dashboard Widget Development Work Log

## Overview

Security Dashboard의 좌우 패널 위젯 시스템 개발 및 CSS 스타일링 작업 기록

**작업 일자:** 2025-11-25
**대상 페이지:** `/dashboard-test`
**주요 목표:** 기존 대시보드 디자인 유지하면서 좌우 스크롤 패널에 React Query 기반 위젯 추가

---

## 1. 아키텍처

### 데이터 소스
- **OpenSearch** (opensearch:9200 → 20.41.120.173)
  - `logs-cortex_xdr-incidents-*` - 인시던트 데이터
  - `logs-cortex_xdr-alerts-*` - 알럿 데이터
  - `logs-cortex_xdr-file-*` - 파일 아티팩트
  - `logs-cortex_xdr-network-*` - 네트워크 아티팩트
  - `logs-cortex_xdr-process-*` - 프로세스 이벤트

- **PostgreSQL** (postgres:5432/n8n)
  - `ioclog.bazaar_malware` - 997K 악성코드 레코드
  - `ioclog.ti_mitre` - 884 MITRE 기법
  - `ioclog.ioc_log` - IOC 데이터

### 기술 스택
- **Framework:** Next.js 16 + React 19
- **Data Fetching:** React Query (@tanstack/react-query v5)
- **Charts:** Recharts 2.15
- **Styling:** CSS (dashboard.css glassmorphism 스타일)

---

## 2. 좌우 패널 구성

### 좌측 패널 (인시던트/알럿 중심)
```
┌─────────────────────────┐
│  🚨 인시던트 처리 현황    │  IncidentsTable
├─────────────────────────┤
│  📈 인시던트 추세 (7일)   │  TrendLineChart (incidents)
├─────────────────────────┤
│  📊 심각도별 분포         │  SeverityBarChart
├─────────────────────────┤
│  🔔 알럿 현황            │  AlertsTable
├─────────────────────────┤
│  📊 알럿 추세            │  AlertAreaChart
└─────────────────────────┘
```

### 우측 패널 (위협/IOC/MITRE 중심)
```
┌─────────────────────────┐
│  🎯 MITRE ATT&CK 기법    │  MitreTable
├─────────────────────────┤
│  🎯 위협 유형 분포        │  ThreatPieChart
├─────────────────────────┤
│  🔐 IOC 유형 분포        │  IocDonutChart
├─────────────────────────┤
│  🔍 IOC 지표             │  IocTable
├─────────────────────────┤
│  📈 위협 추세 (30일)      │  TrendLineChart (threats)
└─────────────────────────┘
```

---

## 3. 수정된 파일 목록

### 컴포넌트
| 파일 | 수정 내용 |
|------|----------|
| `components/dashboard/SecurityDashboard.tsx` | 좌우 패널 재설계, 중복 위젯 제거 |
| `components/dashboard/charts/AlertAreaChart.tsx` | Legend import 추가, CSS 클래스 변경 |
| `components/dashboard/charts/IocDonutChart.tsx` | WidgetCard → panel-card CSS 변경 |
| `components/dashboard/charts/SeverityBarChart.tsx` | getSeverityColor() 반환값 수정 |
| `components/dashboard/charts/ThreatPieChart.tsx` | CSS 클래스 변경 |
| `components/dashboard/charts/TrendLineChart.tsx` | CSS 클래스 변경 |
| `components/dashboard/tables/AlertsTable.tsx` | WidgetSkeleton rows prop 제거, 타입 수정 |
| `components/dashboard/tables/IncidentsTable.tsx` | "SOC 팀" 하드코딩 제거, 타입 수정 |
| `components/dashboard/tables/IocTable.tsx` | CSS 클래스 변경, 타입 수정 |
| `components/dashboard/tables/MitreTable.tsx` | CSS 클래스 변경 |

### API 라우트
| 파일 | 수정 내용 |
|------|----------|
| `app/api/dashboard/incidents/route.ts` | OpenSearch aggregation 타입 수정 |
| `app/api/dashboard/ioc/route.ts` | aggregation as any 캐스팅 |
| `app/api/dashboard/mitre/route.ts` | aggregation 타입 수정 |
| `app/api/dashboard/timeseries/route.ts` | calendar_interval 타입 수정 |

### 설정 파일
| 파일 | 수정 내용 |
|------|----------|
| `tsconfig.json` | test 디렉토리 exclude 추가 |

---

## 4. CSS 스타일링 규칙

### 기존 CSS 클래스 사용 (dashboard.css)
```css
/* 패널 카드 */
.panel-card {
  background: rgba(10, 25, 47, 0.8);
  border: 1px solid rgba(74, 158, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
}

/* 패널 제목 */
.panel-title {
  color: #ccd6f6;
  font-size: 0.8em;
  margin-bottom: 8px;
}

/* 데이터 테이블 */
.data-table {
  width: 100%;
  font-size: 0.7em;
  color: #8892b0;
}

/* 차트 컨테이너 */
.chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### 색상 팔레트
- Primary: `#00d4ff` (사이버 블루)
- Success: `#00ff88` (그린)
- Warning: `#ffd93d` (옐로우)
- Danger: `#ff6b9d` (핑크)
- Text Primary: `#ccd6f6`
- Text Secondary: `#8892b0`

---

## 5. 타입 오류 해결

### OpenSearch Aggregation 타입
```typescript
// Before (오류)
const aggs = response.body.aggregations;
aggs?.by_status?.buckets  // Error: Property 'buckets' does not exist

// After (수정)
const aggs = response.body.aggregations as any;
aggs?.by_status?.buckets  // OK
```

### getSeverityColor / getStatusColor 반환값
```typescript
// Before (오류)
color: getSeverityColor(severity).text  // Error: .text does not exist

// After (수정)
color: getSeverityColor(severity)  // Returns string directly
```

### WidgetSkeleton props
```typescript
// Before (오류)
<WidgetSkeleton variant="table" rows={5} />  // Error: rows prop doesn't exist

// After (수정)
<WidgetSkeleton variant="table" />
```

---

## 6. 스크립트 파일 처리

app에서 import하지 않는 standalone 스크립트 파일들에 `// @ts-nocheck` 추가:

- `script/ai-incident-analyzer.ts`
- `script/collect-daily-incidents.ts`
- `script/convert-architecture-to-html.ts`
- `script/investigate-incident-cli.ts`
- `script/markdown-formatter.ts`
- `script/nl-query-parser.ts`
- `script/opensearch.ts`
- `script/opensearch-executor.ts`
- `script/report-data-collector.ts`
- `script/supabase-notifier.ts`
- `src/lib/nsrl-lookup.ts`

---

## 7. 향후 개선 사항

### 추가 예정 위젯
1. **파일 아티팩트 위젯** - OpenSearch file 인덱스 활용
2. **네트워크 아티팩트 위젯** - 외부 IP, 도메인 통계
3. **엔드포인트 현황 위젯** - 호스트별 위험도
4. **취약점 위젯** - CVE 데이터 표시

### PostgreSQL 데이터 활용
1. **악성코드 해시 위젯** - bazaar_malware 테이블
2. **공격 그룹 위젯** - 위협 행위자 통계
3. **국가별 위협 위젯** - GeoIP 기반 분석

### 차트 다양화
- 레이더 차트 (MITRE 전술별)
- 히트맵 (시간대별 활동)
- 산점도 (위험도 vs 빈도)

---

## 8. 빌드 및 실행

```bash
# 개발 서버
npm run dev  # http://localhost:40017

# 프로덕션 빌드
npm run build

# 대시보드 접근
http://localhost:40017/dashboard-test
```

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-11-25 | 1.0 | 초기 위젯 시스템 구축, CSS 스타일링 완료 |
