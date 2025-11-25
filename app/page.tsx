"use client"

import { GalleryVerticalEnd, Languages, Volume2, VolumeX } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

import { LoginForm } from "@/components/login-form"
import { SignupForm } from "@/components/signup-form"
import { Button } from "@/components/ui/button"
import Features from "@/components/sections/Features"
import MDR from "@/components/sections/MDR"
import Platform from "@/components/sections/Platform"
import Company from "@/components/sections/Company"
import Contact from "@/components/sections/Contact"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"

type Language = 'ko' | 'en' | 'ja' | 'zh' | 'fr'

const LANGUAGES = {
  ko: { label: '한국어', flag: '🇰🇷' },
  en: { label: 'English', flag: '🇺🇸' },
  ja: { label: '日本語', flag: '🇯🇵' },
  zh: { label: '中文', flag: '🇨🇳' },
  fr: { label: 'Français', flag: '🇫🇷' },
}

// Hero Content with Image Carousel Component
function HeroContentWithCarousel({
  setSignupOpen,
  setAboutOpen
}: {
  setSignupOpen: (open: boolean) => void
  setAboutOpen: (open: boolean) => void
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [imageHeights, setImageHeights] = useState<number[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const images = [
    '/img/1.png',
    '/img/22.png',
    '/img/16.png',
    '/img/9.png',
    '/img/3.png',
    '/img/12.png',
    '/img/26.png'
  ]

  // Load images and calculate their heights
  useEffect(() => {
    const loadImages = async () => {
      const heights = await Promise.all(
        images.map((src) => {
          return new Promise<number>((resolve) => {
            const img = new Image()
            img.onload = () => {
              // Calculate height when width is 100% of container
              // Assume container width is roughly 800px (max-w-5xl)
              const containerWidth = 800
              const aspectRatio = img.height / img.width
              const calculatedHeight = containerWidth * aspectRatio
              // Ensure minimum 400px to prevent blank space
              resolve(Math.max(calculatedHeight, 400))
            }
            img.src = src
          })
        })
      )
      setImageHeights(heights)
    }
    loadImages()
  }, [images])

  // Carousel is now controlled by scroll animation, not timer
  // useEffect(() => {
  //   if (isHovered) return // Pause carousel on hover
  //   const interval = setInterval(() => {
  //     setCurrentImageIndex((prev) => (prev + 1) % images.length)
  //   }, 4000) // Change image every 4 seconds
  //   return () => clearInterval(interval)
  // }, [images.length, isHovered])

  // Auto change image every 5 seconds - NO SCROLL
  useEffect(() => {
    if (isHovered) return

    const timer = setTimeout(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }, 5000) // 5 seconds

    return () => clearTimeout(timer)
  }, [currentImageIndex, isHovered, images.length])

  return (
    <div className="flex h-full flex-col justify-center items-center px-6 max-w-7xl mx-auto">
      {/* Top: Text Content - Centered */}
      <div className="text-center text-white mb-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img
            src="/logo2.png"
            alt="DeFender X Logo"
            className="h-16 w-16 object-contain"
          />
          <div className="text-left">
            <div className="text-sm text-blue-300 font-medium">AI 기반의 차세대 보안</div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              DeFender X
            </h1>
          </div>
        </div>

        <p className="text-xl md:text-2xl text-gray-200 leading-relaxed">
          실시간 위협 탐지부터 자동 대응까지<br />
          엔터프라이즈 보안의 새로운 기준을 제시합니다
        </p>
      </div>

      {/* Bottom: Image Carousel - Wide but Height Limited */}
      <div className="w-full relative max-w-5xl">
        {/* Glass morphism container */}
        <div
          className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm border border-blue-500/30 p-4 shadow-2xl"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false)
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = 0 // Reset scroll on leave
            }
          }}
        >
          <div
            ref={scrollContainerRef}
            className={`relative w-full h-[400px] rounded-xl overflow-hidden bg-gradient-to-br from-blue-900/20 to-purple-900/20`}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {images.map((src, index) => (
              <img
                key={`${src}-${index}`}
                src={src}
                alt={`Dashboard ${index + 1}`}
                className={`w-full transition-opacity duration-1000 ${
                  index === currentImageIndex ? 'opacity-100 block' : 'opacity-0 absolute'
                }`}
                style={{
                  height: 'auto'
                }}
              />
            ))}
          </div>

          {/* Carousel Indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentImageIndex
                    ? 'w-8 bg-blue-500'
                    : 'w-2 bg-gray-500 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -z-10"></div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const heroSectionRef = useRef<HTMLElement>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('')
  const [isMuted, setIsMuted] = useState(true)
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('subtitle-language') as Language) || 'ko'
    }
    return 'ko'
  })

  // Enable subtitles and track current subtitle text
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const enableSubtitles = () => {
      if (video.textTracks.length > 0) {
        const track = video.textTracks[0]
        track.mode = 'hidden' // Hide default browser subtitles

        // Listen for cue changes
        track.addEventListener('cuechange', () => {
          if (track.activeCues && track.activeCues.length > 0) {
            const cue = track.activeCues[0] as VTTCue
            setCurrentSubtitle(cue.text)
          } else {
            setCurrentSubtitle('')
          }
        })
      }
    }

    // Try to play video (handle autoplay restrictions)
    const playVideo = async () => {
      try {
        await video.play()
      } catch (err) {
        console.log('Autoplay prevented, waiting for user interaction')
        // If autoplay fails, mute and try again
        video.muted = true
        setIsMuted(true)
        try {
          await video.play()
        } catch (e) {
          console.log('Video playback failed:', e)
        }
      }
    }

    enableSubtitles()
    video.addEventListener('loadedmetadata', enableSubtitles)
    playVideo()

    return () => {
      video.removeEventListener('loadedmetadata', enableSubtitles)
    }
  }, [])

  // Pause video when scrolling away from Hero section
  useEffect(() => {
    const video = videoRef.current
    const heroSection = heroSectionRef.current

    if (!video || !heroSection) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Hero section is visible - play video
            video.play().catch(err => console.log('Play failed:', err))
          } else {
            // Hero section is not visible - pause video
            video.pause()
          }
        })
      },
      { threshold: 0.5 } // Trigger when 50% of section is visible
    )

    observer.observe(heroSection)

    return () => {
      observer.disconnect()
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // 로그인 처리 후 /admin으로 이동
    router.push("/admin")
  }

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    // 회원가입 처리 후 /admin으로 이동
    router.push("/admin")
  }

  const handleLanguageChange = (lang: Language) => {
    localStorage.setItem('subtitle-language', lang)
    setCurrentLanguage(lang)
    // Reload page to apply new subtitle track
    window.location.reload()
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (video) {
      video.muted = !video.muted
      setIsMuted(!isMuted)
    }
  }

  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 md:p-10">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 font-medium text-white">
            <img
              src="/logo2.png"
              alt="DefenderX Logo"
              className="h-8 w-8 object-contain"
            />
            <span className="text-lg font-bold">DeFender X</span>
          </a>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2 text-white">
          {/* Sound Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Button>

          <ThemeToggle />

          {/* Language Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 gap-1"
              >
                <Languages className="size-4" />
                <span className="text-lg">{LANGUAGES[currentLanguage].flag}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {Object.entries(LANGUAGES).map(([code, { label, flag }]) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => handleLanguageChange(code as Language)}
                  className={`cursor-pointer ${
                    currentLanguage === code ? 'bg-accent' : ''
                  }`}
                >
                  <span className="mr-2 text-lg">{flag}</span>
                  <span>{label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="fixed bottom-6 left-0 right-0 flex items-center justify-center gap-3 z-50">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm"
            onClick={() => setLoginOpen(true)}
          >
            Login
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm"
            onClick={() => setSignupOpen(true)}
          >
            Create Account
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm"
            onClick={() => setAboutOpen(true)}
          >
            About Us
          </Button>
        </div>
      </header>

      {/* Hero Section with Video */}
      <section ref={heroSectionRef} className="relative h-screen snap-start snap-always">
        {/* Background Video */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          preload="auto"
          className="absolute inset-0 z-0 h-full w-full object-cover"
          crossOrigin="anonymous"
        >
          <source src="/defenderx-video-optimized.mp4" type="video/mp4" />
          <track
            kind="subtitles"
            src={`/defender_x_${currentLanguage}.vtt`}
            srcLang={currentLanguage}
            label={LANGUAGES[currentLanguage].label}
            default
          />
        </video>

        {/* Gradient Overlay */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.3))'
          }}
        />

        {/* Main Content - Animated Subtitles */}
        <div className="relative z-20 flex flex-1 items-center justify-center px-6 h-full">
          <div
            key={currentSubtitle}
            className="text-center text-white max-w-4xl subtitle-animate"
          >
            {currentSubtitle ? (
              <div
                className="text-4xl md:text-5xl font-bold leading-tight"
                style={{
                  textShadow: '0 4px 12px rgba(0, 0, 0, 0.9), 0 2px 6px rgba(0, 0, 0, 0.8), 0 8px 24px rgba(0, 0, 0, 0.6)',
                  whiteSpace: 'pre-line'
                }}
              >
                {currentSubtitle}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Hero Content Section */}
      <section className="h-screen snap-start snap-always bg-[#0a0b14]">
        <HeroContentWithCarousel
          setSignupOpen={setSignupOpen}
          setAboutOpen={setAboutOpen}
        />
      </section>

      {/* Features Section */}
      <section className="h-screen snap-start snap-always bg-[#0a0b14]">
        <Features />
      </section>

      {/* MDR Section */}
      <section className="h-screen snap-start snap-always bg-[#0a0b14]">
        <MDR />
      </section>

      {/* Automation Section */}
      <section className="h-screen snap-start snap-always bg-[#0a0b14]">
        <div className="flex h-full flex-col justify-center items-center px-6 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center w-full">
            {/* Left: Image */}
            <div className="order-2 md:order-1">
              <img
                src="/img/21.png"
                alt="Security Compliance Dashboard"
                className="rounded-xl border-2 border-blue-500/40 hover:border-blue-500/70 transition-all hover:scale-[1.02] shadow-2xl"
              />
            </div>

            {/* Right: Text Content */}
            <div className="order-1 md:order-2 text-center md:text-left text-white">
              <h2 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                보안 운영 자동화의 혁신
              </h2>
              <p className="text-xl md:text-2xl text-gray-200 leading-relaxed mb-8">
                복잡한 보안 프로세스를 자동화하고<br />
                대응 시간을 획기적으로 단축합니다
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 p-6 rounded-xl border border-blue-500/30">
                  <div className="text-3xl font-bold text-blue-400 mb-2">8,947</div>
                  <div className="text-sm text-gray-300">활성 사용자</div>
                </div>
                <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 p-6 rounded-xl border border-blue-500/30">
                  <div className="text-3xl font-bold text-green-400 mb-2">24,531</div>
                  <div className="text-sm text-gray-300">보호 중인 엔드포인트</div>
                </div>
                <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 p-6 rounded-xl border border-blue-500/30">
                  <div className="text-3xl font-bold text-orange-400 mb-2">142</div>
                  <div className="text-sm text-gray-300">활성 알림</div>
                </div>
                <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 p-6 rounded-xl border border-blue-500/30">
                  <div className="text-3xl font-bold text-cyan-400 mb-2">6.2분</div>
                  <div className="text-sm text-gray-300">평균 대응 시간</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vulnerability Report Section */}
      <section className="h-screen snap-start snap-always bg-[#0a0b14]">
        <div className="flex h-full flex-col justify-center items-center px-6 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center w-full">
            {/* Left: Text Content */}
            <div className="text-center md:text-left text-white">
              <h2 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                취약점 분석 리포트
              </h2>
              <p className="text-xl md:text-2xl text-gray-200 leading-relaxed mb-8">
                취약점을 자동으로 분석하고 보고서를 생성하여<br />
                메일, 문자, Teams, Slack으로 즉시 전송합니다
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-400 text-sm">✓</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white mb-1">멀티 채널 자동 알림</div>
                    <div className="text-sm text-gray-400">Email, SMS, Teams, Slack, Calendar 연동</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-400 text-sm">✓</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white mb-1">MITRE ATT&CK 매핑</div>
                    <div className="text-sm text-gray-400">취약점과 공격 기법을 자동으로 연결</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-400 text-sm">✓</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white mb-1">SIEM 규칙 자동 생성</div>
                    <div className="text-sm text-gray-400">탐지 규칙을 자동으로 생성하고 적용</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-400 text-sm">✓</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white mb-1">종합 보안 대시보드</div>
                    <div className="text-sm text-gray-400">실용적이고 직관적인 취약점 현황 관리</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span>실시간 동기화</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>자동 리포팅</span>
                </div>
              </div>
            </div>

            {/* Right: Image */}
            <div className="order-1 md:order-2 w-full max-w-4xl">
              <img
                src="/img/23.png"
                alt="Vulnerability Report Dashboard"
                className="w-full h-auto rounded-xl border-2 border-blue-500/40 hover:border-blue-500/70 transition-all hover:scale-[1.02] shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant Section */}
      <section className="h-screen snap-start snap-always bg-[#0a0b14]">
        <div className="flex h-full flex-col justify-center items-center px-6 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              AI 보안 어시스턴트
            </h2>
            <p className="text-xl md:text-2xl text-gray-200 leading-relaxed">
              지연 없이 보안 데이터를 질의하고 분석하세요
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 w-full">
            {/* Left: Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 p-6 rounded-xl border border-purple-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400">🤖</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">94.8%</div>
                <div className="text-sm text-gray-300 mb-1">AI 모델 정확도</div>
                <div className="text-xs text-green-400">↗ +2.3% vs. last week</div>
              </div>

              <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 p-6 rounded-xl border border-orange-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <span className="text-orange-400">⚡</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">67.3%</div>
                <div className="text-sm text-gray-300 mb-1">자동 처리율</div>
                <div className="text-xs text-blue-400">60% workload reduction</div>
              </div>

              <div className="bg-gradient-to-br from-red-900/40 to-pink-900/40 p-6 rounded-xl border border-red-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <span className="text-red-400">🎯</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">98.4%</div>
                <div className="text-sm text-gray-300 mb-1">위협 탐지율</div>
                <div className="text-xs text-green-400">오탐률: 2.1%</div>
              </div>

              <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 p-6 rounded-xl border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-cyan-400">👁️</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">87.6%</div>
                <div className="text-sm text-gray-300 mb-1">예측 정확도</div>
                <div className="text-xs text-gray-400">7 days forecast horizon</div>
              </div>
            </div>

            {/* Right: AI Assistant Chat */}
            <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-xl border border-gray-700/50 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">AI 보안 어시스턴트</div>
                  <div className="text-sm text-gray-400">지연 없이 보안 데이터를 질의하고 분석하세요</div>
                </div>
              </div>

              {/* Sample Question */}
              <div className="bg-purple-900/30 rounded-lg p-4 mb-4 border border-purple-500/30">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                    <span>🤖</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-200 mb-2">
                      안녕하세요! AI 보안 분석가입니다. 현재 시스템 상태에 위협 인텔리전스를 분석하고 있습니다. 무엇을 도와드릴까요?
                    </div>
                    <div className="text-xs text-gray-500">09:30</div>
                  </div>
                </div>
              </div>

              {/* Quick Questions */}
              <div className="flex-1 overflow-y-auto mb-4">
                <div className="text-sm font-semibold text-gray-400 mb-3">추천 질문</div>
                <div className="space-y-2">
                  {[
                    "현재 위협 상황은?",
                    "향후 7일 예상은?",
                    "AI 모델 성능은?",
                    "자동화 현황은?",
                    "가장 위험한 자산은?",
                    "최근 APT 활동은?"
                  ].map((question, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/30 text-sm text-gray-300 transition-colors"
                    >
                      🔍 {question}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="보안 관련 질문을 입력하세요... (예: 현재 위협 상황은?)"
                  className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                  <span className="text-white">➤</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Section */}
      <section className="h-screen snap-start snap-always bg-[#0a0b14]">
        <Platform />
      </section>

      {/* Company Section */}
      <section className="h-screen snap-start snap-always bg-[#0a0b14]">
        <Company />
      </section>

      {/* Contact Section */}
      <section className="h-screen snap-start snap-always bg-[#0a0b14]">
        <Contact />
      </section>

      {/* Login Modal */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Sign In</DialogTitle>
            <DialogDescription>Login to your account</DialogDescription>
          </DialogHeader>
          <LoginForm onSubmit={handleLogin} />
        </DialogContent>
      </Dialog>

      {/* Signup Modal */}
      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Sign Up</DialogTitle>
            <DialogDescription>Create your account</DialogDescription>
          </DialogHeader>
          <SignupForm onSubmit={handleSignup} />
        </DialogContent>
      </Dialog>

      {/* About Us Modal */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>About Us</DialogTitle>
            <DialogDescription>Learn more about DefenderX</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              DefenderX is a leading technology company focused on delivering
              innovative solutions to our customers worldwide.
            </p>
            <p>
              Our mission is to empower businesses with cutting-edge technology
              and exceptional service.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
