'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { GitMerge, Star, Code2, BookOpen, GitCommit, FileText, AlertCircle } from 'lucide-react'

export function DevelopmentPanel({ token }: { token: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['development'],
    queryFn: async () => {
      const res = await fetch('/api/development', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch development data')
      return res.json()
    },
  })

  if (isLoading) {
    return <Skeleton className="h-96 rounded-xl w-full" />
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center">
          <AlertCircle className="w-8 h-8 mb-3" />
          <p>Failed to load development data. Try refreshing the page.</p>
        </CardContent>
      </Card>
    )
  }

  if (!data.connected) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center">
          <GitMerge className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium text-foreground">GitHub Not Connected</p>
          <p className="mt-2">Go to the Platforms tab to connect your GitHub account and see your development stats here.</p>
        </CardContent>
      </Card>
    )
  }

  const { stats, handle } = data

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center">
          <GitMerge className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium text-foreground">No stats available for @{handle}</p>
          <p className="mt-2">Check back after your next platform sync.</p>
        </CardContent>
      </Card>
    )
  }

  const totalRepos = stats.repos || 0
  const commits = stats.recentCommits || 0
  const stars = stats.stars || 0
  const withReadme = stats.reposWithReadme || 0
  const languages = stats.languages || {}
  const topRepos = stats.topRepos || []

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Repositories</p>
              <p className="text-2xl font-bold">{totalRepos}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <GitCommit className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Recent Commits</p>
              <p className="text-2xl font-bold">{commits}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Stars</p>
              <p className="text-2xl font-bold">{stars}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Repos w/ README</p>
              <p className="text-2xl font-bold">{withReadme}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Repositories */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GitMerge className="w-5 h-5" /> Top Repositories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topRepos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No repositories found.</p>
            ) : (
              <div className="space-y-4">
                {topRepos.map((repo: any, i: number) => (
                  <div key={i} className="flex flex-col gap-1 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <a 
                        href={repo.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="font-medium text-primary hover:underline"
                      >
                        {repo.name}
                      </a>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <Code2 className="w-3 h-3" /> {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" /> {repo.stars}
                        </span>
                      </div>
                    </div>
                    {repo.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{repo.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Languages Map */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Code2 className="w-5 h-5" /> Languages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(languages).length === 0 ? (
              <p className="text-sm text-muted-foreground">No language data available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(languages)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([lang, count]) => (
                    <Badge key={lang} variant="secondary" className="px-3 py-1">
                      {lang} <span className="opacity-50 ml-1">({count as number})</span>
                    </Badge>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
