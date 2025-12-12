"use client"

import { BarChart3, Zap, ShieldCheck, Monitor, Activity, TrendingUp } from "lucide-react"

export default function Platform() {
  return (
    <section id="platform" className="platform-section">
      <div className="section-header">
        <h2 className="section-title">통합 보안 관제 플랫폼</h2>
        <p className="section-subtitle">
          모든 보안 인프라를 한눈에 관리하는<br />
          직관적인 대시보드를 제공합니다
        </p>
      </div>

      <div className="platform-grid">
        <div className="platform-card">
          <div className="card-icon">
            <BarChart3 className="w-full h-full" />
          </div>
          <h4>실시간 모니터링</h4>
          <p>24/7 보안 이벤트를 실시간으로 추적하고 시각화하여 즉각적인 위협 파악</p>
        </div>
        <div className="platform-card">
          <div className="card-icon">
            <Zap className="w-full h-full" />
          </div>
          <h4>빠른 탐지</h4>
          <p>0.1초 이내 위협을 식별하는 초고속 탐지 시스템</p>
        </div>
        <div className="platform-card">
          <div className="card-icon">
            <ShieldCheck className="w-full h-full" />
          </div>
          <h4>자동 차단</h4>
          <p>AI 기반 자동화 시스템으로 위협에 즉각 대응</p>
        </div>
        <div className="platform-card">
          <div className="card-icon">
            <Monitor className="w-full h-full" />
          </div>
          <h4>통합 대시보드</h4>
          <p>모든 보안 인프라를 하나의 화면에서 통합 관리</p>
        </div>
        <div className="platform-card">
          <div className="card-icon">
            <Activity className="w-full h-full" />
          </div>
          <h4>로그 분석</h4>
          <p>방대한 로그 데이터를 실시간으로 수집하고 분석</p>
        </div>
        <div className="platform-card">
          <div className="card-icon">
            <TrendingUp className="w-full h-full" />
          </div>
          <h4>트렌드 예측</h4>
          <p>AI 기반 위협 트렌드 분석 및 예측 기능</p>
        </div>
      </div>
    </section>
  )
}
