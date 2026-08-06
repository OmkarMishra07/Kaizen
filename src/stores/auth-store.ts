'use client'

import { create } from 'zustand'
import { toast } from 'sonner'

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  setup: (username: string, password: string, displayName?: string, leetcode?: string) => Promise<boolean>
  logout: () => void
  init: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Login failed')
        set({ isLoading: false })
        return false
      }
      const data = await res.json()
      localStorage.setItem('sde-token', data.token)
      set({ token: data.token, isAuthenticated: true, isLoading: false })
      toast.success(`Welcome back, ${data.user.displayName || data.user.username}!`)
      return true
    } catch {
      toast.error('Network error. Please try again.')
      set({ isLoading: false })
      return false
    }
  },

  setup: async (username: string, password: string, displayName?: string, leetcode?: string) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName, leetcode }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Setup failed')
        set({ isLoading: false })
        return false
      }
      const data = await res.json()
      localStorage.setItem('sde-token', data.token)
      set({ token: data.token, isAuthenticated: true, isLoading: false })
      toast.success('Account created successfully!')
      return true
    } catch {
      toast.error('Network error. Please try again.')
      set({ isLoading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('sde-token')
    set({ token: null, isAuthenticated: false })
    toast.info('Logged out')
  },

  init: () => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('sde-token')
    if (token) {
      set({ token, isAuthenticated: true })
    }
  },
}))
