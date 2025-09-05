// Utility functions for file downloads
export const downloadBlob = (blob, fileName) => {
    // Ensure we're in a browser environment
    if (typeof window === "undefined") {
      console.error("Download not available in server environment")
      return false
    }
  
    try {
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const downloadLink = window.document.createElement("a")
  
      downloadLink.style.display = "none"
      downloadLink.href = url
      downloadLink.download = fileName || "download"
  
      // Add to DOM, click, and remove
      window.document.body.appendChild(downloadLink)
      downloadLink.click()
  
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        if (downloadLink.parentNode) {
          downloadLink.parentNode.removeChild(downloadLink)
        }
      }, 100)
  
      return true
    } catch (error) {
      console.error("Download failed:", error)
      return false
    }
  }
  
  export const downloadFile = async (apiClient, documentId, fileName) => {
    try {
      const blob = await apiClient.downloadDocument(documentId, fileName)
      return downloadBlob(blob, fileName)
    } catch (error) {
      console.error("File download failed:", error)
      throw error
    }
  }
  