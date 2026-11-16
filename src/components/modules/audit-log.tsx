'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiGet, formatDateTime } from '@/components/shared/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TODAY } from '@/lib/tunggakan'
import { PERANAN_LABEL } from '@/components/auth-context'
import { toast } from 'sonner'
import {
  ScrollText, Search, RefreshCw, AlertCircle, Activity, Users, Clock,
} from 'lucide-react'

// Color-coding for common tindakan
function tindakanBadge(tindakan: string): string {
  const t = tindakan?.toUpperCase() ?? ''
  if (t.includes('CIPTA') || t.includes('CREATE') || t.includes('TAMBAH')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (t.includes('KEMASKINI') || t.includes('UPDATE') || t.includes('PATCH')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  if (t.includes('PADAM') || t.includes('DELETE')) return 'bg-rose-500/15 text-rose-400 border-rose-500/30'
  if (t.includes('LOG_MASUK') || t.includes('LOGIN')) return 'bg-sky-500/15 text-sky-400 border-sky-500/30'
  if (t.includes('LOG_KELUAR') || t.includes('LOGOUT')) return 'bg-slate-500/15 text-slate-400 border-slate-500/30'
  if (t.includes('HANTAR') || t.includes('SEND')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  return 'bg-slate-500/15 text-slate-400 border-slate-500/30'
}

function perananBadge(peranan: string): string {
  switch (peranan) {
    case 'PENTADBIR': return 'bg-primary/15 text-primary border-primary/30'
    case 'BENDAHARI': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'PENGETUA': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'GURU_KELAS': return 'bg-sky-500/15 text-sky-400 border-sky-500/30'
    default: return 'bg-slate-500/15 text-slate-400 border-slate-500/30'
  }
}

export function AuditLog() {
  const [log, setLog] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ralat, setRalat] = useState<string | null>(null)
  const [cari, setCari] = useState('')

  const muat = async () => {
    setLoading(true); setRalat(null)
    try {
      const d = await apiGet('/api/audit?limit=100')
      setLog(d.log ?? [])
    } catch (e: any) {
      setRalat(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { muat() }, [])

  const logTapis = useMemo(() => {
    if (!cari) return log
    const q = cari.toLowerCase()
    return log.filter(l =>
      l.tindakan?.toLowerCase().includes(q) ||
      l.namaPengguna?.toLowerCase().includes(q) ||
      l.entiti?.toLowerCase().includes(q) ||
      l.butiran?.toLowerCase().includes(q)
    )
  }, [log, cari])

  const bilHariIni = useMemo(() => {
    const t = TODAY.toISOString().slice(0, 10)
    return log.filter(l => new Date(l.masa).toISOString().slice(0, 10) === t).length
  }, [log])

  const penggunaUnik = useMemo(() => {
    return new Set(log.map(l => l.penggunaId).filter(Boolean)).size
  }, [log])

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <Card className="bg-card/40">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={Activity} label="Log Hari Ini" value={bilHariIni} color="bg-emerald-500/15 text-emerald-400" />
        <StatCard icon={Users} label="Pengguna Unik" value={penggunaUnik} color="bg-sky-500/15 text-sky-400" />
        <StatCard icon={ScrollText} label="Jumlah Log (100 terkini)" value={log.length} color="bg-amber-500/15 text-amber-400" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari tindakan / pengguna / entiti..." className="pl-9" />
        </div>
        <Button variant="ghost" size="sm" onClick={muat} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Muat Semula
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" /> Log Audit Sistem
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ralat && (
            <div className="text-center py-10 space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-sm text-muted-foreground">{ralat}</p>
              <Button variant="outline" size="sm" onClick={muat}>Cuba Semula</Button>
            </div>
          )}
          {!ralat && loading && (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
              ))}
            </div>
          )}
          {!ralat && !loading && logTapis.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{cari ? 'Tiada log sepadan dengan carian' : 'Tiada log audit ditemui'}</p>
            </div>
          )}
          {!ralat && !loading && logTapis.length > 0 && (
            <ScrollArea className="max-h-[640px]">
              <div className="border border-border/40 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs whitespace-nowrap">Masa</TableHead>
                      <TableHead className="text-xs">Pengguna</TableHead>
                      <TableHead className="text-xs">Peranan</TableHead>
                      <TableHead className="text-xs">Tindakan</TableHead>
                      <TableHead className="text-xs">Entiti</TableHead>
                      <TableHead className="text-xs">Butiran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logTapis.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                          {formatDateTime(l.masa)}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{l.namaPengguna ?? '-'}</TableCell>
                        <TableCell>
                          {l.peranan && (
                            <Badge variant="outline" className={`text-[10px] py-0 ${perananBadge(l.peranan)}`}>
                              {PERANAN_LABEL[l.peranan as keyof typeof PERANAN_LABEL] ?? l.peranan}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] py-0 ${tindakanBadge(l.tindakan)}`}>
                            {l.tindakan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.entiti ?? '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={l.butiran ?? ''}>
                          {l.butiran ?? '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
