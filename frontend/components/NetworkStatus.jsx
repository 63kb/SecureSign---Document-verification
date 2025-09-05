"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff } from "lucide-react"

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <div className="flex items-center">
      {isOnline ? (
        <div className="flex items-center text-green-600 text-sm">
          <Wifi className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Online</span>
        </div>
      ) : (
        <div className="flex items-center text-red-600 text-sm">
          <WifiOff className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Offline</span>
        </div>
      )}
    </div>
  )
}
