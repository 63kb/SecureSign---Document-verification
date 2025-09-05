"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, PenTool, RotateCcw, CheckCircle, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api"

export default function DocumentSigner({ document, onClose, onSignSuccess }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureData, setSignatureData] = useState("")
  const [loading, setLoading] = useState(false)
  const [signatureCreated, setSignatureCreated] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      // Set white background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  const startDrawing = (e) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext("2d")

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    setSignatureCreated(true)
  }

  const draw = (e) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext("2d")

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      const canvas = canvasRef.current
      setSignatureData(canvas.toDataURL())
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    // Clear and set white background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    setSignatureData("")
    setSignatureCreated(false)
  }

  const handleSign = async () => {
    if (!signatureData || !signatureCreated) {
      alert("Please create a signature first")
      return
    }

    setLoading(true)

    try {
      console.log(`✍️ Signing document: ${document.FileName}`)

      // Call the API client to sign the document
      const signatureInfo = await apiClient.signDocument(document.Id, signatureData)

      console.log(`✅ Document "${document.FileName}" signed successfully`)

      // Show success message with signature details
      alert(
        `🎉 Document "${document.FileName}" has been successfully signed!\n\nSigned at: ${new Date(signatureInfo.signedAt).toLocaleString()}`,
      )

      onSignSuccess()
    } catch (error) {
      console.error("❌ Failed to sign document:", error)
      alert(`Failed to sign document: ${error.message || "Please try again or contact support."}`)
    } finally {
      setLoading(false)
    }
  }

  // Touch event handlers for mobile support
  const handleTouchStart = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    })
    startDrawing(mouseEvent)
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseEvent = new MouseEvent("mousemove", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    })
    draw(mouseEvent)
  }

  const handleTouchEnd = (e) => {
    e.preventDefault()
    stopDrawing()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center">
            <PenTool className="h-6 w-6 mr-2 text-blue-600" />
            Sign Document: {document.FileName}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Preview */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-3 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Document Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">File Name:</span>
                <span className="ml-2 text-blue-700">{document.FileName}</span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Size:</span>
                <span className="ml-2 text-blue-700">{document.FormattedSize}</span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Upload Date:</span>
                <span className="ml-2 text-blue-700">{new Date(document.UploadDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Type:</span>
                <span className="ml-2 text-blue-700">{document.ContentType}</span>
              </div>
            </div>
            {document.Description && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <span className="font-medium text-blue-800">Description:</span>
                <span className="ml-2 text-blue-700">{document.Description}</span>
              </div>
            )}
          </div>

          {/* Signature Pad */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <PenTool className="h-5 w-5 mr-2 text-green-600" />
                Create Your Digital Signature
              </h3>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={clearSignature} className="text-gray-600">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>

            <div className="border-2 border-gray-300 rounded-lg p-4 bg-white shadow-inner">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="border border-gray-200 rounded cursor-crosshair w-full touch-none bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm text-gray-500">Draw your signature in the box above</p>
                {signatureCreated && (
                  <div className="flex items-center text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Signature created
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Signature Preview */}
          {signatureData && signatureCreated && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-3 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Digital Signature Preview
              </h4>
              <div className="bg-white border-2 border-green-300 rounded p-3 inline-block shadow-sm">
                <img
                  src={signatureData || "/placeholder.svg"}
                  alt="Your digital signature"
                  className="max-h-16 max-w-full"
                />
              </div>
              <p className="text-sm text-green-700 mt-3 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                This digital signature will be permanently attached to the document with cryptographic security.
              </p>
            </div>
          )}

          {/* Legal Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Legal Notice & Digital Signature Agreement
            </h4>
            <div className="text-sm text-yellow-700 space-y-2">
              <p>By applying your digital signature to this document, you acknowledge and agree that:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Your electronic signature has the same legal effect as a handwritten signature</li>
                <li>This signature will be permanently attached to the document with timestamp verification</li>
                <li>The signature cannot be removed or altered once applied</li>
                <li>You are the authorized signatory for this document</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
              disabled={loading || !signatureData || !signatureCreated}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing...
                </>
              ) : (
                <>
                  <PenTool className="h-4 w-4 mr-2" />
                  Apply Digital Signature
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
