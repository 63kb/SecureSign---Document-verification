"use client"

import { useEffect, useRef } from "react"

export default function QRCodeGenerator({ value, size = 128, className = "", onGenerated = null }) {
  const canvasRef = useRef(null)

  // Add this at the beginning of the component
  if (typeof window === "undefined") {
    return null // Don't render on server
  }

  useEffect(() => {
    if (value && canvasRef.current) {
      generateQRCode()
    }
  }, [value, size])

  const generateQRCode = async () => {
    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      // Set canvas size
      canvas.width = size
      canvas.height = size

      // Clear canvas with white background
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, size, size)

      // Use QR Server API to generate QR code
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&format=png&margin=10`

      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        // Draw the QR code image on canvas
        ctx.drawImage(img, 0, 0, size, size)

        // Call callback with generated QR code data URL
        if (onGenerated) {
          const dataURL = canvas.toDataURL()
          onGenerated(dataURL)
        }
      }

      img.onerror = () => {
        // Fallback: Draw a simple pattern if API fails
        drawFallbackQR(ctx, size)
        if (onGenerated) {
          const dataURL = canvas.toDataURL()
          onGenerated(dataURL)
        }
      }

      img.src = qrApiUrl
    } catch (error) {
      console.error("Failed to generate QR code:", error)
      // Draw fallback pattern
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      drawFallbackQR(ctx, size)
    }
  }

  const drawFallbackQR = (ctx, size) => {
    // Draw a simple QR-like pattern as fallback
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, size, size)

    ctx.fillStyle = "#000000"
    const cellSize = size / 21 // Standard QR code is 21x21 modules

    // Draw corner markers
    drawCornerMarker(ctx, 0, 0, cellSize)
    drawCornerMarker(ctx, 14 * cellSize, 0, cellSize)
    drawCornerMarker(ctx, 0, 14 * cellSize, cellSize)

    // Draw some random pattern in the middle
    for (let i = 9; i < 12; i++) {
      for (let j = 9; j < 12; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize)
        }
      }
    }

    // Add text overlay
    ctx.fillStyle = "#666666"
    ctx.font = `${Math.floor(size / 10)}px Arial`
    ctx.textAlign = "center"
    ctx.fillText("QR Code", size / 2, size - 10)
  }

  const drawCornerMarker = (ctx, x, y, cellSize) => {
    // Draw 7x7 corner marker
    ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize)
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize)
    ctx.fillStyle = "#000000"
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize)
  }

  const downloadQRCode = () => {
    // Ensure we're in browser environment
    if (typeof window === "undefined" || typeof document === "undefined") {
      console.warn("Download not available in server environment")
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      console.warn("Canvas not available for download")
      return
    }

    try {
      const link = document.createElement("a")
      link.download = `qr-code-${Date.now()}.png`
      link.href = canvas.toDataURL()
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Failed to download QR code:", error)
    }
  }

  const shouldRender = typeof window !== "undefined"

  if (!value || !shouldRender) return null

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <canvas ref={canvasRef} className="border border-gray-200 rounded-lg shadow-sm" />
      <button onClick={downloadQRCode} className="text-xs text-blue-600 hover:text-blue-800 underline">
        Download QR Code
      </button>
    </div>
  )
}
