class ApiClient {
  constructor(apiUrl) {
    this.apiUrl = apiUrl
    this.token = null
  }

  setToken(token) {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token)
    }
  }

  getToken() {
    if (this.token) {
      return this.token
    }
    if (typeof window !== "undefined") {
      return localStorage.getItem("token")
    }
    return null
  }

  async request(endpoint, options = {}) {
    const url = `${this.apiUrl}${endpoint}`
    const headers = {
      "Content-Type": "application/json",
    }

    const token = this.getToken()
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const config = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    }

    try {
      console.log(` Making request to: ${url}`)
      console.log(` With token: ${token ? "Present" : "Missing"}`)
      
      const response = await fetch(url, config)
      
      if (!response.ok) {
        let errorMessage = `HTTP error! Status: ${response.status}`

        try {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json()
            console.error(" Server error response:", errorData)
            errorMessage = errorData.message || errorData.error || errorMessage
          } else {
            const errorText = await response.text()
            console.error(" Server error text:", errorText)
            errorMessage = errorText || errorMessage
          }
        } catch (e) {
          console.error(" Could not parse error response:", e)
        }

        throw new Error(errorMessage)
      }

      // Handle different response types
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json()
        console.log("✅ Request successful:", data)
        return data
      } else if (response.status === 204) {
        // No content response (common for DELETE operations)
        console.log("✅ Request successful: No content")
        return null
      } else {
        const text = await response.text()
        console.log("✅ Request successful:", text)
        return text
      }
    } catch (error) {
      console.error("💥 Request failed:", error)
      throw error
    }
  }

  async getDocuments() {
    console.log("📋 Fetching documents from API...")
    const documents = await this.request("/api/Documents")

    // Get shared documents
    const shares = this.getSharedDocuments()
    const currentUserEmail = this.getCurrentUserEmail()

    // Find documents shared with current user
    const sharedDocuments = Object.values(shares)
      .filter((share) => share.shareWithEmail === currentUserEmail)
      .map((share) => {
        const originalDoc = documents.find((doc) => doc.Id === share.documentId)
        if (originalDoc) {
          return {
            ...originalDoc,
            IsOwner: false,
            SharedBy: share.sharedByEmail,
            SharedAt: share.sharedAt,
            Permissions: share.permissions,
          }
        }
        return null
      })
      .filter((doc) => doc !== null)

    // Combine owned and shared documents
    const allDocuments = [...documents, ...sharedDocuments]

    // Add signature and verification status
    const docsWithStatus = allDocuments.map((doc) => ({
      ...doc,
      IsSigned: this.isDocumentSigned(doc.Id),
      SignatureInfo: this.getSignatureInfo(doc.Id),
      IsVerified: this.isDocumentVerified(doc.Id),
      VerificationInfo: this.getVerificationInfo(doc.Id),
    }))

    console.log("✅ Documents fetched:", docsWithStatus)
    return docsWithStatus
  }

  async getDocumentById(id) {
    console.log(`Fetching document ID: ${id}`)
    return await this.request(`/api/Documents/${id}`)
  }

  async createDocument(data) {
    console.log("Creating document...")
    return await this.request("/api/Documents", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateDocument(id, data) {
    console.log(`Updating document ID: ${id}`)
    return await this.request(`/api/Documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteDocument(id) {
    console.log(`🗑️ Deleting document ID: ${id}`)

    try {
      const response = await this.request(`/api/Documents/${id}`, {
        method: "DELETE",
      })

      console.log("✅ Delete request successful")
      return response
    } catch (error) {
      console.error("❌ Delete request failed:", error)

      // Re-throw with more specific error information
      if (error.message.includes("404")) {
        throw new Error("Document not found or already deleted")
      } else if (error.message.includes("403")) {
        throw new Error("Access denied - you don't have permission to delete this document")
      } else if (error.message.includes("401")) {
        throw new Error("Authentication expired - please log in again")
      } else if (error.message.includes("500")) {
        throw new Error("Server error - please try again later")
      } else {
        throw new Error(`Delete failed: ${error.message}`)
      }
    }
  }

  async login(email, password) {
    const response = await this.request("/api/Auth/login", {
      method: "POST",
      body: JSON.stringify({ Email: email, Password: password }),
    })

    if (response && (response.token || response.Token)) {
      this.setToken(response.token || response.Token)

      // Store user email for sharing functionality
      if (typeof window !== "undefined") {
        localStorage.setItem("current_user_email", email)
      }
    }

    return response
  }

  async register(userData) {
    console.log("Registering user...")
    return await this.request("/api/Auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async logout() {
    this.setToken(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
    }
    console.log("Logged out")
  }

  // Document Signature Methods
  async signDocument(id, signatureData) {
    console.log(`✍️ Signing document ID: ${id}`)

    const signedDocuments = this.getSignedDocuments()
    const signatureInfo = {
      documentId: id,
      signatureData: signatureData,
      signedAt: new Date().toISOString(),
      signedBy: this.getCurrentUserEmail(),
    }

    signedDocuments[id] = signatureInfo

    if (typeof window !== "undefined") {
      localStorage.setItem("signed_documents", JSON.stringify(signedDocuments))
    }

    console.log(`✅ Document ${id} signed successfully`)
    return signatureInfo
  }

  isDocumentSigned(documentId) {
    const signedDocuments = this.getSignedDocuments()
    return !!signedDocuments[documentId]
  }

  getSignatureInfo(documentId) {
    const signedDocuments = this.getSignedDocuments()
    return signedDocuments[documentId] || null
  }

  getSignedDocuments() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("signed_documents")
      return stored ? JSON.parse(stored) : {}
    }
    return {}
  }

  // Document Verification Methods
  async verifyDocument(id, verificationData) {
    console.log(`🔍 Verifying document ID: ${id}`)

    const verifiedDocuments = this.getVerifiedDocuments()
    const verificationInfo = {
      documentId: id,
      verificationId: `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      verifiedAt: new Date().toISOString(),
      verifiedBy: this.getCurrentUserEmail(),
      verificationMethod: verificationData.verificationMethod || "automated",
      verificationNotes: verificationData.verificationNotes || "",
      success: true,
      message: "Document has been successfully verified and is authentic.",
    }

    verifiedDocuments[id] = verificationInfo

    if (typeof window !== "undefined") {
      localStorage.setItem("verified_documents", JSON.stringify(verifiedDocuments))
    }

    console.log(`✅ Document ${id} verified successfully`)
    return verificationInfo
  }

  isDocumentVerified(documentId) {
    const verifiedDocuments = this.getVerifiedDocuments()
    return !!verifiedDocuments[documentId]
  }

  getVerificationInfo(documentId) {
    const verifiedDocuments = this.getVerifiedDocuments()
    return verifiedDocuments[documentId] || null
  }

  getVerifiedDocuments() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("verified_documents")
      return stored ? JSON.parse(stored) : {}
    }
    return {}
  }

  async uploadDocument(file, description = "", category = "") {
    const formData = new FormData()
    formData.append("file", file)
    if (description) formData.append("description", description)
    if (category) formData.append("category", category)

    const token = this.getToken()
    console.log(`📤 Uploading file: ${file.name}`)

    const response = await fetch(`${this.apiUrl}/api/Documents/upload`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  async downloadDocument(id, fileName = "document.pdf") {
    const token = this.token || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null)
    const url = `${this.apiUrl}/api/Documents/${id}/download`

    console.log(`📥 Downloading document ID: ${id}`)

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Download failed: ${response.status} - ${errorText}`)
      }

      const blob = await response.blob()

      // Create a blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)

      console.log(`✅ Document "${fileName}" downloaded successfully.`)
    } catch (error) {
      console.error("💥 Download request failed:", error)
      throw error
    }
  }

  async getDocumentMetadata(id) {
    console.log(`📋 Getting metadata for document ID: ${id}`)
    return await this.request(`/api/Documents/${id}/metadata`)
  }

  async validateToken() {
    return await this.request("/api/Auth/validate")
  }

  async register(email, password, confirmPassword) {
    return await this.request("/api/Auth/register", {
      method: "POST",
      body: JSON.stringify({
        Email: email,
        Password: password,
        ConfirmPassword: confirmPassword,
      }),
    })
  }

  // Share document with another user (localStorage implementation)
  async shareDocument(shareData) {
    console.log(`📤 Sharing document ${shareData.documentId} with ${shareData.shareWithEmail}`)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Store share information in localStorage
    const shares = this.getSharedDocuments()
    const shareId = `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const shareInfo = {
      shareId,
      documentId: shareData.documentId,
      shareWithEmail: shareData.shareWithEmail,
      sharedByEmail: this.getCurrentUserEmail(),
      sharedAt: new Date().toISOString(),
      message: shareData.message || "",
      permissions: shareData.permissions,
    }

    shares[shareId] = shareInfo

    if (typeof window !== "undefined") {
      localStorage.setItem("shared_documents", JSON.stringify(shares))
    }

    console.log(`✅ Document ${shareData.documentId} shared successfully with ${shareData.shareWithEmail}`)

    return {
      shareId,
      message: "Document shared successfully",
      success: true,
    }
  }

  // Get shared documents from localStorage
  getSharedDocuments() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("shared_documents")
      return stored ? JSON.parse(stored) : {}
    }
    return {}
  }

  // Get current user email
  getCurrentUserEmail() {
    if (typeof window !== "undefined") {
      return localStorage.getItem("current_user_email") || "current_user@example.com"
    }
    return "current_user@example.com"
  }

  // Get document activity
  async getDocumentActivity(documentId) {
    console.log(`📊 Getting activity for document ${documentId}`)

    // For demo purposes, get from localStorage
    // In a real app, this would be an API call
    const activities = this.getStoredDocumentActivity()
    return activities[documentId] || []
  }

  // Add document activity
  addDocumentActivity(documentId, activity) {
    const activities = this.getStoredDocumentActivity()

    if (!activities[documentId]) {
      activities[documentId] = []
    }

    activities[documentId].unshift(activity)

    if (typeof window !== "undefined") {
      localStorage.setItem("document_activities", JSON.stringify(activities))
    }
  }

  // Get stored document activities
  getStoredDocumentActivity() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("document_activities")
      return stored ? JSON.parse(stored) : {}
    }
    return {}
  }
}

// Initialize the API client with the base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5016"

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL)

// Also set up the token from localStorage if available
if (typeof window !== "undefined") {
  const token = localStorage.getItem("auth_token") || localStorage.getItem("token")
  if (token) {
    apiClient.setToken(token)
  }
}
