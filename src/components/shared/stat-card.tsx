'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export function StatCard({
  tajuk, nilai, subTajuk, ikon: Ikon, warnaKelas = 'text-primary', aksenKelas = 'bg-primary/10 border-primary/20',
}: {
  tajuk: string
  nilai: string | number
  subTajuk?: string
  ikon?: LucideIcon
  warnaKelas?: string
  aksenKelas?: string
}) {
  return (
    <Card className="overflow-hidden border-border/60 bg-card/60 hover:bg-card transition">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{tajuk}</p>
            <p className="text-2xl font-bold text-foreground mt-1 truncate">{nilai}</p>
            {subTajuk && <p className="text-xs text-muted-foreground mt-1">{subTajuk}</p>}
          </div>
          {Ikon && (
            <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0', aksenKelas)}>
              <Ikon className={cn('w-5 h-5', warnaKelas)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
