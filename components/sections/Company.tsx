"use client"

import { CheckCircle2, Building2, Users, Award } from "lucide-react"

export default function Company() {
  const products = [
    "Microsoft Teams 어플리케이션",
    "Microsoft Office Add-ins",
    "IVR 콜센터, AI 상담사",
    "ZOOM 워크스테이션 화이트라벨",
    "MS 원드라이브 & 쉐어포인트 솔루션"
  ]

  const stats = [
    { icon: Users, value: "180+", label: "고객사" },
    { icon: Award, value: "99.9%", label: "고객 만족도" }
  ]

  return (
    <section id="company" className="company-section">
      <div className="section-header">
        <h2 className="section-title">
          차세대 보안을 설계하는<br />
          인텔리전트 파트너
        </h2>
        <p className="section-subtitle">
          Inbridge는 10년간 축적한 경험과 기술력을 바탕으로<br />
          기업 보안의 새로운 가능성을 열어갑니다.
        </p>
      </div>

      <div className="company-stats-row">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="company-stat">
              <Icon className="stat-icon" />
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="company-content">
        <div className="company-info">
          <h3>보안 혁신을 실현하는 기술 중심 기업</h3>
          <p>
            Inbridge 솔루션즈는 협업·보안·인증 솔루션으로 공공과 기업의 디지털 혁신을 스마트하고 안전하게 지원해왔습니다.
          </p>
          <p>
            Inbridge는 자체 보안 플랫폼 DeFender X로 지능형 위협 대응과 보안 관리를 제공하여, 고객의 안정적이고 혁신적인 디지털 성장을 지원합니다.
          </p>
        </div>

        <div className="company-products">
          <h4>Our Products</h4>
          <ul className="products-list">
            {products.map((product, idx) => (
              <li key={idx}>
                <CheckCircle2 className="check-icon" />
                <span>{product}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
