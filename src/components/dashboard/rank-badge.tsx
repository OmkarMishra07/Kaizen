'use client'

import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'

interface RankBadgeProps {
  level: string
  name: string
  score: number
  color: string
  compact?: boolean
}

export function RankBadge({ level, name, score, color, compact = false }: RankBadgeProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg font-bold text-xs text-white"
          style={{ backgroundColor: color }}
        >
          {level}
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-medium text-muted-foreground">{name}</span>
          <span className="text-sm font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="relative flex flex-col items-center justify-center rounded-2xl border p-8 w-full max-w-xs mx-auto"
      style={{
        borderColor: color + '40',
        background: `linear-gradient(135deg, ${color}15, ${color}05)`,
      }}
    >
      {/* Decorative ring */}
      <div className="absolute inset-0 rounded-2xl opacity-20" style={{
        background: `radial-gradient(circle at 50% 0%, ${color}30, transparent 70%)`,
      }} />

      <motion.div
        key={score}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className="relative"
      >
        <div
          className="flex items-center justify-center w-20 h-20 rounded-2xl shadow-lg"
          style={{
            backgroundColor: color,
            boxShadow: `0 8px 32px ${color}40`,
          }}
        >
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <div
          className="absolute -top-2 -right-2 flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white border-2 border-background"
          style={{ backgroundColor: color }}
        >
          {level}
        </div>
      </motion.div>

      <h3 className="mt-4 text-lg font-semibold text-foreground">{name}</h3>

      <motion.div
        key={score}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mt-2 text-center"
      >
        <span className="text-4xl font-extrabold tracking-tight" style={{ color }}>
          {score}
        </span>
        <span className="text-sm text-muted-foreground ml-1">/ 1000</span>
      </motion.div>

      <div className="mt-3 w-full bg-muted rounded-full h-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(score / 1000) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  )
}
