'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Flame, TrendingUp } from 'lucide-react'

interface ActivityLog {
  date: string
  syncedProblems: number
  commitsMade: number
  platformActivity?: string
  notes?: string
}

interface StreakHeatmapProps {
  logs: ActivityLog[]
  currentStreak: number
  longestStreak: number
}

function getColor(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count <= 2) return 'bg-emerald-900/60'
  if (count <= 5) return 'bg-emerald-600'
  return 'bg-emerald-400'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function StreakHeatmap({ logs, currentStreak, longestStreak }: StreakHeatmapProps) {
  const { cells, weeks } = useMemo(() => {
    const today = new Date()
    const dateMap = new Map(logs.map(l => {
      const count = (l.syncedProblems || 0) + (l.commitsMade || 0)
      return [l.date, { ...l, activityCount: count }]
    }))

    const cells: Array<{ date: string; count: number; log?: ActivityLog }> = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const entry = dateMap.get(dateStr)
      cells.push({
        date: dateStr,
        count: entry?.activityCount || 0,
        log: entry,
      })
    }

    // Group into weeks (columns), 7 rows each
    const weeks: typeof cells[] = []
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }

    return { cells, weeks }
  }, [logs])

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', '']

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="text-base font-semibold">Activity (90 days)</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-orange-500">{currentStreak}</span>
              <span className="text-muted-foreground text-xs">current</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-emerald-500">{longestStreak}</span>
              <span className="text-muted-foreground text-xs">best</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-fit">
            {/* Day labels column */}
            <div className="flex flex-col gap-1 pr-1">
              {dayLabels.map((label, i) => (
                <div key={i} className="w-8 h-[14px] flex items-center">
                  <span className="text-[10px] text-muted-foreground leading-none">{label}</span>
                </div>
              ))}
            </div>
            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((cell) => (
                  <Tooltip key={cell.date}>
                    <TooltipTrigger asChild>
                      <div
                        className={`w-[14px] h-[14px] rounded-[3px] transition-colors cursor-default ${getColor(cell.count)}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{formatDate(cell.date)}</p>
                      <p className="text-muted-foreground">
                        {cell.count === 0 ? 'No activity' : `${cell.count} action(s)`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="w-[14px] h-[14px] rounded-[3px] bg-muted" />
          <div className="w-[14px] h-[14px] rounded-[3px] bg-emerald-900/60" />
          <div className="w-[14px] h-[14px] rounded-[3px] bg-emerald-600" />
          <div className="w-[14px] h-[14px] rounded-[3px] bg-emerald-400" />
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  )
}