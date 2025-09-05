// Offline API client for demo purposes
class OfflineApiClient {
  constructor() {
    this.baseURL = "offline"
    this.token = null
    this.mockData = this.initializeMockData()
    console.log("🔌 Offline API Client initialized")
  }

  initializeMockData() {
    return {
      users: [
        { id: 1, email: "user@example.com", password: "password123" },
        { id: 2, email: "john@example.com", password: "password123" },
        { id: 3, email: "jane@example.com", password: "password123" },
      ],
      documents: [
        {
          Id: "doc-1",
          FileName: "Sample Contract.pdf",
          FormattedSize: "2.5 MB",
          UploadDate: new Date(Date.now() - 86400000).toISOString(),
          ContentType: "application/pdf",
          Description: "Sample contract document",
          Category: "Contract",
          IsOwner: true,
          OwnerId: 1,
        },
        {
          Id: "doc-2",
          FileName: "Invoice 2024.pdf",
          FormattedSize: "1.2 MB",
          UploadDate: new Date(Date.now() - 172800000).toISOString(),
          ContentType: "application/pdf",
          Description: "Monthly invoice",
          Category: "Invoice",
          IsOwner: true,
          OwnerId: 1,
        },
      ],
      sharedDocuments: {},
      documentActivity: {},
    }
  }

  setToken(token) {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token)
    }
  }

  getToken() {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token")
    }
    return this.token
  }

  async login(email, password) {
    await this.delay(1000)
    const user = this.mockData.users.find((u) => u.email === email && u.password === password)
    if (!user) {
      throw new Error("Invalid credentials")
    }
    const token = `offline-token-${user.id}-${Date.now()}`
    this.setToken(token)
    return { token, user }
  }

  async register(email, password, confirmPassword) {
    await this.delay(1000)
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match")
    }
    if (this.mockData.users.find((u) => u.email === email)) {
      throw new Error("User already exists")
    }
    const newUser = {
      id: this.mockData.users.length + 1,
      email,
      password,
    }
    this.mockData.users.push(newUser)
    return { message: "User registered successfully" }
  }

  async getDocuments() {
    await this.delay(500)
    const userId = this.getCurrentUserId()

    // Get owned documents
    const ownedDocs = this.mockData.documents.filter((doc) => doc.OwnerId === userId)

    // Get shared documents
    const sharedDocs = Object.values(this.mockData.sharedDocuments)
      .filter((share) => share.shareWithEmail === this.getCurrentUserEmail())
      .map((share) => ({
        ...this.mockData.documents.find((doc) => doc.Id === share.documentId),
        IsOwner: false,
        SharedBy: share.sharedByEmail,
        SharedAt: share.sharedAt,
        Permissions: share.permissions,
      }))
      .filter((doc) => doc.Id) // Filter out undefined documents

    return [...ownedDocs, ...sharedDocs]
  }

  async shareDocument(shareData) {
    await this.delay(1000)
    const shareId = `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    this.mockData.sharedDocuments[shareId] = {
      ...shareData,
      shareId,
      sharedByEmail: this.getCurrentUserEmail(),
    }

    // Add activity
    this.addDocumentActivity(shareData.documentId, {
      type: "shared",
      action: `Document shared with ${shareData.shareWithEmail}`,
      userEmail: this.getCurrentUserEmail(),
      timestamp: new Date().toISOString(),
      details: shareData.message || "No message provided",
    })

    return { shareId, message: "Document shared successfully" }
  }

  async getDocumentActivity(documentId) {
    await this.delay(300)
    return this.mockData.documentActivity[documentId] || []
  }

  addDocumentActivity(documentId, activity) {
    if (!this.mockData.documentActivity[documentId]) {
      this.mockData.documentActivity[documentId] = []
    }
    this.mockData.documentActivity[documentId].unshift(activity)
  }

  getCurrentUserId() {
    const token = this.getToken()
    if (!token) return null
    const match = token.match(/offline-token-(\d+)-/)
    return match ? Number.parseInt(match[1]) : null
  }

  getCurrentUserEmail() {
    const userId = this.getCurrentUserId()
    const user = this.mockData.users.find((u) => u.id === userId)
    return user ? user.email : null
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Implement other methods as needed
  async uploadDocument(file, description, category) {
    await this.delay(2000)
    const newDoc = {
      Id: `doc-${Date.now()}`,
      FileName: file.name,
      FormattedSize: this.formatFileSize(file.size),
      UploadDate: new Date().toISOString(),
      ContentType: file.type,
      Description: description,
      Category: category,
      IsOwner: true,
      OwnerId: this.getCurrentUserId(),
    }
    this.mockData.documents.push(newDoc)
    return newDoc
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  logout() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token")
    }
  }
}

export const offlineApiClient = new OfflineApiClient()
