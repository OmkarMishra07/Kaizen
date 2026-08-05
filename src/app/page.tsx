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

// ─── Auth Page ────────────────────────────────────────────────────────────────

function AuthPage() {
  const { login, setup, isLoading } = useAuthStore()
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [seeding, setSeeding] = useState(false)

  const trySeed = useCallback(async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.token) {
          localStorage.setItem('sde-token', data.token)
          useAuthStore.setState({ token: data.token, isAuthenticated: true })
          toast.success('Demo data loaded! Logged in as demo/demo')
          return
        }
      }
      // Seed already exists or failed, let user login normally
    } catch {
      // ignore
    }
    setSeeding(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    if (isSetupMode) {
      const ok = await setup(username.trim(), password)
      if (!ok && !useAuthStore.getState().isAuthenticated) {
        // If setup fails because user exists, switch to login
        toast.info('User may already exist. Try logging in.')
      }
    } else {
      await login(username.trim(), password)
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
          return
        }
      }
      // Already seeded, try login
      const ok = await login('demo', 'demo')
      if (!ok) {
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
          <h1 className="text-2xl font-bold">Kaizen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your single trackable number for interview readiness
          </p>
        </div>

        <Card className="rounded-xl border shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
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

export default function HomePage() {
  const { isAuthenticated, token, init } = useAuthStore()

  useEffect(() => {
    init()
  }, [init])

  if (!isAuthenticated || !token) {
    return <AuthPage />
  }

  return <Dashboard token={token} />
}
