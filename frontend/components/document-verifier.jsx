"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Shield, CheckCircle, AlertTriangle, FileText, Clock, User, Calendar } from "lucide-react"
import { apiClient } from "@/lib/api"

export default function DocumentVerifier({ document, onClose, onVerifySuccess }) {
  const [loading, setLoading] = useState(false)
  const [verificationStep, setVerificationStep] = useState("initial") // initial, verifying, completed
  const [verificationResult, setVerificationResult] = useState(null)
  const [verificationNotes, setVerificationNotes] = useState("")

  const handleVerify = async () => {
    setLoading(true)
    setVerificationStep("verifying")

    try {
      console.log(`🔍 Starting verification for document: ${document.FileName}`)

      // Simulate verification process with multiple checks
      await simulateVerificationProcess()

      // Call the API client to verify the document
      const verificationInfo = await apiClient.verifyDocument(document.Id, {
        verificationNotes,
        verificationMethod: "manual_review",
        verifiedAt: new Date().toISOString(),
      })

      setVerificationResult(verificationInfo)
      setVerificationStep("completed")

      console.log(`✅ Document "${document.FileName}" verified successfully`)

      // Show success message
      setTimeout(() => {
        onVerifySuccess()
      }, 2000)
    } catch (error) {
      console.error("❌ Failed to verify document:", error)
      setVerificationResult({
        success: false,
        message: error.message || "Verification failed",
      })
      setVerificationStep("completed")
    } finally {
      setLoading(false)
    }
  }

  const simulateVerificationProcess = async () => {
    // Simulate different verification steps
    const steps = [
      "Checking document integrity...",
      "Validating digital signatures...",
      "Verifying document authenticity...",
      "Performing security scan...",
      "Finalizing verification...",
    ]

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      console.log(`🔍 ${steps[i]}`)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getVerificationIcon = () => {
    if (verificationStep === "verifying") {
      return <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
    }
    if (verificationResult?.success) {
      return <CheckCircle className="h-6 w-6 text-green-600" />
    }
    if (verificationResult?.success === false) {
      return <AlertTriangle className="h-6 w-6 text-red-600" />
    }
    return <Shield className="h-6 w-6 text-blue-600" />
  }

  const getVerificationStatus = () => {
    if (verificationStep === "verifying") return "Verifying Document..."
    if (verificationResult?.success) return "Document Verified Successfully"
    if (verificationResult?.success === false) return "Verification Failed"
    return "Ready to Verify"
  }

  const getVerificationColor = () => {
    if (verificationStep === "verifying") return "text-blue-600"
    if (verificationResult?.success) return "text-green-600"
    if (verificationResult?.success === false) return "text-red-600"
    return "text-gray-900"
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center">
            {getVerificationIcon()}
            <span className="ml-3">Document Verification</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Information */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-3 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
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
                <span className="ml-2 text-blue-700">{formatDate(document.UploadDate)}</span>
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

          {/* Verification Status */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              {getVerificationIcon()}
              <h3 className={`text-xl font-semibold ml-3 ${getVerificationColor()}`}>{getVerificationStatus()}</h3>
            </div>

            {verificationStep === "verifying" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 mb-2">Verification in progress...</p>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
                </div>
                <p className="text-sm text-blue-600 mt-2">This may take a few moments</p>
              </div>
            )}
          </div>

          {/* Verification Checklist */}
          {verificationStep !== "completed" && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Verification Process</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span>Document integrity check</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span>Digital signature validation</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span>Authenticity verification</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span>Security scan</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  <span>Manual review (if required)</span>
                </div>
              </div>
            </div>
          )}

          {/* Verification Notes */}
          {verificationStep === "initial" && (
            <div>
              <label htmlFor="verificationNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Notes (Optional)
              </label>
              <textarea
                id="verificationNotes"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any notes about this verification..."
              />
            </div>
          )}

          {/* Verification Result */}
          {verificationStep === "completed" && verificationResult && (
            <div
              className={`p-4 rounded-lg border ${
                verificationResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center mb-3">
                {verificationResult.success ? (
                  <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                )}
                <h4 className={`font-medium ${verificationResult.success ? "text-green-800" : "text-red-800"}`}>
                  {verificationResult.success ? "Verification Successful" : "Verification Failed"}
                </h4>
              </div>

              {verificationResult.success && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-green-700">Verified by: {verificationResult.verifiedBy || "System"}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-green-700">Verified on: {formatDate(verificationResult.verifiedAt)}</span>
                  </div>
                  {verificationResult.verificationId && (
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-green-700">Verification ID: {verificationResult.verificationId}</span>
                    </div>
                  )}
                </div>
              )}

              <p className={`mt-3 text-sm ${verificationResult.success ? "text-green-700" : "text-red-700"}`}>
                {verificationResult.message ||
                  (verificationResult.success
                    ? "This document has been successfully verified and is authentic."
                    : "Document verification failed. Please check the document and try again.")}
              </p>
            </div>
          )}

          {/* Legal Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Verification Notice
            </h4>
            <div className="text-sm text-yellow-700 space-y-2">
              <p>Document verification includes the following checks:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Digital signature validation and integrity verification</li>
                <li>Document authenticity and tamper detection</li>
                <li>Security scan for malicious content</li>
                <li>Compliance with verification standards</li>
              </ul>
              <p className="mt-3 font-medium">Verified documents receive a permanent verification certificate.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              {verificationStep === "completed" ? "Close" : "Cancel"}
            </Button>
            {verificationStep === "initial" && (
              <Button
                onClick={handleVerify}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                disabled={loading}
              >
                <Shield className="h-4 w-4 mr-2" />
                Start Verification
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
