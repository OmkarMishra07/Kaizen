'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Link2, ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { CHECKLIST_CATEGORY_LABELS, type ChecklistCategory } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'

interface SkillChecklistProps {
  token: string
}

interface ChecklistItem {
  id: string
  category: string
  skill: string
  description: string | null
  isCompleted: boolean
  evidenceUrl: string | null
  evidenceNote: string | null
  createdAt: string
  completedAt: string | null
}

export function SkillChecklist({ token }: SkillChecklistProps) {
  const queryClient = useQueryClient()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [evidenceDialogItem, setEvidenceDialogItem] = useState<ChecklistItem | null>(null)
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceNote, setEvidenceNote] = useState('')
  const [savingEvidence, setSavingEvidence] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['checklist'],
    queryFn: async () => {
      const res = await fetch('/api/checklist', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch checklist')
      return res.json() as Promise<{ items: ChecklistItem[] }>
    },
  })

  const items = data?.items || []

  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const toggleItem = async (item: ChecklistItem) => {
    try {
      const res = await fetch('/api/checklist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: item.id, isCompleted: !item.isCompleted }),
      })
      if (!res.ok) throw new Error('Failed to update')
      queryClient.invalidateQueries({ queryKey: ['checklist'] })
    } catch {
      toast.error('Failed to update checklist item')
    }
  }

  const openEvidence = (item: ChecklistItem) => {
    setEvidenceDialogItem(item)
    setEvidenceUrl(item.evidenceUrl || '')
    setEvidenceNote(item.evidenceNote || '')
  }

  const saveEvidence = async () => {
    if (!evidenceDialogItem) return
    setSavingEvidence(true)
    try {
      const res = await fetch('/api/checklist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: evidenceDialogItem.id,
          evidenceUrl: evidenceUrl.trim() || null,
          evidenceNote: evidenceNote.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Evidence saved')
      queryClient.invalidateQueries({ queryKey: ['checklist'] })
      setEvidenceDialogItem(null)
    } catch {
      toast.error('Failed to save evidence')
    } finally {
      setSavingEvidence(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-xl border shadow-sm">
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load checklist. Please try refreshing.
      </div>
    )
  }

  const categoryOrder = Object.keys(CHECKLIST_CATEGORY_LABELS)

  return (
    <div className="space-y-4">
      {/* Evidence Dialog */}
      <Dialog open={!!evidenceDialogItem} onOpenChange={() => setEvidenceDialogItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Evidence — {evidenceDialogItem?.skill}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Evidence URL</Label>
              <Input
                placeholder="https://github.com/..."
                value={evidenceUrl}
                onChange={e => setEvidenceUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Describe what you did, what you learned..."
                value={evidenceNote}
                onChange={e => setEvidenceNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveEvidence} disabled={savingEvidence}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {categoryOrder.map(cat => {
        const catItems = grouped[cat]
        if (!catItems || catItems.length === 0) return null
        const completed = catItems.filter(i => i.isCompleted).length
        const total = catItems.length
        const pct = Math.round((completed / total) * 100)
        const isExpanded = expandedCategories.has(cat)
        const label = CHECKLIST_CATEGORY_LABELS[cat as ChecklistCategory]

        return (
          <Card key={cat} className="rounded-xl border shadow-sm">
            <CardHeader
              className="pb-3 cursor-pointer select-none"
              onClick={() => toggleCategory(cat)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                  <Badge variant={pct === 100 ? 'default' : 'secondary'} className="text-xs">
                    {completed}/{total}
                  </Badge>
                </div>
                <span className={`text-sm font-bold ${pct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>{pct}%</span>
              </div>
              <Progress value={pct} className="mt-2 h-1.5" />
            </CardHeader>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <CardContent className="pt-0 space-y-1">
                    {catItems.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors hover:bg-muted/50 ${item.isCompleted ? 'opacity-70' : ''}`}
                      >
                        <Checkbox
                          checked={item.isCompleted}
                          onCheckedChange={() => toggleItem(item)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${item.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                              {item.skill}
                            </span>
                            {item.isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={(e) => { e.stopPropagation(); openEvidence(item) }}
                        >
                          <Link2 className={`w-3.5 h-3.5 ${item.evidenceUrl ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )
      })}

      {items.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Circle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No checklist items yet</p>
          <p className="text-sm mt-1">Set up your account to seed default items.</p>
        </div>
      )}
    </div>
  )
}
