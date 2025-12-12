"use client"

import { Button } from "@/components/ui/button"
import { Target, Zap, Briefcase, Phone, Mail, MapPin } from "lucide-react"

export default function Contact() {
  const handleTrialClick = () => {
    // Google Form URL로 이동
    window.open("https://forms.gle/your-form-id", "_blank")
  }

  return (
    <section id="contact" className="contact-section">
      <div className="section-header">
        <h2 className="section-title">무료 체험 신청</h2>
        <p className="section-subtitle">
          최대 2개월 무료 체험으로 DeFender X의 강력한<br />
          보안 솔루션을 직접 경험해보세요
        </p>
      </div>

      <div className="contact-content">
        <div className="contact-benefits">
          <div className="benefit-item">
            <div className="benefit-icon">
              <Target className="w-full h-full" />
            </div>
            <h4>전문가 상담</h4>
            <p>보안 전문가가 직접 상담하여 기업 환경에 맞는 솔루션을 제안해 드립니다</p>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">
              <Zap className="w-full h-full" />
            </div>
            <h4>빠른 도입</h4>
            <p>24시간 이내에 체험 환경을 구축하여 즉시 사용 가능</p>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">
              <Briefcase className="w-full h-full" />
            </div>
            <h4>맞춤 지원</h4>
            <p>기업의 보안 요구사항에 최적화된 맞춤형 솔루션 제공</p>
          </div>
        </div>

        <div className="contact-info-row">
          <div className="contact-info-item">
            <Phone className="info-icon" />
            <span>02-1234-5678</span>
          </div>
          <div className="contact-info-item">
            <Mail className="info-icon" />
            <span>contact@inbridge.com</span>
          </div>
          <div className="contact-info-item">
            <MapPin className="info-icon" />
            <span>서울특별시 강남구</span>
          </div>
        </div>

        <div className="trial-cta">
          <Button
            size="lg"
            className="trial-button"
            onClick={handleTrialClick}
          >
            무료 체험 신청하기
          </Button>
          <p className="trial-note">* 신용카드 등록 없이 체험 가능합니다</p>
        </div>
      </div>
    </section>
  )
}
