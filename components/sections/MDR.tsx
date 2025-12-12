"use client"

import { Settings, Search, Shield } from "lucide-react"

export default function MDR() {
  return (
    <section id="mdr" className="mdr-section">
      <div className="section-header">
        <h2 className="section-title">실시간 위협 탐지부터 대응까지</h2>
        <p className="section-subtitle">
          DeFender X는 24/7 호스트 모니터링을 통해<br />
          위협 탐지와 신속한 대응으로 보안을 한층 강화합니다.
        </p>
      </div>

      <div className="mdr-content">
        <div className="mdr-features">
          <div className="mdr-feature">
            <div className="feature-icon">
              <Settings className="w-full h-full" />
            </div>
            <h4 className="feature-title">Managed</h4>
            <p className="feature-description">
              인공지능 기반의 AI MDR 플랫폼은 보안 이벤트를 자동 수집·정리하고 위협 데이터를 통합 관리해,
              고객사가 보안 환경을 한눈에 파악하고 효율적으로 운영할 수 있도록 지원합니다.
            </p>
          </div>

          <div className="mdr-feature">
            <div className="feature-icon">
              <Search className="w-full h-full" />
            </div>
            <h4 className="feature-title">Detection</h4>
            <p className="feature-description">
              AI가 로그·네트워크·엔드포인트 데이터를 실시간 분석해 다양한 위협을 신속히 식별하고,
              고객사의 위협 가시성을 크게 강화합니다.
            </p>
          </div>

          <div className="mdr-feature">
            <div className="feature-icon">
              <Shield className="w-full h-full" />
            </div>
            <h4 className="feature-title">Response</h4>
            <p className="feature-description">
              탐지된 위협은 AI 기반 워크플로우로 자동화된 조치로 이어지며, 침해 확산을 효과적으로 억제합니다.
              또한 고객 환경과 정책에 맞춘 유연한 대응으로 안전하고 효율적인 보안 운영을 지원합니다.
            </p>
          </div>
        </div>

        <div className="mdr-stats">
          <div className="stat-card">
            <div className="stat-value">10M+</div>
            <div className="stat-label">이벤트 처리량/sec</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">0.1초</div>
            <div className="stat-label">탐지 시간</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">99.9%</div>
            <div className="stat-label">정확도</div>
          </div>
        </div>
      </div>
    </section>
  )
}
