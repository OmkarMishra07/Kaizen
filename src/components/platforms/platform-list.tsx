'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PlatformCard } from './platform-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PLATFORMS, PLATFORM_LABELS } from '@/lib/types'

interface PlatformListProps {
  token: string
}

export function PlatformList({ token }: PlatformListProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState('')
  const [handle, setHandle] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [adding, setAdding] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const res = await fetch('/api/platforms', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch platforms')
      return res.json() as Promise<{
        accounts: Array<{
          id: string
          platform: string
          handle: string
          enabled: boolean
          metadata: Record<string, unknown> | null
          createdAt: string
          lastSync?: { status: string; message: string; createdAt: string } | null
          latestSnapshot?: {
            easySolved: number
            mediumSolved: number
            hardSolved: number
            totalSolved: number
            rating?: number | null
            contestCount?: number
            rawStats?: Record<string, unknown> | null
          } | null
        }>
      }>
    },
  })

  // Fetch sync logs and snapshots for each account
  const accounts = data?.accounts || []

  const handleAdd = async () => {
    if (!platform || !handle.trim()) {
      toast.error('Platform and handle are required')
      return
    }
    setAdding(true)
    try {
      const metadata: Record<string, unknown> = {}
      if (platform === 'GITHUB' && githubToken.trim()) {
        metadata.token = githubToken.trim()
      }
      const res = await fetch('/api/platforms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ platform, handle: handle.trim(), metadata }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to add platform')
        return
      }
      toast.success(`${PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS]} added!`)
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
      setOpen(false)
      setPlatform('')
      setHandle('')
      setGithubToken('')
    } catch {
      toast.error('Network error')
    } finally {
      setAdding(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load platforms. Please try refreshing.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {accounts.length} platform{accounts.length !== 1 ? 's' : ''} connected
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add Platform
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Platform Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORMS).map(([key, val]) => (
                      <SelectItem key={val} value={val}>
                        {PLATFORM_LABELS[val]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Handle / Username</Label>
                <Input
                  placeholder="e.g. leetcode_user"
                  value={handle}
                  onChange={e => setHandle(e.target.value)}
                />
              </div>
              {platform === 'GITHUB' && (
                <div className="space-y-2">
                  <Label>GitHub Personal Access Token (optional)</Label>
                  <Input
                    type="password"
                    placeholder="ghp_..."
                    value={githubToken}
                    onChange={e => setGithubToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for private repos and higher API limits.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAdd} disabled={adding || !platform || !handle.trim()}>
                {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {accounts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No platforms connected</p>
          <p className="text-sm mt-1">Add a platform to start tracking your progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => (
            <PlatformCard
              key={account.id}
              account={account}
              token={token}
            />
          ))}
        </div>
      )}
    </div>
  )
}
