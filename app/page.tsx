"use client"

import { GalleryVerticalEnd } from "lucide-react"
import { useState } from "react"
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
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  const router = useRouter()
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

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

  return (
    <div className="relative min-h-svh">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 z-0 h-full w-full object-cover"
      >
        <source src="/defenderx-video.mp4" type="video/mp4" />
      </video>

      {/* Gradient Overlay */}
      <div
        className="fixed inset-0 z-10"
        style={{
          background: 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7))'
        }}
      />

      {/* Content */}
      <div className="relative z-20 flex min-h-svh flex-col gap-4 p-6 md:p-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 font-medium text-white">
            <div className="bg-white text-black flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            DefenderX
          </a>

          {/* Navigation */}
          <div className="flex items-center gap-2 text-white">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => setLoginOpen(true)}
            >
              Login
            </Button>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => setSignupOpen(true)}
            >
              Create Account
            </Button>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => setAboutOpen(true)}
            >
              About Us
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-4">Welcome to DefenderX</h1>
            <p className="text-xl text-white/80">Your trusted partner in innovation</p>
          </div>
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
