"use client"

import { GalleryVerticalEnd, Languages, Volume2, VolumeX } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

import { LoginForm } from "@/components/login-form"
import { SignupForm } from "@/components/signup-form"
import { Button } from "@/components/ui/button"
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

export default function HomePage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('')
  const [isMuted, setIsMuted] = useState(false)
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
    <div className="relative min-h-svh">
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted={false}
        playsInline
        preload="auto"
        className="fixed inset-0 z-0 h-full w-full object-cover"
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

      {/* Gradient Overlay - 투명도 감소 */}
      <div
        className="fixed inset-0 z-10"
        style={{
          background: 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.3))'
        }}
      />

      {/* Content */}
      <div className="relative z-20 flex min-h-svh flex-col gap-4 p-6 md:p-10">
        {/* Header */}
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

          {/* Navigation - 언어/사운드만 */}
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

        {/* Main Content - Animated Subtitles */}
        <div className="flex flex-1 items-center justify-center px-6">
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

        {/* Bottom Navigation - 중앙 하단 */}
        <div className="flex items-center justify-center gap-3 pb-6">
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
      </div>

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
