'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Snapshot {
  date: string
  compositeScore: number
  dsaScore: number
  backendScore: number
  portfolioScore: number
  consistencyScore: number
  interviewScore: number
}

interface ScoreHistoryChartProps {
  snapshots: Snapshot[]
}

const LINE_CONFIG = [
  { key: 'compositeScore', label: 'Composite', color: '#10b981', default: true },
  { key: 'dsaScore', label: 'DSA', color: '#f59e0b', default: false },
  { key: 'backendScore', label: 'Backend', color: '#8b5cf6', default: false },
  { key: 'portfolioScore', label: 'Portfolio', color: '#06b6d4', default: false },
  { key: 'consistencyScore', label: 'Consistency', color: '#f43f5e', default: false },
  { key: 'interviewScore', label: 'Interview', color: '#ec4899', default: false },
] as const

type LineKey = (typeof LINE_CONFIG)[number]['key']

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground capitalize">{entry.dataKey.replace('Score', '')}:</span>
            <span className="font-semibold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function ScoreHistoryChart({ snapshots }: ScoreHistoryChartProps) {
  const [visibleLines, setVisibleLines] = useState<Set<LineKey>>(
    new Set(LINE_CONFIG.filter(c => c.default).map(c => c.key))
  )

  const toggleLine = (key: LineKey) => {
    setVisibleLines(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const data = snapshots.map(s => ({
    ...s,
    shortDate: s.date.slice(5), // MM-DD
  }))

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base font-semibold">Score History</CardTitle>
          <div className="flex flex-wrap gap-1">
            {LINE_CONFIG.map(config => {
              const isVisible = visibleLines.has(config.key)
              return (
                <Button
                  key={config.key}
                  variant={isVisible ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  style={
                    isVisible
                      ? { backgroundColor: config.color, borderColor: config.color, color: '#fff' }
                      : { borderColor: config.color + '60', color: config.color }
                  }
                  onClick={() => toggleLine(config.key)}
                >
                  {config.label}
                </Button>
              )
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
            No score history yet. Sync your platforms to start tracking.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="shortDate"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ display: 'none' }} />
              {LINE_CONFIG.filter(c => visibleLines.has(c.key)).map(config => (
                <Line
                  key={config.key}
                  type="monotone"
                  dataKey={config.key}
                  stroke={config.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}