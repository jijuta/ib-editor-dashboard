"use client"

import { useEffect, useRef, useState } from "react"

const CARDS_DATA = [
  {
    id: 1,
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 6a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3A.75.75 0 017.5 6zm-.75 2.25a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zm0 3a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zm0 3a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zM15 5.25v1.875c0 .207.168.375.375.375H17.5l-2.5-2.25z" clipRule="evenodd" />
      </svg>
    ),
    title: "AI 리포트",
    subtitle: "AI-powered reports for clear, actionable insights",
    description: "AI가 생성한 인텔리전스 리포트는 인시던트를 다양한 기간 단위로 분석해 보안 현황과 대응 방안을 한눈에 보여줍니다.",
    stats: [
      { value: "평균 1분", label: "생성 시간" }
    ]
  },
  {
    id: 2,
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.678 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z" clipRule="evenodd" />
      </svg>
    ),
    title: "AI 어시스턴트",
    subtitle: "AI Assistant to provide immediate support for cybersecurity questions",
    description: "사이버 보안 관련 궁금증을 즉각 해결하는 지능형 도우미. 보안 분석·인시던트 대응·위협 정보 등에서 빠르고 정확한 답변을 제공해 안전하고 효율적인 의사결정을 지원합니다.",
    stats: [
      { value: "평균 5초", label: "답변 생성 시간" },
      { value: "24/7", label: "학습데이터 양" }
    ]
  },
  {
    id: 3,
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71L10.018 14.25H2.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
      </svg>
    ),
    title: "TI",
    subtitle: "Threat Intelligence",
    description: "DeFender X Threat Intelligence는 외부 TI와 결합해 고객 환경의 침해 위협을 신속히 식별·분석해 드립니다.",
    stats: [
      { value: "100만개+", label: "총 위협지표" },
      { value: "2,000건/일", label: "신규 수집지표" }
    ]
  },
  {
    id: 4,
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.814 3.477 10.815 8.443 13.049a.75.75 0 00.614 0C16.273 20.565 19.75 15.564 19.75 9.75a12.74 12.74 0 00-.635-4.235.75.75 0 00-.722-.515 11.209 11.209 0 01-7.877-3.08zM15.75 9.75a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
      </svg>
    ),
    title: "인시던트 관리",
    subtitle: "Incident Management",
    description: "인시던트를 한눈에 확인하고 통합 관리하며, AI를 통해 탐지부터 대응까지 전 과정을 신속하고 효율적으로 지원합니다.",
    stats: [
      { value: "98% 단축", label: "대응 시간" },
      { value: "99%", label: "자동화율" }
    ]
  }
]

export default function Features() {
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 자동 로테이션
  useEffect(() => {
    const startRotation = () => {
      intervalRef.current = setInterval(() => {
        if (!isHovering) {
          setCurrentCardIndex((prev) => (prev + 1) % CARDS_DATA.length)
        }
      }, 4000)
    }

    startRotation()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isHovering])

  const handleCardHover = (index: number, hovering: boolean) => {
    setIsHovering(hovering)
    if (hovering) {
      setCurrentCardIndex(index)
    }
  }

  return (
    <section id="features" className="features-section">
      <div className="section-header">
        <h2 className="section-title">AI 기반 통합 보안 솔루션</h2>
        <p className="section-subtitle">
          DeFender X의 핵심 기능으로<br /> 엔터프라이즈 보안을 한층 강화하세요
        </p>
      </div>

      <div className="cards-container">
        {CARDS_DATA.map((card, index) => (
          <div
            key={card.id}
            className={`card-3d ${currentCardIndex === index ? 'active' : ''}`}
            onMouseEnter={() => handleCardHover(index, true)}
            onMouseLeave={() => handleCardHover(index, false)}
          >
            <div className="card-content">
              <div className="card-icon">{card.icon}</div>
              <h3 className="card-title">{card.title}</h3>
              <p className="card-subtitle">{card.subtitle}</p>
              <p className="card-description">{card.description}</p>
              <div className="card-stats">
                {card.stats.map((stat, idx) => (
                  <div key={idx} className="stat">
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
