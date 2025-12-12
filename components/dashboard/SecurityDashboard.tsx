'use client'

import { useEffect, useRef } from 'react'
import './dashboard.css'
import { DashboardQueryProvider } from './QueryProvider'

// 위젯 컴포넌트 imports
import { TrendLineChart, SeverityBarChart, ThreatPieChart, AlertAreaChart, IocDonutChart } from './charts'
import { IncidentsTable, AlertsTable, IocTable, MitreTable } from './tables'

function SecurityDashboardContent() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // dashboard-1.js를 동적으로 로드하고 실행
    const script = document.createElement('script')
    script.src = '/dashboard-1.js'
    script.async = false // 순서대로 실행되도록

    script.onload = () => {
      console.log('dashboard-1.js 로드 완료')

      // DOMContentLoaded가 이미 발생했으므로 수동으로 이벤트 발생
      // 스크립트 내부의 DOMContentLoaded 리스너를 트리거하기 위해
      // 약간의 지연 후 커스텀 이벤트 발생
      setTimeout(() => {
        // 스크립트가 이미 로드되었으므로 DOM이 준비된 상태에서 초기화 실행
        const event = new Event('DOMContentLoaded', {
          bubbles: true,
          cancelable: true
        })
        document.dispatchEvent(event)
        console.log('DOMContentLoaded 이벤트 수동 발생')
      }, 100)
    }

    script.onerror = () => {
      console.error('dashboard-1.js 로드 실패')
    }

    document.body.appendChild(script)

    // 현재 시간 업데이트
    const updateTime = () => {
      const timeElement = document.getElementById('currentTime')
      if (timeElement) {
        timeElement.textContent = new Date().toLocaleTimeString('ko-KR')
      }
    }
    updateTime()
    const timeInterval = setInterval(updateTime, 1000)

    return () => {
      clearInterval(timeInterval)
    }
  }, [])

  return (
    <div className="dashboard-container">
      {/* 상단 헤더 */}
      <div className="dashboard-header">
        <div className="logo">
          <a href="#" className="cta-button">DeFender X</a>
        </div>

        <div className="header-stats">
          <div className="stat-item">
            <div className="stat-number threats">147</div>
            <div className="stat-label">위협 탐지</div>
          </div>
          <div className="stat-item">
            <div className="stat-number incidents">23</div>
            <div className="stat-label">인시던트</div>
          </div>
          <div className="stat-item">
            <div className="stat-number alerts">285</div>
            <div className="stat-label">알럿</div>
          </div>
          <div className="stat-item">
            <div className="stat-number artifacts">1247</div>
            <div className="stat-label">아티팩트</div>
          </div>
          <div className="stat-item">
            <div className="stat-number mitre">15</div>
            <div className="stat-label">MITRE 기법</div>
          </div>
          <div className="stat-item">
            <div className="stat-number endpoints">4380</div>
            <div className="stat-label">보호된 엔드포인트</div>
          </div>
          <div className="stat-item">
            <div className="stat-number critical-cves">89</div>
            <div className="stat-label">중요 CVE</div>
          </div>
        </div>

        <div className="header-right">
          <div className="header-time">
            <i className="fas fa-clock"></i>
            <span>실시간</span>
            <div className="refresh-timer">
              <div className="timer-bar" id="timerBar"></div>
              <span className="timer-text" id="timerText">5s</span>
            </div>
          </div>
          <div className="header-user">
            <i className="fas fa-bell"></i>
            <i className="fas fa-bars"></i>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="main-content">
        {/* 좌측 패널 - 인시던트/알럿 중심 */}
        <div className="side-panel">
          {/* 인시던트 처리 현황 */}
          <IncidentsTable days={7} limit={5} showMitre={false} />

          {/* 인시던트 추세 (7일) */}
          <TrendLineChart days={7} type="incidents" height={120} showLegend={false} />

          {/* 심각도별 분포 */}
          <SeverityBarChart days={7} height={130} horizontal={true} />

          {/* 알럿 현황 */}
          <AlertsTable days={7} limit={5} />

          {/* 알럿 추세 (7일) */}
          <AlertAreaChart days={7} height={120} stacked={true} />
        </div>

        {/* 중앙 섹션 */}
        <div className="center-section">
          <div className="hologram-container">
            <div className="circular-grid"></div>
            <div className="center-text" id="centerText">DeFender X</div>

            <div className="kpi-container">
              {/* KPI 카드 8개 */}
              <div className="kpi-card" data-kpi="endpoints">
                <div className="kpi-left">
                  <div className="kpi-icon"><i className="fas fa-desktop"></i></div>
                  <div className="kpi-info">
                    <div className="kpi-value" data-value="4380">4,380</div>
                    <div className="kpi-title">활성 엔드포인트</div>
                  </div>
                </div>
                <div className="kpi-right">
                  <div className="kpi-change positive">
                    <i className="fas fa-arrow-up"></i>
                    <span>+2.1%</span>
                  </div>
                  <div className="kpi-alert">
                    <i className="fas fa-circle"></i>
                    <span>실시간 연결</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card" data-kpi="detection">
                <div className="kpi-left">
                  <div className="kpi-icon"><i className="fas fa-search"></i></div>
                  <div className="kpi-info">
                    <div className="kpi-value" data-value="97">97.8%</div>
                    <div className="kpi-title">CVE Detection Rate</div>
                  </div>
                </div>
                <div className="kpi-right">
                  <div className="kpi-change positive">
                    <i className="fas fa-arrow-up"></i>
                    <span>+1.2%</span>
                  </div>
                  <div className="kpi-alert">
                    <i className="fas fa-circle"></i>
                    <span>탐지율 향상</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card" data-kpi="threats">
                <div className="kpi-left">
                  <div className="kpi-icon"><i className="fas fa-exclamation-triangle"></i></div>
                  <div className="kpi-info">
                    <div className="kpi-value" data-value="147">147</div>
                    <div className="kpi-title">Daily Threats</div>
                  </div>
                </div>
                <div className="kpi-right">
                  <div className="kpi-change negative">
                    <i className="fas fa-arrow-down"></i>
                    <span>-15.3%</span>
                  </div>
                  <div className="kpi-alert">
                    <i className="fas fa-circle"></i>
                    <span>위협 감소</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card" data-kpi="block">
                <div className="kpi-left">
                  <div className="kpi-icon"><i className="fas fa-shield-alt"></i></div>
                  <div className="kpi-info">
                    <div className="kpi-value" data-value="94">94.2%</div>
                    <div className="kpi-title">차단 성공률</div>
                  </div>
                </div>
                <div className="kpi-right">
                  <div className="kpi-change positive">
                    <i className="fas fa-arrow-up"></i>
                    <span>+3.1%</span>
                  </div>
                  <div className="kpi-alert">
                    <i className="fas fa-circle"></i>
                    <span>차단 성공</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card" data-kpi="cve">
                <div className="kpi-left">
                  <div className="kpi-icon"><i className="fas fa-bug"></i></div>
                  <div className="kpi-info">
                    <div className="kpi-value" data-value="89">89</div>
                    <div className="kpi-title">중요 CVE</div>
                  </div>
                </div>
                <div className="kpi-right">
                  <div className="kpi-change negative">
                    <i className="fas fa-arrow-up"></i>
                    <span>+12.7%</span>
                  </div>
                  <div className="kpi-alert">
                    <i className="fas fa-circle"></i>
                    <span>패치 필요</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card" data-kpi="mttr">
                <div className="kpi-left">
                  <div className="kpi-icon"><i className="fas fa-clock"></i></div>
                  <div className="kpi-info">
                    <div className="kpi-value" data-value="27">27분</div>
                    <div className="kpi-title">MTTR</div>
                  </div>
                </div>
                <div className="kpi-right">
                  <div className="kpi-change positive">
                    <i className="fas fa-arrow-down"></i>
                    <span>-18.5%</span>
                  </div>
                  <div className="kpi-alert">
                    <i className="fas fa-circle"></i>
                    <span>대응 시간 단축</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card" data-kpi="health">
                <div className="kpi-left">
                  <div className="kpi-icon"><i className="fas fa-heartbeat"></i></div>
                  <div className="kpi-info">
                    <div className="kpi-value" data-value="98">98.7%</div>
                    <div className="kpi-title">Agent Health</div>
                  </div>
                </div>
                <div className="kpi-right">
                  <div className="kpi-change positive">
                    <i className="fas fa-arrow-up"></i>
                    <span>+0.8%</span>
                  </div>
                  <div className="kpi-alert">
                    <i className="fas fa-circle"></i>
                    <span>에이전트 정상</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card" data-kpi="incidents">
                <div className="kpi-left">
                  <div className="kpi-icon"><i className="fas fa-exclamation-circle"></i></div>
                  <div className="kpi-info">
                    <div className="kpi-value" data-value="8">8</div>
                    <div className="kpi-title">활성 인시던트</div>
                  </div>
                </div>
                <div className="kpi-right">
                  <div className="kpi-change positive">
                    <i className="fas fa-arrow-down"></i>
                    <span>-33.3%</span>
                  </div>
                  <div className="kpi-alert">
                    <i className="fas fa-circle"></i>
                    <span>인시던트 감소</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 우측 패널 - 위협/IOC/MITRE 중심 */}
        <div className="side-panel">
          {/* MITRE ATT&CK 기법 */}
          <MitreTable days={30} limit={6} showTactics={true} />

          {/* 위협 유형 분포 */}
          <ThreatPieChart days={7} height={160} showLegend={true} />

          {/* IOC 유형 분포 */}
          <IocDonutChart days={7} height={140} />

          {/* IOC 지표 테이블 */}
          <IocTable days={7} limit={5} />

          {/* 위협 추세 (30일) */}
          <TrendLineChart days={30} type="threats" height={120} showLegend={false} />
        </div>
      </div>

      {/* Toast container */}
      <div id="toastContainer" className="toast-container"></div>

      {/* Bottom section - 보고서 및 위협 인텔리전스 */}
      <div className="bottom-section">
        <div className="report-card">
          <div className="report-title">📈 보안 성과 요약</div>
          <div className="report-item">● 전체 보안 효율성: 94.2%</div>
          <div className="report-item">● 위협 탐지율: 97.8%</div>
          <div className="report-item">● 차단 성공률: 94.2%</div>
          <div className="report-item">● 에이전트 상태: 98.7/100</div>
        </div>
        <div className="report-card">
          <div className="report-title">🚨 보안 알림 센터</div>
          <div className="report-item">● 🔴 CRITICAL CVE: 89건</div>
          <div className="report-item">● 🟡 위협 탐지: 147건</div>
          <div className="report-item">● 🟢 엔드포인트: 4,380개 정상</div>
          <div className="report-item">● 🔵 AI 분석: 업데이트 완료</div>
        </div>
        <div className="report-card">
          <div className="report-title">⚙️ 액션 아이템</div>
          <div className="report-item">● CVE 패치 우선순위 분석</div>
          <div className="report-item">● 엔드포인트 보안 강화</div>
          <div className="report-item">● MITRE ATT&CK 매핑 리뷰</div>
          <div className="report-item">● MDR 팀 성과 모니터링</div>
        </div>
      </div>

      {/* 자동화 플로우 - 원본 구조 */}
      <div className="automation-flow" id="automationFlow">
        <div className="flow-header">
          <div className="flow-title">
            <div className="flow-main-title">
              <span><i className="fas fa-robot"></i></span>
              <span>보안 위협 탐지</span>
            </div>
            <div className="flow-incident-info" id="currentProcessingIncident">
              처리 대기중...
            </div>
            <div className="flow-progress">
              <div className="flow-progress-bar" id="flowProgressBar"></div>
            </div>
          </div>
          <div className="flow-timer">
            <div className="timer-circle">
              <div className="timer-text">10</div>
            </div>
          </div>
        </div>
        <div className="flow-content visible" id="flowContent">
          <div className="flow-steps">
            <div className="flow-step" id="step1">
              <span className="flow-step-icon"><i className="fas fa-search"></i></span>
              <div className="flow-step-title">탐지</div>
              <div className="flow-step-desc">XDR에서 위협 탐지</div>
            </div>
            <div className="flow-arrow" id="arrow1"><i className="fas fa-chevron-right"></i></div>
            <div className="flow-step" id="step2">
              <span className="flow-step-icon"><i className="fas fa-brain"></i></span>
              <div className="flow-step-title">수집.분석</div>
              <div className="flow-step-desc">DX AI 로 인시던트 분석</div>
            </div>
            <div className="flow-arrow" id="arrow2"><i className="fas fa-chevron-right"></i></div>
            <div className="flow-step" id="step3">
              <span className="flow-step-icon"><i className="fas fa-database"></i></span>
              <div className="flow-step-title">SIEM</div>
              <div className="flow-step-desc">데이터 인덱싱 및 저장</div>
            </div>
            <div className="flow-arrow" id="arrow3"><i className="fas fa-chevron-right"></i></div>
            <div className="flow-step" id="step4">
              <span className="flow-step-icon"><i className="fas fa-globe"></i></span>
              <div className="flow-step-title">위협 인텔리전스</div>
              <div className="flow-step-desc">DX AI CTI</div>
            </div>
            <div className="flow-arrow" id="arrow4"><i className="fas fa-chevron-right"></i></div>
            <div className="flow-step" id="step5">
              <span className="flow-step-icon"><i className="fas fa-desktop"></i></span>
              <div className="flow-step-title">알림 모니터</div>
              <div className="flow-step-desc">케이스 생성 및 알림</div>
            </div>
            <div className="flow-arrow" id="arrow5"><i className="fas fa-chevron-right"></i></div>
            <div className="flow-step" id="step6">
              <span className="flow-step-icon"><i className="fas fa-magic"></i></span>
              <div className="flow-step-title">AUTO ACTION</div>
              <div className="flow-step-desc">DX AI SOAR</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main export with QueryProvider wrapper
export default function SecurityDashboard() {
  return (
    <DashboardQueryProvider>
      <SecurityDashboardContent />
    </DashboardQueryProvider>
  )
}
