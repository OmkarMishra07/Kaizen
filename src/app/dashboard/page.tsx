'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { RANK_LADDER } from '@/lib/types'
import type { CategoryScore, GapAnalysis } from '@/lib/types'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Trophy, LogOut, Loader2, BarChart3, Monitor, Grid3X3, CheckSquare, Activity, Target, Code2 } from 'lucide-react'

import { RankBadge } from '@/components/dashboard/rank-badge'
import { ScoreBreakdown } from '@/components/dashboard/score-breakdown'
import { NextLevelCard } from '@/components/dashboard/next-level-card'
import { StreakHeatmap } from '@/components/dashboard/streak-heatmap'
import { ScoreHistoryChart } from '@/components/dashboard/score-history-chart'
import { PlatformList } from '@/components/platforms/platform-list'
import { TopicMatrix } from '@/components/topics/topic-matrix'
import { SkillChecklist } from '@/components/checklist/skill-checklist'
import { ActivityLog } from '@/components/activity/activity-log'
import { DevelopmentPanel } from '@/components/development/development-panel'
import { GoalPlanner } from '@/components/goals/goal-planner'

// ─── Category Score Card ──────────────────────────────────────────────────────

function CategoryScoreCard({ label, data, color }: { label: string; data: CategoryScore; color: string }) {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold" style={{ color }}>{data.score}</p>
        <p className="text-xs text-muted-foreground">/ {data.maxScore}</p>
        <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        <p className="text-xs mt-1 font-medium" style={{ color }}>{data.percentage}%</p>
      </CardContent>
    </Card>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ token }: { token: string }) {
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['score'],
    queryFn: async () => {
      const res = await fetch('/api/score', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch score')
      return res.json() as Promise<{
        score: {
          compositeScore: number
          rankLevel: string
          rankName: string
          dsa: CategoryScore
          backend: CategoryScore
          portfolio: CategoryScore
          consistency: CategoryScore
          interview: CategoryScore
        }
        gaps: GapAnalysis
        context: {
          totalProblems: number
          topicsCovered: number
          totalTopics: number
          checklistCompleted: number
          checklistTotal: number
          projectCount: number
          currentStreak: number
          longestStreak: number
        }
      }>
    },
  })

  const { data: historyData } = useQuery({
    queryKey: ['score-history'],
    queryFn: async () => {
      const res = await fetch('/api/score/history?days=90', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch history')
      return res.json() as Promise<{
        history: Array<{
          date: string
          compositeScore: number
          dsaScore: number
          backendScore: number
          portfolioScore: number
          consistencyScore: number
          interviewScore: number
        }>
      }>
    },
  })

  const { data: activityData } = useQuery({
    queryKey: ['activity-heatmap'],
    queryFn: async () => {
      const res = await fetch('/api/activity?days=90', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<{
        logs: Array<{
          id: string
          date: string
          syncedProblems: number
          commitsMade: number
          platformActivity: string | null
          notes: string | null
        }>
        stats: { currentStreak: number; longestStreak: number; sevenDayActivePct: number; thirtyDayActivePct: number }
      }>
    },
  })

  const handleRefresh = () => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['score-history'] })
    queryClient.invalidateQueries({ queryKey: ['activity-heatmap'] })
    toast.success('Data refreshed')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-[300px] rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">Failed to load dashboard data.</p>
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          Retry
        </Button>
      </div>
    )
  }

  const { score, gaps, context } = data
  const rankColor = RANK_LADDER.find(r => r.level === score.rankLevel)?.color || '#10b981'
  const snapshots = historyData?.history || []
  const activityLogs = activityData?.logs || []
  const activityStats = activityData?.stats

  return (
    <div className="space-y-6">
      {/* Top: Rank Badge + Composite Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RankBadge
          level={score.rankLevel}
          name={score.rankName}
          score={score.compositeScore}
          color={rankColor}
        />
        <div className="lg:col-span-2 flex flex-col gap-4">
          <ScoreBreakdown
            dsa={score.dsa}
            backend={score.backend}
            portfolio={score.portfolio}
            consistency={score.consistency}
            interview={score.interview}
          />
          {/* Quick context stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat label="Problems" value={String(context.totalProblems)} />
            <MiniStat label="Topics" value={`${context.topicsCovered}/${context.totalTopics}`} />
            <MiniStat label="Checklist" value={`${context.checklistCompleted}/${context.checklistTotal}`} />
            <MiniStat label="Projects" value={String(context.projectCount)} />
          </div>
        </div>
      </div>

      {/* Category Score Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <CategoryScoreCard label="DSA" data={score.dsa} color="#f59e0b" />
        <CategoryScoreCard label="Backend" data={score.backend} color="#8b5cf6" />
        <CategoryScoreCard label="Portfolio" data={score.portfolio} color="#06b6d4" />
        <CategoryScoreCard label="Consistency" data={score.consistency} color="#f43f5e" />
        <CategoryScoreCard label="Interview" data={score.interview} color="#ec4899" />
      </div>

      {/* Next Level + Streak Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NextLevelCard
          nextRankLevel={gaps.nextRankLevel}
          nextRankName={gaps.nextRankName}
          scoreGap={gaps.scoreGap}
          suggestions={gaps.suggestions}
        />
        <StreakHeatmap
          logs={activityLogs}
          currentStreak={activityStats?.currentStreak || context.currentStreak}
          longestStreak={activityStats?.longestStreak || context.longestStreak}
        />
      </div>

      {/* Score History */}
      <ScoreHistoryChart snapshots={snapshots} />
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 border">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  )
}

