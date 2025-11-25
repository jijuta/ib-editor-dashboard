'use client'

import { useEffect } from 'react'
import './dashboard.css'

export default function SecurityDashboard() {
  useEffect(() => {
    // 원본 dashboard-1.js를 동적으로 로드
    const script = document.createElement('script')
    script.src = '/dashboard-1.js'
    script.async = true

    // 스크립트 로드 완료 후 초기화 함수 호출
    script.onload = () => {
      console.log('dashboard-1.js 로드 완료')
      // @ts-ignore - window.initDashboard는 dashboard-1.js에서 정의됨
      if (typeof window.initDashboard === 'function') {
        console.log('initDashboard 함수 실행')
        // @ts-ignore
        window.initDashboard()
      } else {
        console.error('initDashboard 함수를 찾을 수 없습니다')
      }
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
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
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
        {/* 좌측 패널 */}
        <div className="side-panel">
          {/* 위협 탐지 추이 분석 */}
          <div className="panel-card">
            <div className="panel-title">
              <i className="fas fa-chart-line"></i> 위협 탐지 추이 분석
            </div>
            <div className="chart-container">
              <svg className="line-chart" viewBox="0 0 300 100">
                <path d="M 10 70 Q 50 60, 90 50 T 170 40 T 250 30 T 290 25"
                      stroke="#00d4ff" strokeWidth="2" fill="none" opacity="0.8"/>
                <path d="M 10 80 Q 50 75, 90 65 T 170 55 T 250 50 T 290 45"
                      stroke="#feca57" strokeWidth="2" fill="none" opacity="0.6"/>
                <path d="M 10 90 Q 50 85, 90 75 T 170 70 T 250 65 T 290 60"
                      stroke="#ff6b9d" strokeWidth="2" fill="none" opacity="0.5"/>
              </svg>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#00d4ff' }}></div>
                <span>주간 탐지 추이</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#feca57' }}></div>
                <span>월간 평균</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#ff6b9d' }}></div>
                <span>연간 추세</span>
              </div>
            </div>
          </div>

          {/* CVE 심각도 추세 분석 */}
          <div className="panel-card">
            <div className="panel-title">
              <i className="fas fa-exclamation-circle"></i> CVE 심각도 추세 분석
            </div>
            <div className="chart-container">
              <div className="bar-chart">
                {[35, 55, 70, 45, 60, 40, 65, 50, 75, 55, 80, 65].map((height, i) => (
                  <div key={i} className="bar" style={{ height: `${height}%` }}></div>
                ))}
              </div>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#00d4ff' }}></div>
                <span>CRITICAL CVE</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#feca57' }}></div>
                <span>HIGH CVE</span>
              </div>
            </div>
          </div>

          {/* MITRE ATT&CK 지표 */}
          <div className="panel-card" style={{ minHeight: '180px' }}>
            <div className="panel-title">📊 MITRE ATT&CK 지표</div>
            <div className="chart-container" style={{ height: '120px', margin: '15px 0' }}>
              <svg className="line-chart" viewBox="0 0 300 120" style={{ height: '120px' }}>
                <circle cx="50" cy="60" r="35" stroke="#00d4ff" strokeWidth="3" fill="none" opacity="0.6"/>
                <circle cx="50" cy="60" r="35" stroke="#00d4ff" strokeWidth="3" fill="none" opacity="0.8" strokeDasharray="150" strokeDashoffset="35"/>
                <text x="50" y="65" textAnchor="middle" fill="#00d4ff" fontSize="14" fontWeight="bold">15</text>
                <circle cx="150" cy="60" r="30" stroke="#feca57" strokeWidth="3" fill="none" opacity="0.6"/>
                <circle cx="150" cy="60" r="30" stroke="#feca57" strokeWidth="3" fill="none" opacity="0.8" strokeDasharray="120" strokeDashoffset="25"/>
                <text x="150" y="65" textAnchor="middle" fill="#feca57" fontSize="14" fontWeight="bold">89</text>
                <circle cx="250" cy="60" r="25" stroke="#ff6b9d" strokeWidth="3" fill="none" opacity="0.6"/>
                <circle cx="250" cy="60" r="25" stroke="#ff6b9d" strokeWidth="3" fill="none" opacity="0.8" strokeDasharray="100" strokeDashoffset="30"/>
                <text x="250" y="65" textAnchor="middle" fill="#ff6b9d" fontSize="14" fontWeight="bold">23</text>
              </svg>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#00d4ff' }}></div>
                <span>탐지된 기법</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#feca57' }}></div>
                <span>매핑된 CVE</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#ff6b9d' }}></div>
                <span>활성 캠페인</span>
              </div>
            </div>
          </div>

          {/* 나머지 좌측 패널 카드들 */}
          <div className="panel-card">
            <div className="panel-title">⚠️ 위험 분석 및 알림</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>위험도</th>
                  <th>카테고리</th>
                  <th>수량</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ color: '#ff6b9d' }}>높음</td>
                  <td>재고부족 위험</td>
                  <td>12</td>
                  <td>🔴 활성</td>
                </tr>
                <tr>
                  <td style={{ color: '#feca57' }}>보통</td>
                  <td>과쟉 재고</td>
                  <td>24</td>
                  <td>🟡 모니터링</td>
                </tr>
                <tr>
                  <td style={{ color: '#00d4ff' }}>낮음</td>
                  <td>느린 이동</td>
                  <td>8</td>
                  <td>🟢 정상</td>
                </tr>
                <tr>
                  <td style={{ color: '#ff6b9d' }}>높음</td>
                  <td>가격 변동성</td>
                  <td>5</td>
                  <td>🔴 Alert</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel-card">
            <div className="panel-title">🔒 규정 준수</div>
            <div className="chart-container">
              <div className="bar-chart">
                <div className="bar" style={{ height: '85%', background: 'linear-gradient(180deg, #00ff88 0%, #00cc6a 100%)' }}></div>
                <div className="bar" style={{ height: '70%', background: 'linear-gradient(180deg, #feca57 0%, #ff9500 100%)' }}></div>
                <div className="bar" style={{ height: '95%', background: 'linear-gradient(180deg, #00ff88 0%, #00cc6a 100%)' }}></div>
                <div className="bar" style={{ height: '45%', background: 'linear-gradient(180deg, #ff6b9d 0%, #e55582 100%)' }}></div>
                <div className="bar" style={{ height: '80%', background: 'linear-gradient(180deg, #00ff88 0%, #00cc6a 100%)' }}></div>
                <div className="bar" style={{ height: '60%', background: 'linear-gradient(180deg, #feca57 0%, #ff9500 100%)' }}></div>
              </div>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#00ff88' }}></div>
                <span>준수 완료</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#feca57' }}></div>
                <span>검토 중</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#ff6b9d' }}></div>
                <span>위중</span>
              </div>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-title">🌐 네트워크 위협 분석</div>
            <div className="chart-container">
              <svg className="line-chart" viewBox="0 0 300 80">
                <defs>
                  <linearGradient id="threatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#ff6b9d', stopOpacity: 0.4 }} />
                    <stop offset="100%" style={{ stopColor: '#ff6b9d', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <path d="M 10 65 L 60 45 L 120 55 L 180 30 L 240 40 L 290 20 L 290 80 L 10 80 Z"
                      fill="url(#threatGrad)" />
                <path d="M 10 65 L 60 45 L 120 55 L 180 30 L 240 40 L 290 20"
                      stroke="#ff6b9d" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#ff6b9d' }}></div>
                <span>지역별 위협 IP</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#00d4ff' }}></div>
                <span>Threat Intelligence</span>
              </div>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-title">🚨 인시던트 처리 현황</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>심각도</th>
                  <th>상태</th>
                  <th>담당자</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>INC-2024-089</td>
                  <td style={{ color: '#ff6b9d' }}>높음</td>
                  <td>🔴 처리중</td>
                  <td>SOC 팀</td>
                </tr>
                <tr>
                  <td>INC-2024-087</td>
                  <td style={{ color: '#feca57' }}>보통</td>
                  <td>🟡 대기중</td>
                  <td>MDR 팀</td>
                </tr>
                <tr>
                  <td>INC-2024-085</td>
                  <td style={{ color: '#ff6b9d' }}>높음</td>
                  <td>🟢 완료</td>
                  <td>IR 팀</td>
                </tr>
                <tr>
                  <td>INC-2024-083</td>
                  <td style={{ color: '#00d4ff' }}>낮음</td>
                  <td>🟢 완료</td>
                  <td>SOC 팀</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel-card">
            <div className="panel-title">🛡️ 월별 보안 사고 변화</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>월</th>
                  <th>위협탐지</th>
                  <th>차단성공</th>
                  <th>인시던트</th>
                  <th>증감률</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>5월</td>
                  <td>1,247</td>
                  <td>1,185</td>
                  <td>23</td>
                  <td style={{ color: '#00ff88' }}>-15.4%</td>
                </tr>
                <tr>
                  <td>6월</td>
                  <td>1,089</td>
                  <td>1,034</td>
                  <td>18</td>
                  <td style={{ color: '#00ff88' }}>-21.7%</td>
                </tr>
                <tr>
                  <td>7월</td>
                  <td>892</td>
                  <td>847</td>
                  <td>12</td>
                  <td style={{ color: '#00ff88' }}>-33.3%</td>
                </tr>
                <tr>
                  <td>8월</td>
                  <td>756</td>
                  <td>723</td>
                  <td>9</td>
                  <td style={{ color: '#00ff88' }}>-25.0%</td>
                </tr>
                <tr>
                  <td>9월</td>
                  <td>645</td>
                  <td>612</td>
                  <td>8</td>
                  <td style={{ color: '#00ff88' }}>-11.1%</td>
                </tr>
              </tbody>
            </table>
          </div>
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

        {/* 우측 패널 */}
        <div className="side-panel">
          <div className="panel-card">
            <div className="panel-title">🚨 알럿 및 알림 현황</div>
            <div className="chart-container">
              <div className="bar-chart">
                <div className="bar" style={{ height: '85%', background: 'linear-gradient(180deg, #ff6b9d 0%, #e55582 100%)' }}></div>
                <div className="bar" style={{ height: '60%', background: 'linear-gradient(180deg, #feca57 0%, #ff9500 100%)' }}></div>
                <div className="bar" style={{ height: '40%', background: 'linear-gradient(180deg, #00d4ff 0%, #0066cc 100%)' }}></div>
                <div className="bar" style={{ height: '75%', background: 'linear-gradient(180deg, #ff6b9d 0%, #e55582 100%)' }}></div>
                <div className="bar" style={{ height: '55%', background: 'linear-gradient(180deg, #feca57 0%, #ff9500 100%)' }}></div>
                <div className="bar" style={{ height: '30%', background: 'linear-gradient(180deg, #00d4ff 0%, #0066cc 100%)' }}></div>
                <div className="bar" style={{ height: '90%', background: 'linear-gradient(180deg, #ff6b9d 0%, #e55582 100%)' }}></div>
                <div className="bar" style={{ height: '65%', background: 'linear-gradient(180deg, #feca57 0%, #ff9500 100%)' }}></div>
              </div>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#ff6b9d' }}></div>
                <span>위험 알럿</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#feca57' }}></div>
                <span>경고 알럿</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#00d4ff' }}></div>
                <span>정보 알럿</span>
              </div>
            </div>
            <table className="data-table" style={{ marginTop: '10px' }}>
              <thead>
                <tr>
                  <th>알럿 유형</th>
                  <th>수량</th>
                  <th>상태</th>
                  <th>대응</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>맬웨어 탐지</td>
                  <td style={{ color: '#ff6b9d' }}>127</td>
                  <td>🔴 활성</td>
                  <td>자동 차단</td>
                </tr>
                <tr>
                  <td>비정상 로그인</td>
                  <td style={{ color: '#feca57' }}>89</td>
                  <td>🟡 모니터링</td>
                  <td>수동 확인</td>
                </tr>
                <tr>
                  <td>네트워크 이상</td>
                  <td style={{ color: '#00d4ff' }}>56</td>
                  <td>🟢 정상</td>
                  <td>알림 전송</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel-card">
            <div className="panel-title">🚨 위협 인텔리전스 & IOC</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>IOC 유형</th>
                  <th>수량</th>
                  <th>AI 신뢰도</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>IP 주소</td>
                  <td>1,247</td>
                  <td style={{ color: '#00ff88' }}>94.2%</td>
                  <td>🔴 활성</td>
                </tr>
                <tr>
                  <td>도메인</td>
                  <td>856</td>
                  <td style={{ color: '#00d4ff' }}>92.7%</td>
                  <td>🟡 모니터링</td>
                </tr>
                <tr>
                  <td>URL 패턴</td>
                  <td>432</td>
                  <td style={{ color: '#feca57' }}>88.5%</td>
                  <td>🟢 정상</td>
                </tr>
                <tr>
                  <td>파일 해시</td>
                  <td>1,089</td>
                  <td style={{ color: '#00ff88' }}>96.8%</td>
                  <td>🔴 활성</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 추가 우측 패널 카드들 */}
          <div className="panel-card">
            <div className="panel-title">🔍 해시 분석</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>해시 유형</th>
                  <th>해시 값</th>
                  <th>위험도</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>SHA256</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '10px', cursor: 'pointer' }} title="클릭하여 복사">a1b2c3d4...f123456</td>
                  <td style={{ color: '#ff6b9d' }}>높음</td>
                  <td>
                    <button style={{ background: '#00d4ff', color: '#0a0e27', border: 'none', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>
                      VT 검색
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>MD5</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '10px', cursor: 'pointer' }} title="클릭하여 복사">9e107d9d...a419d6</td>
                  <td style={{ color: '#feca57' }}>보통</td>
                  <td>
                    <button style={{ background: '#00d4ff', color: '#0a0e27', border: 'none', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>
                      VT 검색
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>SHA1</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '10px', cursor: 'pointer' }} title="클릭하여 복사">aaf4c61d...ea9434d</td>
                  <td style={{ color: '#00ff88' }}>낮음</td>
                  <td>
                    <button style={{ background: '#00d4ff', color: '#0a0e27', border: 'none', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>
                      VT 검색
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel-card">
            <div className="panel-title">📊 성능 메트릭</div>
            <div className="chart-container">
              <div className="bar-chart">
                <div className="bar" style={{ height: '60%', background: 'linear-gradient(180deg, #4a9eff 0%, #1a3a6e 100%)' }}></div>
                <div className="bar" style={{ height: '20%', background: 'linear-gradient(180deg, #00d4ff 0%, #0066cc 100%)', opacity: 0.5 }}></div>
                <div className="bar" style={{ height: '65%', background: 'linear-gradient(180deg, #4a9eff 0%, #1a3a6e 100%)' }}></div>
                <div className="bar" style={{ height: '25%', background: 'linear-gradient(180deg, #00d4ff 0%, #0066cc 100%)', opacity: 0.5 }}></div>
                <div className="bar" style={{ height: '70%', background: 'linear-gradient(180deg, #4a9eff 0%, #1a3a6e 100%)' }}></div>
                <div className="bar" style={{ height: '30%', background: 'linear-gradient(180deg, #00d4ff 0%, #0066cc 100%)', opacity: 0.5 }}></div>
                <div className="bar" style={{ height: '68%', background: 'linear-gradient(180deg, #4a9eff 0%, #1a3a6e 100%)' }}></div>
                <div className="bar" style={{ height: '28%', background: 'linear-gradient(180deg, #00d4ff 0%, #0066cc 100%)', opacity: 0.5 }}></div>
                <div className="bar" style={{ height: '72%', background: 'linear-gradient(180deg, #4a9eff 0%, #1a3a6e 100%)' }}></div>
                <div className="bar" style={{ height: '35%', background: 'linear-gradient(180deg, #00d4ff 0%, #0066cc 100%)', opacity: 0.5 }}></div>
              </div>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#4a9eff' }}></div>
                <span>엔드포인트</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#00d4ff' }}></div>
                <span>보안 성능</span>
              </div>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-title">🛡️ MDR 운영</div>
            <div className="chart-container">
              <svg className="line-chart" viewBox="0 0 300 80">
                <defs>
                  <linearGradient id="marketGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#ff6b9d', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: '#ff6b9d', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <path d="M 10 60 Q 50 30 100 45 Q 150 20 200 35 Q 250 50 290 25 L 290 80 L 10 80 Z"
                      fill="url(#marketGrad)" />
                <path d="M 10 60 Q 50 30 100 45 Q 150 20 200 35 Q 250 50 290 25"
                      stroke="#ff6b9d" strokeWidth="2" fill="none" />
                <path d="M 10 50 L 75 55 L 150 40 L 225 45 L 290 40"
                      stroke="#00d4ff" strokeWidth="2" fill="none" opacity="0.7" strokeDasharray="5,3"/>
              </svg>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#ff6b9d' }}></div>
                <span>위협 대응</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#00d4ff' }}></div>
                <span>예측 분석</span>
              </div>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-title">🏆 품질 지표 및 규정 준수</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>메트릭</th>
                  <th>현재</th>
                  <th>목표</th>
                  <th>차이</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>품질 점수</td>
                  <td>98.7%</td>
                  <td>99.0%</td>
                  <td style={{ color: '#feca57' }}>-0.3%</td>
                </tr>
                <tr>
                  <td>오탐률</td>
                  <td>0.12%</td>
                  <td>0.10%</td>
                  <td style={{ color: '#ff6b9d' }}>+0.02%</td>
                </tr>
                <tr>
                  <td>규정 준수</td>
                  <td>100%</td>
                  <td>100%</td>
                  <td style={{ color: '#00ff88' }}>0.0%</td>
                </tr>
                <tr>
                  <td>반응 속도</td>
                  <td>0.8초</td>
                  <td>1.0초</td>
                  <td style={{ color: '#00ff88' }}>-0.2초</td>
                </tr>
              </tbody>
            </table>
          </div>
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

      {/* 자동화 플로우 */}
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
          <div className="flow-step" data-step="1">
            <div className="step-icon">
              <div className="step-number">1</div>
              <i className="fas fa-download"></i>
            </div>
            <div className="step-info">
              <div className="step-title">데이터 수집</div>
              <div className="step-status">대기중...</div>
            </div>
          </div>

          <div className="flow-step" data-step="2">
            <div className="step-icon">
              <div className="step-number">2</div>
              <i className="fas fa-brain"></i>
            </div>
            <div className="step-info">
              <div className="step-title">AI 분석</div>
              <div className="step-status">대기중...</div>
            </div>
          </div>

          <div className="flow-step" data-step="3">
            <div className="step-icon">
              <div className="step-number">3</div>
              <i className="fas fa-shield-alt"></i>
            </div>
            <div className="step-info">
              <div className="step-title">위협 평가</div>
              <div className="step-status">대기중...</div>
            </div>
          </div>

          <div className="flow-step" data-step="4">
            <div className="step-icon">
              <div className="step-number">4</div>
              <i className="fas fa-link"></i>
            </div>
            <div className="step-info">
              <div className="step-title">TI 상관분석</div>
              <div className="step-status">대기중...</div>
            </div>
          </div>

          <div className="flow-step" data-step="5">
            <div className="step-icon">
              <div className="step-number">5</div>
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="step-info">
              <div className="step-title">최종 판정</div>
              <div className="step-status">대기중...</div>
            </div>
          </div>

          <div className="flow-step" data-step="6">
            <div className="step-icon">
              <div className="step-number">6</div>
              <i className="fas fa-file-alt"></i>
            </div>
            <div className="step-info">
              <div className="step-title">보고서 생성</div>
              <div className="step-status">대기중...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
