"use client"

import { GalleryVerticalEnd } from "lucide-react"
import { useState } from "react"

import { LoginForm } from "@/components/login-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function LoginPage() {
  const [open, setOpen] = useState(false)

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
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium text-white">
            <div className="bg-white text-black flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            DefenderX.
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="text-lg px-8 py-6">
                Sign In
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader className="sr-only">
                <DialogTitle>Sign In</DialogTitle>
                <DialogDescription>Login to your account</DialogDescription>
              </DialogHeader>
              <LoginForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
