'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface CategoryData {
  score: number
  maxScore: number
  percentage: number
}

interface ScoreBreakdownProps {
  dsa: CategoryData
  backend: CategoryData
  portfolio: CategoryData
  consistency: CategoryData
  interview: CategoryData
}

const radarData = (props: ScoreBreakdownProps) => [
  { subject: 'DSA', value: props.dsa.percentage, fullMark: 100 },
  { subject: 'Backend', value: props.backend.percentage, fullMark: 100 },
  { subject: 'Portfolio', value: props.portfolio.percentage, fullMark: 100 },
  { subject: 'Consistency', value: props.consistency.percentage, fullMark: 100 },
  { subject: 'Interview', value: props.interview.percentage, fullMark: 100 },
]

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { subject: string } }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-emerald-400">{payload[0].value}%</p>
      </div>
    )
  }
  return null
}

export function ScoreBreakdown(props: ScoreBreakdownProps) {
  const data = radarData(props)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#888888" strokeOpacity={0.2} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#888888', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#888888', fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
