"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { apiClient } from "@/lib/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = apiClient.getToken()
      if (token) {
        await apiClient.validateToken()
        setUser({ token })
      }
    } catch (error) {
      console.error("Auth check failed:", error)
      apiClient.logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const response = await apiClient.login(email, password)
    setUser({ email, token: response.token || response.Token })
    return response
  }

  const register = async (email, password, confirmPassword) => {
    return await apiClient.register(email, password, confirmPassword)
  }

  const logout = () => {
    apiClient.logout()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
