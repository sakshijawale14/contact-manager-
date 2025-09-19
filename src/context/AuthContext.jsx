"use client"

import { createContext, useContext, useState, useEffect } from "react"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load user from localStorage on app start
  useEffect(() => {
    const savedUser = localStorage.getItem("contactManager_user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  // Save user to localStorage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("contactManager_user", JSON.stringify(user))
    } else {
      localStorage.removeItem("contactManager_user")
    }
  }, [user])

  const login = async (email, password) => {
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        localStorage.setItem("contactManager_token", data.token)
        return { success: true, message: "Successfully logged in!" }
      } else {
        return { success: false, message: data.message || "Login failed" }
      }
    } catch (error) {
      return { success: false, message: "Network error. Please try again." }
    }
  }

  const register = async (name, email, password) => {
    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        localStorage.setItem("contactManager_token", data.token)
        return { success: true, message: "Account created successfully! Welcome to Contact Manager." }
      } else {
        return { success: false, message: data.message || "Registration failed" }
      }
    } catch (error) {
      return { success: false, message: "Network error. Please try again." }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("contactManager_token")
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}
