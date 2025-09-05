"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Share2, Mail, UserPlus, AlertCircle, CheckCircle } from "lucide-react"
import { apiClient } from "@/lib/api"

export default function DocumentShareModal({ document, onClose, onShareSuccess }) {
  const [shareEmail, setShareEmail] = useState("")
  const [permissions, setPermissions] = useState({
    canView: true,
    canSign: true,
    canVerify: true,
    canShare: false,
  })
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleShare = async (e) => {
    e.preventDefault()

    if (!shareEmail.trim()) {
      setError("Please enter an email address")
      return
    }

    if (!shareEmail.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    // Check if trying to share with self
    const currentUserEmail = apiClient.getCurrentUserEmail()
    if (shareEmail.trim().toLowerCase() === currentUserEmail.toLowerCase()) {
      setError("You cannot share a document with yourself")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      console.log(`📤 Sharing document ${document.FileName} with ${shareEmail}`)

      const shareData = {
        documentId: document.Id,
        shareWithEmail: shareEmail.trim().toLowerCase(),
        permissions,
        message: message.trim(),
      }

      const result = await apiClient.shareDocument(shareData)

      if (result.success) {
        setSuccess(`Document "${document.FileName}" has been shared with ${shareEmail}`)

        setTimeout(() => {
          onShareSuccess()
        }, 2000)
      } else {
        setError(result.message || "Failed to share document")
      }
    } catch (error) {
      console.error("❌ Failed to share document:", error)
      setError(error.message || "Failed to share document")
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = (permission) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center">
            <Share2 className="h-5 w-5 mr-2 text-blue-600" />
            Share Document
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
          </div>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <h3 className="font-medium text-green-800">Document Shared Successfully!</h3>
                  <p className="text-sm text-green-700 mt-1">{success}</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleShare} className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="shareEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Share with Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="email"
                    id="shareEmail"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter recipient's email"
                    required
                  />
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={permissions.canView}
                      onChange={() => handlePermissionChange("canView")}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled // Always enabled
                    />
                    <span className="ml-2 text-sm text-gray-700">Can view document</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={permissions.canSign}
                      onChange={() => handlePermissionChange("canSign")}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Can sign document</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={permissions.canVerify}
                      onChange={() => handlePermissionChange("canVerify")}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Can verify document</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={permissions.canShare}
                      onChange={() => handlePermissionChange("canShare")}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Can share with others</span>
                  </label>
                </div>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a message for the recipient..."
                />
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading || !shareEmail.trim()}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sharing...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Share Document
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Info Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium mb-1">Demo Mode - Sharing Information:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>This is a demo implementation using localStorage</li>
                  <li>In production, this would integrate with your backend API</li>
                  <li>Shared documents will appear in the recipient's dashboard</li>
                  <li>Permissions control what actions recipients can perform</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
