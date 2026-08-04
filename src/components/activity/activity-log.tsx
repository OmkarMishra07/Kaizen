'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Flame, TrendingUp, Calendar, Zap, GitCommit, Code2 } from 'lucide-react'

interface ActivityLogProps {
  token: string
}

interface ActivityLogEntry {
  id: string
  date: string
  notes: string | null
  syncedProblems: number
  commitsMade: number
  platformActivity: string | null
}

interface ActivityStats {
  currentStreak: number
  longestStreak: number
  sevenDayActivePct: number
  thirtyDayActivePct: number
  sevenDayDays: number
  thirtyDayDays: number
  totalLogs: number
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10)
}

function isYesterday(dateStr: string): boolean {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dateStr === d.toISOString().slice(0, 10)
}

function relativeDay(dateStr: string): string {
  if (isToday(dateStr)) return 'Today'
  if (isYesterday(dateStr)) return 'Yesterday'
  return formatDate(dateStr)
}

export function ActivityLog({ token }: ActivityLogProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['activity'],
    queryFn: async () => {
      const res = await fetch('/api/activity?days=30', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch activity')
      return res.json() as Promise<{ logs: ActivityLogEntry[]; stats: ActivityStats }>
    },
  })

  const logs = data?.logs || []
  const stats = data?.stats

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load activity. Please try refreshing.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Flame className="w-5 h-5" />}
            label="Current Streak"
            value={`${stats.currentStreak} days`}
            color="text-orange-500"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Longest Streak"
            value={`${stats.longestStreak} days`}
            color="text-emerald-500"
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="7-Day Active"
            value={`${stats.sevenDayActivePct}%`}
            color="text-amber-500"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="30-Day Active"
            value={`${stats.thirtyDayActivePct}%`}
            color="text-cyan-500"
          />
        </div>
      )}

      {/* Activity list */}
      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Daily Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[480px]">
            <div className="divide-y">
              {logs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No activity logged yet. Sync your platforms to get started.
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">
                            {relativeDay(log.date)}
                          </span>
                          {isToday(log.date) && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-emerald-600">
                              Today
                            </Badge>
                          )}
                        </div>
                        {log.notes && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{log.notes}</p>
                        )}
                        {log.platformActivity && (
                          <p className="text-xs text-muted-foreground mt-1">{log.platformActivity}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {log.syncedProblems > 0 && (
                          <div className="flex items-center gap-1 text-xs text-amber-400">
                            <Code2 className="w-3 h-3" />
                            {log.syncedProblems}
                          </div>
                        )}
                        {log.commitsMade > 0 && (
                          <div className="flex items-center gap-1 text-xs text-emerald-400">
                            <GitCommit className="w-3 h-3" />
                            {log.commitsMade}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`${color}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-lg font-bold ${color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}