"use client"

import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useContacts } from "../context/ContactContext"
import Navbar from "../components/Navbar"
import ContactCard from "../components/ContactCard"
import ContactModal from "../components/ContactModal"
import SearchAndSort from "../components/SearchAndSort"
import DemoDataButton from "../components/DemoDataButton"

const Dashboard = () => {
  const { user } = useAuth()
  const { contacts } = useContacts()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)

  const handleAddContact = () => {
    setEditingContact(null)
    setIsModalOpen(true)
  }

  const handleEditContact = (contact) => {
    setEditingContact(contact)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingContact(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-balance">Welcome back, {user?.name}!</h1>
          <p className="mt-2 text-gray-600">Manage your contacts and stay organized</p>
        </div>

        {/* Search and Controls */}
        <div className="mb-8">
          <SearchAndSort onAddContact={handleAddContact} />
        </div>

        {/* Contacts Grid */}
        <div className="space-y-6">
          {contacts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No contacts yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Get started by adding your first contact. Keep all your important connections organized in one place.
              </p>
              <button
                onClick={handleAddContact}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Your First Contact
              </button>
              <DemoDataButton />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {contacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} onEdit={handleEditContact} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Contact Modal */}
      {isModalOpen && <ContactModal contact={editingContact} onClose={handleCloseModal} />}
    </div>
  )
}

export default Dashboard
