'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Trophy, Loader2 } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export default function AuthPage() {
  const router = useRouter()
  const { login, setup, isLoading, isAuthenticated } = useAuthStore()
  
  if (isAuthenticated) {
    router.push('/dashboard')
  }

  const [isSetupMode, setIsSetupMode] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [leetcode, setLeetcode] = useState('')
  const [seeding, setSeeding] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error('Please fill in username and password')
      return
    }
    
    if (isSetupMode) {
      if (password !== confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
      const ok = await setup(username.trim(), password, name.trim(), leetcode.trim())
      if (ok) {
        router.push('/dashboard')
      }
    } else {
      const ok = await login(username.trim(), password)
      if (ok) {
        router.push('/dashboard')
      }
    }
  }

  const handleQuickLogin = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.token) {
          localStorage.setItem('sde-token', data.token)
          useAuthStore.setState({ token: data.token, isAuthenticated: true })
          toast.success('Demo account loaded! (demo/demo)')
          router.push('/dashboard')
          return
        }
      }
      // Already seeded, try login
      const ok = await login('demo', 'demo')
      if (ok) {
        router.push('/dashboard')
      } else {
        toast.error('Demo login failed. Please create an account.')
        setIsSetupMode(true)
      }
    } catch {
      toast.error('Failed to initialize. Please try again.')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Trophy className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold">LevelUp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track Smarter, Rank Higher
          </p>
        </div>

        <Card className="rounded-xl border shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSetupMode && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={isLoading || seeding}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={isLoading || seeding}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={isSetupMode ? 'new-password' : 'current-password'}
                  disabled={isLoading || seeding}
                />
              </div>
              
              {isSetupMode && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isLoading || seeding}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leetcode">Leetcode Handle (Optional)</Label>
                    <Input
                      id="leetcode"
                      placeholder="e.g. omkarmishra"
                      value={leetcode}
                      onChange={e => setLeetcode(e.target.value)}
                      disabled={isLoading || seeding}
                    />
                  </div>
                </>
              )}
              
              <Button type="submit" className="w-full" disabled={isLoading || seeding}>
                {(isLoading || seeding) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSetupMode ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            <Separator className="my-4" />

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleQuickLogin}
                disabled={isLoading || seeding}
              >
                {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Quick Demo Login
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                onClick={() => setIsSetupMode(!isSetupMode)}
              >
                {isSetupMode
                  ? 'Already have an account? Sign in'
                  : 'First time? Create account'}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
