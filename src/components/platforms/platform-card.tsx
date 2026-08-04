'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { PLATFORM_LABELS } from '@/lib/types'

interface PlatformAccount {
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
}

interface PlatformCardProps {
  account: PlatformAccount
  token: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function PlatformCard({ account, token }: PlatformCardProps) {
  const [syncing, setSyncing] = useState(false)
  const queryClient = useQueryClient()
  const label = PLATFORM_LABELS[account.platform as keyof typeof PLATFORM_LABELS] || account.platform
  const isGithub = account.platform === 'GITHUB'
  const snapshot = account.latestSnapshot
  const lastSync = account.lastSync
  const rawStats = snapshot?.rawStats as Record<string, unknown> | null

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/platforms/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ platform: account.platform }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Sync failed')
      } else {
        const result = data.results?.[0]
        if (result?.status === 'SUCCESS') {
          toast.success(`${label} synced — score: ${data.score?.compositeScore || 'N/A'}`)
        } else {
          toast.warning(result?.message || 'Sync completed with issues')
        }
        queryClient.invalidateQueries({ queryKey: ['platforms'] })
        queryClient.invalidateQueries({ queryKey: ['score'] })
        queryClient.invalidateQueries({ queryKey: ['activity'] })
        queryClient.invalidateQueries({ queryKey: ['topics'] })
      }
    } catch {
      toast.error('Network error during sync')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
              {label.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{label}</h3>
              <p className="text-xs text-muted-foreground">@{account.handle}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={handleSync}
            disabled={syncing || !account.enabled}
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Sync status */}
        <div className="flex items-center gap-2 text-xs">
          {lastSync ? (
            <>
              {lastSync.status === 'SUCCESS' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span className="text-muted-foreground">Last sync: {timeAgo(lastSync.createdAt)}</span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Not synced yet</span>
            </>
          )}
        </div>

        {/* Stats */}
        {snapshot ? (
          <div className="grid grid-cols-2 gap-2">
            {isGithub && rawStats ? (
              <>
                <StatItem label="Repos" value={String(rawStats.repos ?? 0)} />
                <StatItem label="Commits" value={String(rawStats.recentCommits ?? 0)} />
                <StatItem label="Stars" value={String(rawStats.stars ?? 0)} />
                {rawStats.languages && typeof rawStats.languages === 'object' && (
                  <div className="col-span-2 flex flex-wrap gap-1">
                    {Object.entries(rawStats.languages as Record<string, number>).slice(0, 4).map(([lang]) => (
                      <Badge key={lang} variant="secondary" className="text-[10px] px-1.5">{lang}</Badge>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <StatItem label="Easy" value={String(snapshot.easySolved)} color="text-emerald-400" />
                <StatItem label="Medium" value={String(snapshot.mediumSolved)} color="text-amber-400" />
                <StatItem label="Hard" value={String(snapshot.hardSolved)} color="text-rose-400" />
                <StatItem label="Total" value={String(snapshot.totalSolved)} />
                {snapshot.rating && (
                  <StatItem label="Rating" value={String(snapshot.rating)} color="text-amber-400" />
                )}
                {snapshot.contestCount != null && snapshot.contestCount > 0 && (
                  <StatItem label="Contests" value={String(snapshot.contestCount)} />
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {!account.enabled && (
          <Badge variant="secondary" className="text-xs">Disabled</Badge>
        )}
      </CardContent>
    </Card>
  )
}

function StatItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/50">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold ${color || 'text-foreground'}`}>{value}</p>
    </div>
  )
}
