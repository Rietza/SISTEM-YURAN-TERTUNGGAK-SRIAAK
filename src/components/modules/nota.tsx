'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, formatDateTime, formatDate } from '@/components/shared/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/components/auth-context'
import { TODAY } from '@/lib/tunggakan'
import { toast } from 'sonner'
import {
  StickyNote, Search, Plus, RefreshCw, AlertCircle, Phone,
  CalendarCheck, Banknote, Home, FileText, Calendar, User, Filter,
} from 'lucide-react'

type JenisNota = 'PANGGILAN' | 'TEMU_JANJI' | 'JANJI_BAYAR' | 'LAWATAN' | 'LAIN'

const JENIS_META: Record<JenisNota, { label: string; badge: string; icon: any }> = {
  PANGGILAN: { label: 'Panggilan', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Phone },
  TEMU_JANJI: { label: 'Temu Janji', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CalendarCheck },
  JANJI_BAYAR: { label: 'Janji Bayar', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30', icon: Banknote },
  LAWATAN: { label: 'Lawatan', badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: Home },
  LAIN: { label: 'Lain-lain', badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: FileText },
}

export function Nota({ onBukaMurid }: { onBukaMurid: (id: string) => void }) {
  const { pengguna } = useAuth()
  const [nota, setNota] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ralat, setRalat] = useState<string | null>(null)
  const [tapisJenis, setTapisJenis] = useState<string>('SEMUA')
  const [cari, setCari] = useState('')

  // Dialog
  const [dialogBuka, setDialogBuka] = useState(false)
  const [cariMurid, setCariMurid] = useState('')
  const [senarai, setSenarai] = useState<any[]>([])
  const [muridTerpilih, setMuridTerpilih] = useState<any | null>(null)
  const [jenis, setJenis] = useState<JenisNota>('PANGGILAN')
  const [catatan, setCatatan] = useState('')
  const [janjiTarikh, setJanjiTarikh] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  const muat = async () => {
    setLoading(true); setRalat(null)
    try {
      const d = await apiGet('/api/nota')
      setNota(d.nota ?? [])
    } catch (e: any) {
      setRalat(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { muat() }, [])

  const muatSenarai = async () => {
    if (cariMurid.length < 2) { setSenarai([]); return }
    try {
      const d = await apiGet(`/api/murid?cari=${encodeURIComponent(cariMurid)}&pageSize=20`)
      setSenarai(d.murid)
    } catch {}
  }

  useEffect(() => {
    const t = setTimeout(muatSenarai, 250)
    return () => clearTimeout(t)
  }, [cariMurid])

  const simpan = async () => {
    if (!muridTerpilih) { toast.error('Pilih murid dahulu'); return }
    if (!catatan.trim()) { toast.error('Catatan tidak boleh kosong'); return }
    if (!pengguna) { toast.error('Sesi tidak sah'); return }
    setMenyimpan(true)
    try {
      await apiPost('/api/nota', {
        muridId: muridTerpilih.id,
        jenis,
        catatan: catatan.trim(),
        janjiBayarTarikh: janjiTarikh || null,
        diciptaOlehId: pengguna.id,
      })
      toast.success('Nota susulan berjaya direkod')
      setDialogBuka(false)
      setMuridTerpilih(null); setCariMurid(''); setSenarai([])
      setCatatan(''); setJanjiTarikh('')
      muat()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setMenyimpan(false)
    }
  }

  const bulanIni = TODAY.getMonth()
  const tahunIni = TODAY.getFullYear()
  const stats = useMemo(() => {
    const s: Record<string, number> = { PANGGILAN: 0, TEMU_JANJI: 0, JANJI_BAYAR: 0, LAWATAN: 0, LAIN: 0 }
    for (const n of nota) {
      const d = new Date(n.tarikhCipta)
      if (d.getMonth() === bulanIni && d.getFullYear() === tahunIni) {
        s[n.jenis] = (s[n.jenis] ?? 0) + 1
      }
    }
    return s
  }, [nota, bulanIni, tahunIni])

  const notaTapis = useMemo(() => {
    return nota.filter(n => {
      if (tapisJenis !== 'SEMUA' && n.jenis !== tapisJenis) return false
      if (cari) {
        const q = cari.toLowerCase()
        if (!n.namaMurid?.toLowerCase().includes(q) && !n.catatan?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [nota, tapisJenis, cari])

  // Group by date (yyyy-mm-dd)
  const notaBerkumpul = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const n of notaTapis) {
      const k = new Date(n.tarikhCipta).toISOString().slice(0, 10)
      if (!map[k]) map[k] = []
      map[k].push(n)
    }
    return Object.entries(map).sort((a, b) => a[0] < b[0] ? 1 : -1)
  }, [notaTapis])

  const StatCard = ({ jenis: j }: { jenis: JenisNota }) => {
    const meta = JENIS_META[j]
    const Icon = meta.icon
    return (
      <Card className="bg-card/40">
        <CardContent className="p-3 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${meta.badge}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{meta.label} (Bulan Ini)</p>
            <p className="text-lg font-bold">{stats[j] ?? 0}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard jenis="PANGGILAN" />
        <StatCard jenis="TEMU_JANJI" />
        <StatCard jenis="JANJI_BAYAR" />
        <StatCard jenis="LAWATAN" />
        <StatCard jenis="LAIN" />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama / catatan..." className="pl-9" />
          </div>
          <Select value={tapisJenis} onValueChange={setTapisJenis}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMUA">Semua Jenis</SelectItem>
              <SelectItem value="PANGGILAN">Panggilan</SelectItem>
              <SelectItem value="TEMU_JANJI">Temu Janji</SelectItem>
              <SelectItem value="JANJI_BAYAR">Janji Bayar</SelectItem>
              <SelectItem value="LAWATAN">Lawatan</SelectItem>
              <SelectItem value="LAIN">Lain-lain</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={muat} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Muat Semula
          </Button>
          <Dialog open={dialogBuka} onOpenChange={setDialogBuka}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nota Baru</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Nota Susulan</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Cari Murid</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={cariMurid} onChange={(e) => setCariMurid(e.target.value)} placeholder="Nama / No. murid..." className="pl-9" />
                  </div>
                  {senarai.length > 0 && (
                    <div className="mt-1 border border-border/40 rounded-lg max-h-48 overflow-y-auto bg-popover">
                      {senarai.map((m) => (
                        <button key={m.id} onClick={() => { setMuridTerpilih(m); setCariMurid(m.nama); setSenarai([]) }} className="w-full text-left p-2 hover:bg-muted/40 border-b border-border/20 last:border-0">
                          <p className="text-sm font-medium">{m.nama}</p>
                          <p className="text-xs text-muted-foreground">{m.noMurid} • {m.kelas}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {muridTerpilih && (
                    <p className="text-xs mt-1 text-muted-foreground">Terpilih: <span className="text-foreground font-medium">{muridTerpilih.nama}</span></p>
                  )}
                </div>
                <div>
                  <Label>Jenis Susulan</Label>
                  <Select value={jenis} onValueChange={(v) => setJenis(v as JenisNota)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PANGGILAN">Panggilan Telefon</SelectItem>
                      <SelectItem value="TEMU_JANJI">Temu Janji</SelectItem>
                      <SelectItem value="JANJI_BAYAR">Janji Bayar</SelectItem>
                      <SelectItem value="LAWATAN">Lawatan Rumah</SelectItem>
                      <SelectItem value="LAIN">Lain-lain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Catatan</Label>
                  <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={4} placeholder="Butiran perbualan / temu janji..." />
                </div>
                <div>
                  <Label>Tarikh Janji Bayar (jika ada)</Label>
                  <Input type="date" value={janjiTarikh} onChange={(e) => setJanjiTarikh(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogBuka(false)}>Batal</Button>
                <Button onClick={simpan} disabled={menyimpan}>
                  {menyimpan ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Menyimpan...</> : 'Simpan Nota'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {ralat && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-sm text-muted-foreground">{ralat}</p>
            <Button variant="outline" size="sm" onClick={muat}>Cuba Semula</Button>
          </CardContent>
        </Card>
      )}

      {!ralat && loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 border border-border/30 rounded-lg animate-pulse">
              <div className="h-3 bg-muted/40 rounded w-1/4 mb-2" />
              <div className="h-2.5 bg-muted/30 rounded w-3/4 mb-1.5" />
              <div className="h-2.5 bg-muted/30 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!ralat && !loading && notaTapis.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Tiada nota susulan ditemui</p>
          </CardContent>
        </Card>
      )}

      {!ralat && !loading && notaTapis.length > 0 && (
        <ScrollArea className="max-h-[640px]">
          <div className="space-y-4 pr-2">
            {notaBerkumpul.map(([tarikh, items]) => (
              <div key={tarikh}>
                <div className="sticky top-0 z-10 bg-background/90 backdrop-blur px-2 py-1 text-xs font-semibold text-muted-foreground mb-2">
                  {formatDate(tarikh)}
                </div>
                <div className="space-y-2">
                  {items.map((n) => {
                    const meta = JENIS_META[n.jenis as JenisNota] ?? JENIS_META.LAIN
                    const Icon = meta.icon
                    return (
                      <div key={n.id} className="relative pl-6">
                        <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-border bg-background" />
                        <Card className="bg-card/40">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge variant="outline" className={`text-[10px] py-0 ${meta.badge}`}>
                                  <Icon className="w-3 h-3 mr-1" />
                                  {meta.label}
                                </Badge>
                                <button
                                  className="text-sm font-medium hover:text-primary hover:underline truncate"
                                  onClick={() => onBukaMurid(n.muridId)}
                                >
                                  {n.namaMurid}
                                </button>
                                <span className="text-xs text-muted-foreground shrink-0">{n.kelas}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">{formatDateTime(n.tarikhCipta)}</span>
                            </div>
                            <p className="text-sm leading-relaxed mb-2 whitespace-pre-wrap">{n.catatan}</p>
                            {n.janjiBayarTarikh && (
                              <div className="flex items-center gap-1.5 text-xs text-sky-400 bg-sky-500/10 inline-flex px-2 py-1 rounded">
                                <Calendar className="w-3 h-3" />
                                Janji bayar: {formatDate(n.janjiBayarTarikh)}
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                              <User className="w-3 h-3" /> Dicipta oleh {n.diciptaOleh ?? '-'}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
