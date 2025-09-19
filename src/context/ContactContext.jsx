"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./AuthContext"

const ContactContext = createContext()

export const useContacts = () => {
  const context = useContext(ContactContext)
  if (!context) {
    throw new Error("useContacts must be used within a ContactProvider")
  }
  return context
}

export const ContactProvider = ({ children }) => {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name") // 'name', 'favorites'

  // Load contacts from backend API when user changes
  useEffect(() => {
    if (user) {
      loadContacts()
    } else {
      setContacts([])
    }
  }, [user])

  const loadContacts = async () => {
    try {
      const token = localStorage.getItem("contactManager_token")
      const response = await fetch("http://localhost:5000/api/contacts", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      } else {
        console.error("Failed to load contacts")
        setContacts([])
      }
    } catch (error) {
      console.error("Error loading contacts:", error)
      setContacts([])
    }
  }

  // No need to save to localStorage - data is now stored in backend

  const addContact = async (contactData) => {
    try {
      const token = localStorage.getItem("contactManager_token")
      const response = await fetch("http://localhost:5000/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(contactData),
      })

      if (response.ok) {
        const newContact = await response.json()
        setContacts((prev) => [...prev, newContact])
        return newContact
      } else {
        const error = await response.json()
        console.error("Failed to add contact:", error.message)
        return null
      }
    } catch (error) {
      console.error("Error adding contact:", error)
      return null
    }
  }

  const updateContact = async (id, contactData) => {
    try {
      const token = localStorage.getItem("contactManager_token")
      const response = await fetch(`http://localhost:5000/api/contacts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(contactData),
      })

      if (response.ok) {
        const updatedContact = await response.json()
        setContacts((prev) => prev.map((contact) => (contact.id == id ? updatedContact : contact)))
        return updatedContact
      } else {
        const error = await response.json()
        console.error("Failed to update contact:", error.message)
        return null
      }
    } catch (error) {
      console.error("Error updating contact:", error)
      return null
    }
  }

  const deleteContact = async (id) => {
    try {
      const token = localStorage.getItem("contactManager_token")
      const response = await fetch(`http://localhost:5000/api/contacts/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setContacts((prev) => prev.filter((contact) => contact.id != id))
        return true
      } else {
        const error = await response.json()
        console.error("Failed to delete contact:", error.message)
        return false
      }
    } catch (error) {
      console.error("Error deleting contact:", error)
      return false
    }
  }

  const toggleFavorite = async (id) => {
    try {
      const token = localStorage.getItem("contactManager_token")
      const response = await fetch(`http://localhost:5000/api/contacts/${id}/toggle-favorite`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const updatedContact = await response.json()
        setContacts((prev) => prev.map((contact) => (contact.id == id ? updatedContact : contact)))
        return updatedContact
      } else {
        const error = await response.json()
        console.error("Failed to toggle favorite:", error.message)
        return null
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
      return null
    }
  }

  // Filter and sort contacts
  const filteredAndSortedContacts = React.useMemo(() => {
    const filtered = contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.phone && contact.phone.includes(searchTerm)),
    )

    // Sort contacts
    filtered.sort((a, b) => {
      if (sortBy === "favorites") {
        if (a.isFavorite && !b.isFavorite) return -1
        if (!a.isFavorite && b.isFavorite) return 1
        return a.name.localeCompare(b.name)
      } else {
        return a.name.localeCompare(b.name)
      }
    })

    return filtered
  }, [contacts, searchTerm, sortBy])

  const value = {
    contacts: filteredAndSortedContacts,
    allContacts: contacts,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    addContact,
    updateContact,
    deleteContact,
    toggleFavorite,
  }

  return <ContactContext.Provider value={value}>{children}</ContactContext.Provider>
}
