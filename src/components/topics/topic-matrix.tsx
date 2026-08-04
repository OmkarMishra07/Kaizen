'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'

interface TopicMatrixProps {
  token: string
}

interface Topic {
  topic: string
  easySolved: number
  mediumSolved: number
  hardSolved: number
  totalSolved: number
  lastUpdated: string | null
}

function getCellColor(count: number): string {
  if (count === 0) return 'bg-rose-500/15 text-rose-400 border-rose-500/20'
  if (count <= 4) return 'bg-orange-500/15 text-orange-400 border-orange-500/20'
  if (count <= 9) return 'bg-amber-500/15 text-amber-400 border-amber-500/20'
  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
}

export function TopicMatrix({ token }: TopicMatrixProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await fetch('/api/topics', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch topics')
      return res.json() as Promise<{ topics: Topic[]; totals: { easySolved: number; mediumSolved: number; hardSolved: number; totalSolved: number } }>
    },
  })

  if (isLoading) {
    return (
      <Card className="rounded-xl border shadow-sm">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load topic coverage. Please try refreshing.
      </div>
    )
  }

  const topics = data?.topics || []
  const totals = data?.totals || { easySolved: 0, mediumSolved: 0, hardSolved: 0, totalSolved: 0 }

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">DSA Topic Coverage Matrix</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Color indicates coverage level: <span className="text-rose-400">0 = gap</span>,{' '}
          <span className="text-orange-400">1-4 = weak</span>,{' '}
          <span className="text-amber-400">5-9 = okay</span>,{' '}
          <span className="text-emerald-400">10+ = strong</span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Topic</TableHead>
                <TableHead className="text-center">Easy</TableHead>
                <TableHead className="text-center">Medium</TableHead>
                <TableHead className="text-center">Hard</TableHead>
                <TableHead className="text-center font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map(t => (
                <TableRow key={t.topic}>
                  <TableCell className="font-medium text-sm">{t.topic}</TableCell>
                  <TableCell className={`text-center text-sm font-mono font-bold border rounded-md mx-auto w-16 ${getCellColor(t.easySolved)}`}>
                    {t.easySolved}
                  </TableCell>
                  <TableCell className={`text-center text-sm font-mono font-bold border rounded-md mx-auto w-16 ${getCellColor(t.mediumSolved)}`}>
                    {t.mediumSolved}
                  </TableCell>
                  <TableCell className={`text-center text-sm font-mono font-bold border rounded-md mx-auto w-16 ${getCellColor(t.hardSolved)}`}>
                    {t.hardSolved}
                  </TableCell>
                  <TableCell className={`text-center text-sm font-mono font-bold border rounded-md mx-auto w-16 ${getCellColor(t.totalSolved)}`}>
                    {t.totalSolved}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell className="text-sm">Total</TableCell>
                <TableCell className="text-center text-sm font-mono">{totals.easySolved}</TableCell>
                <TableCell className="text-center text-sm font-mono">{totals.mediumSolved}</TableCell>
                <TableCell className="text-center text-sm font-mono">{totals.hardSolved}</TableCell>
                <TableCell className="text-center text-sm font-mono text-emerald-400">{totals.totalSolved}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}