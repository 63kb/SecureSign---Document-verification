"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, FileText, Download, ArrowLeft, CheckCircle, AlertCircle, Users } from "lucide-react"
import { apiClient } from "@/lib/api"
import Link from "next/link"

export default function DocumentViewer() {
  const params = useParams()
  const router = useRouter()
  const [document, setDocument] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [downloading, setDownloading] = useState(false)
  const [sharingInfo, setSharingInfo] = useState(null)

  useEffect(() => {
    if (params.id) {
      fetchDocument()
    }
  }, [params.id])

  const fetchDocument = async () => {
    try {
      console.log(`📋 Fetching document with ID: ${params.id}`)

      // Try to get document metadata first
      const metadata = await apiClient.getDocumentMetadata(params.id)

      // Add signature status
      const documentWithSignature = {
        ...metadata,
        IsSigned: apiClient.isDocumentSigned(params.id),
        SignatureInfo: apiClient.getSignatureInfo(params.id),
      }

      setDocument(documentWithSignature)
      console.log("✅ Document fetched:", documentWithSignature)
    } catch (error) {
      console.error("❌ Failed to fetch document:", error)

      if (error.message.includes("404")) {
        setError("Document not found. It may have been deleted or you don't have access to it.")
      } else if (error.message.includes("401")) {
        setError("Authentication required. Please log in to view this document.")
      } else if (error.message.includes("403")) {
        setError("Access denied. You don't have permission to view this document.")
      } else {
        setError(`Failed to load document: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!document) return

    setDownloading(true)
    try {
      await apiClient.downloadDocument(document.Id, document.FileName)
    } catch (error) {
      console.error("❌ Download failed:", error)
      alert(`Download failed: ${error.message}`)
    } finally {
      setDownloading(false)
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

  useEffect(() => {
    if (document) {
      // Fetch sharing information
      const shares = apiClient.getSharedDocuments()
      const documentShares = Object.values(shares).filter((share) => share.documentId === document.Id)
      setSharingInfo(documentShares)
    }
  }, [document])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Document</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Sign In</Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">SecureSign</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Document Header */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <FileText className="h-6 w-6 mr-3 text-blue-600" />
              {document.FileName}
              {document.IsSigned && (
                <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Digitally Signed
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Document Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Document Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">File Size:</span>
                    <span className="font-medium">{document.FormattedSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Upload Date:</span>
                    <span className="font-medium">{formatDate(document.UploadDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">File Type:</span>
                    <span className="font-medium">{document.ContentType}</span>
                  </div>
                  {document.Category && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium">{document.Category}</span>
                    </div>
                  )}
                </div>

                {document.Description && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-600">{document.Description}</p>
                  </div>
                )}
              </div>

              {/* Signature Information */}
              {document.IsSigned && document.SignatureInfo && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Digital Signature</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <span className="font-medium text-green-800">Verified Digital Signature</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Signed Date:</span>
                        <span className="font-medium text-green-800">
                          {formatDate(document.SignatureInfo.signedAt)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Signed By:</span>
                        <span className="font-medium text-green-800">{document.SignatureInfo.signedBy}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs text-green-600">
                        This document has been digitally signed and verified. The signature ensures the document's
                        authenticity and integrity.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sharing Information */}
              {sharingInfo && sharingInfo.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Sharing Information</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Users className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-800">Shared with {sharingInfo.length} user(s)</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      {sharingInfo.map((share, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-blue-700">{share.shareWithEmail}</span>
                          <span className="text-blue-600">{formatDate(share.sharedAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-center space-x-4">
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Document
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start">
              <Shield className="h-6 w-6 text-blue-600 mr-3 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Security & Privacy</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• This document is protected with enterprise-grade security</p>
                  <p>• All downloads are logged and monitored</p>
                  <p>• Digital signatures ensure document authenticity</p>
                  <p>• Access may require authentication based on document settings</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
