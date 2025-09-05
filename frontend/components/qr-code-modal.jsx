"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, QrCode, Download, Share2, Copy, ExternalLink, AlertCircle } from "lucide-react"
import QRCodeGenerator from "./qr-code-generator"

export default function QRCodeModal({ document, onClose }) {
  const [qrCodeData, setQRCodeData] = useState("")
  const [copied, setCopied] = useState(false)

  if (!document) return null

  // Add this check at the beginning of the component
  if (typeof window === "undefined") {
    return null // Don't render on server
  }

  // Generate the document access URL only in browser
  const documentUrl = typeof window !== "undefined" ? `${window.location.origin}/document/${document.Id}` : ""

  const downloadQRCode = () => {
    // Ensure we're in browser environment and have access to document
    if (typeof window === "undefined" || typeof document === "undefined" || !qrCodeData) {
      console.warn("Download not available - missing browser environment or QR data")
      return
    }

    try {
      const link = document.createElement("a")
      link.download = `${document.FileName}-qr-code.png`
      link.href = qrCodeData
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Failed to download QR code:", error)
    }
  }

  const copyToClipboard = async (text) => {
    // Ensure we're in browser environment
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      console.warn("Clipboard not available in server environment")
      return
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback for older browsers
        if (typeof document !== "undefined") {
          const textArea = document.createElement("textarea")
          textArea.value = text
          textArea.style.position = "fixed"
          textArea.style.left = "-999999px"
          textArea.style.top = "-999999px"
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand("copy")
          document.body.removeChild(textArea)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      }
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const shareDocument = async () => {
    // Ensure we're in browser environment
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      console.warn("Share not available in server environment")
      return
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Document: ${document.FileName}`,
          text: `View this secure document: ${document.FileName}`,
          url: documentUrl,
        })
      } catch (error) {
        console.error("Failed to share:", error)
        // Fallback to copying URL
        copyToClipboard(documentUrl)
      }
    } else {
      // Fallback to copying URL
      copyToClipboard(documentUrl)
    }
  }

  const openInNewTab = () => {
    // Ensure we're in browser environment
    if (typeof window === "undefined") {
      console.warn("Window operations not available in server environment")
      return
    }

    window.open(documentUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center">
            <QrCode className="h-5 w-5 mr-2 text-blue-600" />
            Document QR Code
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">{document.FileName}</h3>
            <p className="text-sm text-blue-700">
              {document.FormattedSize} • Uploaded {new Date(document.UploadDate).toLocaleDateString()}
            </p>
            {document.Description && <p className="text-sm text-blue-600 mt-2">{document.Description}</p>}
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <QRCodeGenerator value={documentUrl} size={200} onGenerated={setQRCodeData} />
          </div>

          {/* Document URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Document Access URL:</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={documentUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-700"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(documentUrl)}
                className="text-blue-600 hover:text-blue-700"
              >
                {copied ? "Copied!" : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-blue-600" />
              How to use this QR Code:
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Scan with any QR code reader or camera app</li>
              <li>• Share the QR code to give others access</li>
              <li>• The link will open the document viewer</li>
              <li>• Authentication may be required for private documents</li>
            </ul>
          </div>

          {/* QR Code Features */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-800 mb-2">✨ QR Code Features:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Works offline once generated</li>
              <li>• High-resolution PNG download</li>
              <li>• Mobile-friendly scanning</li>
              <li>• Secure document access</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={shareDocument} className="text-green-600 hover:text-green-700">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={downloadQRCode}
              disabled={!qrCodeData}
              className="text-blue-600 hover:text-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR
            </Button>
            <Button variant="outline" onClick={openInNewTab} className="text-purple-600 hover:text-purple-700">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Link
            </Button>
            <Button onClick={() => copyToClipboard(documentUrl)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Copy className="h-4 w-4 mr-2" />
              {copied ? "Copied!" : "Copy URL"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
