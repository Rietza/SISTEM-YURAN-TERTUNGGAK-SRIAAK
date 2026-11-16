'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, formatRM, formatDate } from '@/components/shared/api'
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
import { toast } from 'sonner'
import {
  BadgePercent, HeartHandshake, FileText, Search, Plus, RefreshCw,
  AlertCircle, UserCheck, Coins, Gift, Users,
} from 'lucide-react'

type JenisPengecualian = 'DISKAUN_ADIK_BERADIK' | 'BANTUAN' | 'PENGECUALIAN'

const JENIS_META: Record<JenisPengecualian, { label: string; badge: string; icon: any }> = {
  DISKAUN_ADIK_BERADIK: { label: 'Diskaun Adik Beradik', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Users },
  BANTUAN: { label: 'Bantuan', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30', icon: HeartHandshake },
  PENGECUALIAN: { label: 'Pengecualian', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: FileText },
}

export function Pengecualian({ onBukaMurid }: { onBukaMurid: (id: string) => void }) {
  const { pengguna } = useAuth()
  const [senarai, setSenarai] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ralat, setRalat] = useState<string | null>(null)
  const [tapisJenis, setTapisJenis] = useState('SEMUA')
  const [cari, setCari] = useState('')

  // Dialog
  const [dialogBuka, setDialogBuka] = useState(false)
  const [cariMurid, setCariMurid] = useState('')
  const [senaraiMurid, setSenaraiMurid] = useState<any[]>([])
  const [muridTerpilih, setMuridTerpilih] = useState<any | null>(null)
  const [jenis, setJenis] = useState<JenisPengecualian>('DISKAUN_ADIK_BERADIK')
  const [jumlah, setJumlah] = useState('')
  const [sebab, setSebab] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  const muat = async () => {
    setLoading(true); setRalat(null)
    try {
      const d = await apiGet('/api/pengecualian')
      setSenarai(d.pengecualian ?? [])
    } catch (e: any) {
      setRalat(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { muat() }, [])

  const muatSenaraiMurid = async () => {
    if (cariMurid.length < 2) { setSenaraiMurid([]); return }
    try {
      const d = await apiGet(`/api/murid?cari=${encodeURIComponent(cariMurid)}&pageSize=20`)
      setSenaraiMurid(d.murid)
    } catch {}
  }

  useEffect(() => {
    const t = setTimeout(muatSenaraiMurid, 250)
    return () => clearTimeout(t)
  }, [cariMurid])

  const simpan = async () => {
    if (!muridTerpilih) { toast.error('Pilih murid dahulu'); return }
    const j = parseFloat(jumlah)
    if (!j || j <= 0) { toast.error('Jumlah tidak sah'); return }
    if (!sebab.trim()) { toast.error('Sebab perlu diisi'); return }
    if (!pengguna) { toast.error('Sesi tidak sah'); return }
    setMenyimpan(true)
    try {
      await apiPost('/api/pengecualian', {
        muridId: muridTerpilih.id,
        jenis,
        jumlah: j,
        sebab: sebab.trim(),
        diluluskanOlehId: pengguna.id,
      })
      toast.success('Pengecualian/bantuan berjaya direkod')
      setDialogBuka(false)
      setMuridTerpilih(null); setCariMurid(''); setSenaraiMurid([])
      setJumlah(''); setSebab('')
      muat()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setMenyimpan(false)
    }
  }

  const stats = useMemo(() => {
    let diskaun = 0, bantuan = 0, pengecualian = 0
    for (const p of senarai) {
      if (p.jenis === 'DISKAUN_ADIK_BERADIK') diskaun += p.jumlah ?? 0
      else if (p.jenis === 'BANTUAN') bantuan += p.jumlah ?? 0
      else if (p.jenis === 'PENGECUALIAN') pengecualian += p.jumlah ?? 0
    }
    return { diskaun, bantuan, pengecualian, jumlah: senarai.length }
  }, [senarai])

  const senaraiTapis = useMemo(() => {
    return senarai.filter(p => {
      if (tapisJenis !== 'SEMUA' && p.jenis !== tapisJenis) return false
      if (cari) {
        const q = cari.toLowerCase()
        if (!p.namaMurid?.toLowerCase().includes(q) && !p.sebab?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [senarai, tapisJenis, cari])

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={BadgePercent} label="Diskaun Adik Beradik" value={formatRM(stats.diskaun)} color="bg-emerald-500/15 text-emerald-400" />
        <StatCard icon={HeartHandshake} label="Bantuan" value={formatRM(stats.bantuan)} color="bg-sky-500/15 text-sky-400" />
        <StatCard icon={FileText} label="Pengecualian" value={formatRM(stats.pengecualian)} color="bg-amber-500/15 text-amber-400" />
        <StatCard icon={Coins} label="Jumlah Pengecualian" value={stats.jumlah} color="bg-rose-500/15 text-rose-400" />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama / sebab..." className="pl-9" />
          </div>
          <Select value={tapisJenis} onValueChange={setTapisJenis}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMUA">Semua Jenis</SelectItem>
              <SelectItem value="DISKAUN_ADIK_BERADIK">Diskaun Adik Beradik</SelectItem>
              <SelectItem value="BANTUAN">Bantuan</SelectItem>
              <SelectItem value="PENGECUALIAN">Pengecualian</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={muat} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Muat Semula
          </Button>
          <Dialog open={dialogBuka} onOpenChange={setDialogBuka}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Pengecualian / Bantuan</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Cari Murid</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={cariMurid} onChange={(e) => setCariMurid(e.target.value)} placeholder="Nama / No. murid..." className="pl-9" />
                  </div>
                  {senaraiMurid.length > 0 && (
                    <div className="mt-1 border border-border/40 rounded-lg max-h-48 overflow-y-auto bg-popover">
                      {senaraiMurid.map((m) => (
                        <button key={m.id} onClick={() => { setMuridTerpilih(m); setCariMurid(m.nama); setSenaraiMurid([]) }} className="w-full text-left p-2 hover:bg-muted/40 border-b border-border/20 last:border-0">
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
                  <Label>Jenis</Label>
                  <Select value={jenis} onValueChange={(v) => setJenis(v as JenisPengecualian)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DISKAUN_ADIK_BERADIK">Diskaun Adik Beradik</SelectItem>
                      <SelectItem value="BANTUAN">Bantuan</SelectItem>
                      <SelectItem value="PENGECUALIAN">Pengecualian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jumlah (RM)</Label>
                  <Input type="number" step="0.01" value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder="100.00" />
                </div>
                <div>
                  <Label>Sebab / Justifikasi</Label>
                  <Textarea value={sebab} onChange={(e) => setSebab(e.target.value)} rows={3} placeholder="cth. Dua adik beradik berdaftar, layak diskaun 10%..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogBuka(false)}>Batal</Button>
                <Button onClick={simpan} disabled={menyimpan}>
                  {menyimpan ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Menyimpan...</> : 'Simpan'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted/40 rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted/30 rounded w-2/3 mb-3" />
                <div className="h-6 bg-muted/30 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!ralat && !loading && senaraiTapis.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Gift className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Tiada pengecualian / bantuan direkodkan</p>
          </CardContent>
        </Card>
      )}

      {!ralat && !loading && senaraiTapis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {senaraiTapis.map((p) => {
            const meta = JENIS_META[p.jenis as JenisPengecualian] ?? JENIS_META.PENGECUALIAN
            const Icon = meta.icon
            return (
              <Card key={p.id} className="bg-card/40 hover:border-border transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm">
                        <button
                          className="hover:text-primary hover:underline truncate block"
                          onClick={() => onBukaMurid(p.muridId)}
                        >
                          {p.namaMurid}
                        </button>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.kelas}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] py-0 shrink-0 ${meta.badge}`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {meta.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Jumlah</span>
                    <span className="text-lg font-bold text-primary">{formatRM(p.jumlah)}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Sebab</p>
                    <p className="text-xs leading-relaxed line-clamp-3">{p.sebab}</p>
                  </div>
                  <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      Diluluskan: {p.diluluskanOleh ?? '-'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(p.tarikhCipta)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