// ─── Dashboard Shell ──────────────────────────────────────────────────────────

function Dashboard({ token }: { token: string }) {
  const logout = useAuthStore(s => s.logout)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-emerald-500" />
            <h1 className="text-base font-bold tracking-tight">Kaizen</h1>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={logout}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full flex h-auto p-1 bg-muted/50 rounded-lg mb-6 overflow-x-auto">
            <TabsTrigger value="overview" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background">
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="platforms" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background">
              <Monitor className="w-3.5 h-3.5" />
              Platforms
            </TabsTrigger>
            <TabsTrigger value="topics" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background">
              <Grid3X3 className="w-3.5 h-3.5" />
              Topics
            </TabsTrigger>
            <TabsTrigger value="development" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background">
              <Code2 className="w-3.5 h-3.5" />
              Development
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background">
              <CheckSquare className="w-3.5 h-3.5" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background">
              <Activity className="w-3.5 h-3.5" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background">
              <Target className="w-3.5 h-3.5" />
              Goals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab token={token} />
          </TabsContent>

          <TabsContent value="platforms">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Platform Accounts</h2>
              <p className="text-sm text-muted-foreground">Connect and sync your coding platform accounts.</p>
            </div>
            <PlatformList token={token} />
          </TabsContent>

          <TabsContent value="topics">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">DSA Topic Coverage</h2>
              <p className="text-sm text-muted-foreground">Visual breakdown of your problem-solving across all DSA topics.</p>
            </div>
            <TopicMatrix token={token} />
          </TabsContent>

          <TabsContent value="development">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Development & Projects</h2>
              <p className="text-sm text-muted-foreground">Your open-source contributions and development activity.</p>
            </div>
            <DevelopmentPanel token={token} />
          </TabsContent>

          <TabsContent value="checklist">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Backend Skill Checklist</h2>
              <p className="text-sm text-muted-foreground">Track your backend engineering skills with evidence.</p>
            </div>
            <SkillChecklist token={token} />
          </TabsContent>

          <TabsContent value="activity">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Daily Activity & Consistency</h2>
              <p className="text-sm text-muted-foreground">Your activity log and streak tracking.</p>
            </div>
            <ActivityLog token={token} />
          </TabsContent>

          <TabsContent value="goals">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Goal Planner</h2>
              <p className="text-sm text-muted-foreground">AI-generated priorities and a weekly focus plan based on your gaps.</p>
            </div>
            <GoalPlanner token={token} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-muted-foreground">
            SDE Readiness Tracker — Your single trackable number for interview readiness
          </p>
        </div>
      </footer>
    </div>
  )
}

// ─── Root Page ────────────────────────────────────────────────────────────────

import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, token, init, isLoading } = useAuthStore()

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return <Dashboard token={token} />
}
