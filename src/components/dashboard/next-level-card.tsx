'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, Target, Lightbulb } from 'lucide-react'
import { motion } from 'framer-motion'

interface NextLevelCardProps {
  nextRankLevel: string
  nextRankName: string
  scoreGap: number
  suggestions: string[]
}

export function NextLevelCard({ nextRankLevel, nextRankName, scoreGap, suggestions }: NextLevelCardProps) {
  const isMaxLevel = scoreGap === 0

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Target className="w-4 h-4 text-amber-500" />
          {isMaxLevel ? 'Maximum Level Reached' : `Next: ${nextRankLevel} — ${nextRankName}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isMaxLevel && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-sm text-muted-foreground">Score gap to next level</span>
            <div className="flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4 text-amber-500" />
              <span className="text-lg font-bold text-amber-500">{scoreGap}</span>
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lightbulb className="w-3.5 h-3.5" />
            Suggestions
          </div>
          <ul className="space-y-2">
            {suggestions.map((suggestion, i) => (
              <motion.li
                key={i}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2 text-sm"
              >
                <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px] px-1.5 py-0">
                  {i + 1}
                </Badge>
                <span className="text-foreground/80 leading-relaxed">{suggestion}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}