'use client'

import { useEffect } from 'react'

export default function DashboardTestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Load Font Awesome CSS dynamically
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  return <>{children}</>
}
