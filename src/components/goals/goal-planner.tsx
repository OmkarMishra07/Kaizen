'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Target, Code2, Server, FolderGit2, Clock, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

interface GoalPlannerProps {
  token: string
}

const PRIORITY_STYLES: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  DSA: { icon: <Code2 className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  CHECKLIST: { icon: <Server className="w-4 h-4" />, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  PROJECT: { icon: <FolderGit2 className="w-4 h-4" />, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  CONSISTENCY: { icon: <Clock className="w-4 h-4" />, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
}

const DAY_FOCUS_COLORS: Record<string, string> = {
  DSA: 'text-amber-400 bg-amber-500/10',
  Backend: 'text-violet-400 bg-violet-500/10',
  Project: 'text-cyan-400 bg-cyan-500/10',
  Review: 'text-emerald-400 bg-emerald-500/10',
  'Rest/Light': 'text-muted-foreground bg-muted',
}

export function GoalPlanner({ token }: GoalPlannerProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await fetch('/api/goals', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch goals')
      return res.json() as Promise<{
        currentScore: number
        rankLevel: string
        rankName: string
        priorities: Array<{ type: string; message: string }>
        weakTopics: Array<{ topic: string; totalSolved: number; target: number; gap: number }>
        weakCategories: Array<{ category: string; label: string; completed: number; total: number; percentage: number; remaining: number }>
        projectSuggestion: string | null
        streakSuggestion: string | null
        weeklyPlan: Array<{ day: string; focus: string; action: string }>
      }>
    },
  })

  const priorities = data?.priorities || []
  const weeklyPlan = data?.weeklyPlan || []
  const weakTopics = data?.weakTopics || []
  const currentScore = data?.currentScore || 0

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load goals. Please try refreshing.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Priority cards */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Priority Gaps
        </h3>
        {priorities.length === 0 ? (
          <Card className="rounded-xl border shadow-sm">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No major gaps identified. Keep up the good work!
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {priorities.map((p, i) => {
              const style = PRIORITY_STYLES[p.type] || PRIORITY_STYLES.DSA
              return (
                <motion.div
                  key={i}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`rounded-xl border ${style.border} ${style.bg}`}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className={`${style.color} mt-0.5 shrink-0`}>{style.icon}</div>
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className={`text-[10px] mb-1.5 ${style.color} ${style.border}`}>
                          {p.type}
                        </Badge>
                        <p className="text-sm text-foreground/90">{p.message}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Weak topics quick view */}
      {weakTopics.length > 0 && (
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Weakest DSA Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((t, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs border-rose-500/30 text-rose-400 bg-rose-500/5"
                >
                  {t.topic}: {t.totalSolved} solved (need {t.gap} more)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Plan */}
      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Suggested Weekly Plan</CardTitle>
            <Badge variant="secondary" className="text-xs">Auto-generated</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Day</TableHead>
                <TableHead className="w-[120px]">Focus Area</TableHead>
                <TableHead>Action Item</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklyPlan.map((plan, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{plan.day}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${DAY_FOCUS_COLORS[plan.focus] || 'text-muted-foreground bg-muted'}`}
                    >
                      {plan.focus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-foreground/80">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      {plan.action}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}