"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Shield,
  Upload,
  FileText,
  Download,
  Trash2,
  PenTool,
  Plus,
  LogOut,
  Search,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  QrCode,
  ShieldCheck,
  Share2,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api"
import DocumentUpload from "@/components/DocumentUpload"
import DocumentSigner from "@/components/DocumentSigner"
import DocumentVerifier from "@/components/document-verifier"
import ConfirmationDialog from "@/components/ConfirmationDialog"
import QRCodeModal from "@/components/qr-code-modal"
import DocumentShareModal from "@/components/DocumentShareModal"

export default function Dashboard() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [showSigner, setShowSigner] = useState(false)
  const [showVerifier, setShowVerifier] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [downloadingId, setDownloadingId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState("online")
  const [lastError, setLastError] = useState(null)

  const { logout } = useAuth()

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus("online")
      console.log("🌐 Connection restored")
      fetchDocuments()
    }

    const handleOffline = () => {
      setConnectionStatus("offline")
      console.log("📡 Connection lost")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    setConnectionStatus(navigator.onLine ? "online" : "offline")

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      console.log("📋 Fetching documents...")
      setLastError(null)

      if (!navigator.onLine) {
        throw new Error("No internet connection. Please check your network and try again.")
      }

      const docs = await apiClient.getDocuments()

      const docsWithStatus = docs.map((doc) => {
        // Check if this is a shared document
        let isOwner = true
        if (doc.IsOwner === false && (doc.SharedWith || doc.SharedBy || doc.AccessType === "shared")) {
          console.log(`📋 Document ${doc.FileName} is shared`)
          isOwner = false
        } else {
          console.log(`📋 Document ${doc.FileName} - assuming ownership (original IsOwner: ${doc.IsOwner})`)
          isOwner = true
        }

        return {
          ...doc,
          IsOwner: isOwner,
          IsSigned: apiClient.isDocumentSigned(doc.Id),
          SignatureInfo: apiClient.getSignatureInfo(doc.Id),
          IsVerified: apiClient.isDocumentVerified(doc.Id),
          VerificationInfo: apiClient.getVerificationInfo(doc.Id),
        }
      })

      setDocuments(docsWithStatus)
      console.log("✅ Documents fetched:", docsWithStatus)
    } catch (error) {
      console.error("❌ Failed to fetch documents:", error)
      setLastError(`Failed to fetch documents: ${error.message}`)

      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        console.warn("🔐 Authentication may have expired")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (documentItem) => {
    if (!documentItem?.Id) {
      console.error("Invalid document item provided for download")
      alert("Invalid document item")
      return
    }

    if (!navigator.onLine) {
      alert("No internet connection. Please check your network and try again.")
      return
    }

    setDownloadingId(documentItem.Id)

    try {
      console.log(`📥 Starting download for document: ${documentItem.FileName}`)
      await apiClient.downloadDocument(documentItem.Id, documentItem.FileName)
      console.log(`✅ Download completed: ${documentItem.FileName}`)
    } catch (error) {
      console.error("❌ Download failed:", error)

      let errorMessage = "Download failed"
      if (error.message.includes("ERR_INTERNET_DISCONNECTED")) {
        errorMessage = "No internet connection. Please check your network and try again."
      } else if (error.message.includes("404")) {
        errorMessage = "Document not found. It may have been deleted."
      } else if (error.message.includes("403")) {
        errorMessage = "Access denied. You don't have permission to download this document."
      } else if (error.message.includes("401")) {
        errorMessage = "Authentication expired. Please log in again."
      } else {
        errorMessage = `Download failed: ${error.message || "Unknown error"}`
      }

      alert(errorMessage)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async () => {
    if (!documentToDelete) {
      console.error("❌ No document selected for deletion")
      alert("No document selected for deletion")
      return
    }

    console.log("🗑️ DELETE OPERATION STARTED")
    console.log("📋 Document to delete:", documentToDelete)

    if (!navigator.onLine) {
      const message = "No internet connection. Please check your network and try again."
      console.error("❌", message)
      alert(message)
      return
    }

    const token = apiClient.getToken()
    console.log("🔑 Token check:", token ? `Present (${token.substring(0, 20)}...)` : "❌ MISSING")

    if (!token) {
      const message = "Authentication required. Please log in again."
      console.error("❌", message)
      alert(message)
      return
    }

    // Check document ownership - only owners can delete
    if (documentToDelete.IsOwner === false) {
      const message = "You don't have permission to delete this document. Only the document owner can delete it."
      console.error("❌", message)
      alert(message)
      return
    }

    setDeletingId(documentToDelete.Id)
    setLastError(null)

    try {
      console.log(`🗑️ Attempting to delete document ID: ${documentToDelete.Id}`)
      console.log(`📄 Document name: ${documentToDelete.FileName}`)

      const response = await apiClient.deleteDocument(documentToDelete.Id)
      console.log("✅ Delete API response:", response)

      // Update local state immediately
      setDocuments((prevDocs) => {
        const updatedDocs = prevDocs.filter((doc) => doc.Id !== documentToDelete.Id)
        console.log(`📊 Documents count: ${prevDocs.length} → ${updatedDocs.length}`)
        return updatedDocs
      })

      // Clean up local storage for signed/verified documents
      if (apiClient.isDocumentSigned(documentToDelete.Id)) {
        const signedDocs = apiClient.getSignedDocuments()
        delete signedDocs[documentToDelete.Id]
        if (typeof window !== "undefined") {
          localStorage.setItem("signed_documents", JSON.stringify(signedDocs))
          console.log("🧹 Cleaned up signed document from localStorage")
        }
      }

      if (apiClient.isDocumentVerified(documentToDelete.Id)) {
        const verifiedDocs = apiClient.getVerifiedDocuments()
        delete verifiedDocs[documentToDelete.Id]
        if (typeof window !== "undefined") {
          localStorage.setItem("verified_documents", JSON.stringify(verifiedDocs))
          console.log("🧹 Cleaned up verified document from localStorage")
        }
      }

      console.log(`✅ Document "${documentToDelete.FileName}" deleted successfully`)

      // Close the confirmation dialog
      setShowDeleteConfirm(false)
      setDocumentToDelete(null)

      // Show success message
      alert(`✅ Document "${documentToDelete.FileName}" has been deleted successfully!`)

      // Refresh the document list after a short delay
      setTimeout(() => {
        console.log("🔄 Refreshing document list...")
        fetchDocuments()
      }, 500)
    } catch (error) {
      console.error("❌ DELETE OPERATION FAILED")
      console.error("Error details:", error)

      let errorMessage = "Failed to delete document"

      if (error.message.includes("ERR_INTERNET_DISCONNECTED") || error.message.includes("ERR_NETWORK")) {
        errorMessage = "No internet connection. Please check your network and try again."
      } else if (error.message.includes("404")) {
        errorMessage = "Document not found. It may have already been deleted."
        // Remove from local state if 404
        setDocuments((prevDocs) => prevDocs.filter((doc) => doc.Id !== documentToDelete.Id))
      } else if (error.message.includes("403")) {
        errorMessage = "Access denied. You don't have permission to delete this document."
      } else if (error.message.includes("401")) {
        errorMessage = "Authentication expired. Please log in again."
      } else if (error.message.includes("409")) {
        errorMessage = "Cannot delete document. It may be in use or have dependencies."
      } else if (error.message.includes("500")) {
        errorMessage = "Server error. Please try again later or contact support."
      } else {
        errorMessage = `Failed to delete document: ${error.message || "Unknown error"}`
      }

      console.error("❌ Final error message:", errorMessage)
      setLastError(errorMessage)
      alert(`❌ ${errorMessage}`)

      // Refresh documents to sync with server state
      console.log("🔄 Refreshing documents after error...")
      fetchDocuments()
    } finally {
      setDeletingId(null)
      console.log("🏁 DELETE OPERATION COMPLETED")
    }
  }

  const handleSign = (documentItem) => {
    setSelectedDocument(documentItem)
    setShowSigner(true)
  }

  const handleVerify = (documentItem) => {
    setSelectedDocument(documentItem)
    setShowVerifier(true)
  }

  const handleShowQRCode = (documentItem) => {
    setSelectedDocument(documentItem)
    setShowQRCode(true)
  }

  const handleShare = (documentItem) => {
    setSelectedDocument(documentItem)
    setShowShareModal(true)
  }

  const confirmDelete = (document) => {
    console.log("🗑️ CONFIRM DELETE TRIGGERED")
    console.log("📋 Document:", document)
    console.log("👤 IsOwner:", document?.IsOwner)

    // Check if document is undefined or null
    if (!document || !document.Id) {
      const message = "Invalid document selected for deletion."
      console.error("❌", message)
      alert(message)
      return
    }

    // Only allow deletion if user is the owner
    if (document.IsOwner === false) {
      const message = "You cannot delete shared documents. Only the document owner can delete documents."
      console.warn("⚠️", message)
      alert(message)
      return
    }

    console.log("✅ Ownership check passed, showing confirmation dialog")
    setDocumentToDelete(document)
    setShowDeleteConfirm(true)
  }

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.FileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.Description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.Category?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const totalDocuments = documents.length
  const signedDocuments = documents.filter((doc) => doc.IsSigned).length
  const verifiedDocuments = documents.filter((doc) => doc.IsVerified).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">SecureSign</span>

              <div className="ml-4 flex items-center">
                {connectionStatus === "online" ? (
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
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowUpload(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={connectionStatus === "offline"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
              <Button variant="outline" onClick={logout} className="text-gray-600 hover:text-gray-800">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Dashboard</h1>
          <p className="text-gray-600">Manage your secure documents and digital signatures</p>
        </div>

        {/* Error Alert */}
        {lastError && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <h3 className="font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700">{lastError}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setLastError(null)} className="ml-auto">
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection Warning */}
        {connectionStatus === "offline" && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center">
                <WifiOff className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <h3 className="font-medium text-yellow-800">No Internet Connection</h3>
                  <p className="text-sm text-yellow-700">
                    Some features may not be available. Please check your network connection.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDocuments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Signed Documents</p>
                  <p className="text-2xl font-bold text-green-600">{signedDocuments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-full">
                  <PenTool className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Signatures</p>
                  <p className="text-2xl font-bold text-orange-600">{totalDocuments - signedDocuments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-full">
                  <ShieldCheck className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Verified Documents</p>
                  <p className="text-2xl font-bold text-purple-600">{verifiedDocuments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Your Documents ({filteredDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {searchTerm ? "No documents found matching your search." : "No documents uploaded yet."}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => setShowUpload(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={connectionStatus === "offline"}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Your First Document
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDocuments.map((document) => (
                  <div
                    key={document.Id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-2 rounded relative">
                        <FileText className="h-5 w-5 text-blue-600" />
                        {document.IsSigned && (
                          <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                            <CheckCircle className="h-3 w-3 text-white" />
                          </div>
                        )}
                        {document.IsVerified && (
                          <div className="absolute -bottom-1 -right-1 bg-purple-500 rounded-full p-1">
                            <ShieldCheck className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{document.FileName}</h3>
                          {document.IsSigned && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Digitally Signed
                            </span>
                          )}
                          {document.IsVerified && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Verified
                            </span>
                          )}
                          {/* Show shared badge for received documents */}
                          {document.IsOwner === false && document.SharedBy && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <Share2 className="h-3 w-3 mr-1" />
                              Shared by {document.SharedBy}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {document.FormattedSize} • {formatDate(document.UploadDate)}
                        </p>
                        {document.Description && <p className="text-sm text-gray-600 mt-1">{document.Description}</p>}
                        {document.Category && (
                          <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded mt-1">
                            {document.Category}
                          </span>
                        )}
                        {document.SignatureInfo && (
                          <p className="text-xs text-green-600 mt-1">
                            Signed on {formatDate(document.SignatureInfo.signedAt)}
                          </p>
                        )}
                        {document.VerificationInfo && (
                          <p className="text-xs text-purple-600 mt-1">
                            Verified on {formatDate(document.VerificationInfo.verifiedAt)} • ID:{" "}
                            {document.VerificationInfo.verificationId}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowQRCode(document)}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        QR Code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerify(document)}
                        disabled={document.IsVerified || connectionStatus === "offline"}
                        className={
                          document.IsVerified
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        }
                      >
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        {document.IsVerified ? "Verified" : "Verify"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSign(document)}
                        disabled={document.IsSigned || connectionStatus === "offline"}
                        className={
                          document.IsSigned
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-green-600 hover:text-green-700 hover:bg-green-50"
                        }
                      >
                        <PenTool className="h-4 w-4 mr-1" />
                        {document.IsSigned ? "Signed" : "Sign"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        disabled={downloadingId === document.Id || connectionStatus === "offline"}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        {downloadingId === document.Id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-1"></div>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </>
                        )}
                      </Button>
                      {/* Share button - only show for document owners */}
                      {document.IsOwner && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShare(document)}
                          disabled={connectionStatus === "offline"}
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      )}
                      {/* Delete button - only show for document owners */}
                      {document.IsOwner && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmDelete(document)}
                          disabled={deletingId === document.Id || connectionStatus === "offline"}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete this document"
                        >
                          {deletingId === document.Id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-1"></div>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {showUpload && (
        <DocumentUpload
          onClose={() => setShowUpload(false)}
          onUploadSuccess={() => {
            setShowUpload(false)
            fetchDocuments()
          }}
        />
      )}

      {showSigner && selectedDocument && (
        <DocumentSigner
          document={selectedDocument}
          onClose={() => {
            setShowSigner(false)
            setSelectedDocument(null)
          }}
          onSignSuccess={() => {
            setShowSigner(false)
            setSelectedDocument(null)
            fetchDocuments()
          }}
        />
      )}

      {showVerifier && selectedDocument && (
        <DocumentVerifier
          document={selectedDocument}
          onClose={() => {
            setShowVerifier(false)
            setSelectedDocument(null)
          }}
          onVerifySuccess={() => {
            setShowVerifier(false)
            setSelectedDocument(null)
            fetchDocuments()
          }}
        />
      )}

      {showQRCode && selectedDocument && (
        <QRCodeModal
          document={selectedDocument}
          onClose={() => {
            setShowQRCode(false)
            setSelectedDocument(null)
          }}
        />
      )}

      {/* Share Modal */}
      {showShareModal && selectedDocument && (
        <DocumentShareModal
          document={selectedDocument}
          onClose={() => {
            setShowShareModal(false)
            setSelectedDocument(null)
          }}
          onShareSuccess={() => {
            setShowShareModal(false)
            setSelectedDocument(null)
            fetchDocuments()
          }}
        />
      )}

      {/* Enhanced Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          console.log("🚪 Closing delete confirmation dialog")
          setShowDeleteConfirm(false)
          setDocumentToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Document"
        message={
          <div>
            <p className="mb-2">Are you sure you want to permanently delete this document?</p>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="font-medium text-gray-900">{documentToDelete?.FileName}</p>
              <p className="text-sm text-gray-600">{documentToDelete?.FormattedSize}</p>
              {documentToDelete?.IsSigned && (
                <p className="text-sm text-orange-600 mt-1">⚠️ This document is digitally signed</p>
              )}
              {documentToDelete?.IsVerified && (
                <p className="text-sm text-purple-600 mt-1">🛡️ This document is verified</p>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
          </div>
        }
        confirmText="Delete Document"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  )
}
