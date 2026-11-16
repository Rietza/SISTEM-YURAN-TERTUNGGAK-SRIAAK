'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch, formatRM, formatDate } from '@/components/shared/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAuth } from '@/components/auth-context'
import { TODAY, BULAN_NAMA } from '@/lib/tunggakan'
import { toast } from 'sonner'
import {
  CalendarClock, Search, Plus, ChevronDown, ChevronRight, RefreshCw,
  AlertCircle, Wallet, CheckCircle2, XCircle, Clock,
} from 'lucide-react'

type StatusAnsuran = 'BELUM' | 'DIBAYAR' | 'MUNGKIR'
type StatusPelan = 'AKTIF' | 'SELESAI' | 'MUNGKIR' | 'DIBATAL'

const STATUS_PELAN_BADGE: Record<StatusPelan, string> = {
  AKTIF: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  SELESAI: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  MUNGKIR: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  DIBATAL: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

const STATUS_ANSURAN_META: Record<StatusAnsuran, { label: string; badge: string; icon: any }> = {
  BELUM: { label: 'Belum Bayar', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  DIBAYAR: { label: 'Dibayar', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  MUNGKIR: { label: 'Mungkir', badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: XCircle },
}

export function Ansuran({ onBukaMurid }: { onBukaMurid: (id: string) => void }) {
  const { pengguna } = useAuth()
  const [pelan, setPelan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ralat, setRalat] = useState<string | null>(null)
  const [expand, setExpand] = useState<Record<string, boolean>>({})

  // Form dialog
  const [dialogBuka, setDialogBuka] = useState(false)
  const [cari, setCari] = useState('')
  const [senarai, setSenarai] = useState<any[]>([])
  const [muridTerpilih, setMuridTerpilih] = useState<any | null>(null)
  const [jumlah, setJumlah] = useState('')
  const [bilAnsuran, setBilAnsuran] = useState('3')
  const [sebab, setSebab] = useState('')
  const [tarikhMula, setTarikhMula] = useState(TODAY.toISOString().slice(0, 10))
  const [menyimpan, setMenyimpan] = useState(false)
  const [cariMuridLoading, setCariMuridLoading] = useState(false)

  const muat = async () => {
    setLoading(true); setRalat(null)
    try {
      const d = await apiGet('/api/ansuran')
      setPelan(d.pelan ?? [])
    } catch (e: any) {
      setRalat(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { muat() }, [])

  const muatSenarai = async () => {
    if (cari.length < 2) { setSenarai([]); return }
    setCariMuridLoading(true)
    try {
      const d = await apiGet(`/api/murid?cari=${encodeURIComponent(cari)}&pageSize=20`)
      setSenarai(d.murid)
    } catch {} finally { setCariMuridLoading(false) }
  }

  useEffect(() => {
    const t = setTimeout(muatSenarai, 250)
    return () => clearTimeout(t)
  }, [cari])

  const simpanPelan = async () => {
    if (!muridTerpilih) { toast.error('Pilih murid dahulu'); return }
    const j = parseFloat(jumlah)
    if (!j || j <= 0) { toast.error('Jumlah tidak sah'); return }
    const bil = parseInt(bilAnsuran)
    if (!bil || bil < 1) { toast.error('Bilangan ansuran tidak sah'); return }
    if (!sebab.trim()) { toast.error('Sebab perlu diisi'); return }
    if (!pengguna) { toast.error('Sesi tidak sah'); return }
    setMenyimpan(true)
    try {
      const d = await apiPost('/api/ansuran', {
        muridId: muridTerpilih.id,
        jumlahKeseluruhan: j,
        bilAnsuran: bil,
        sebab: sebab.trim(),
        diluluskanOlehId: pengguna.id,
        tarikhMula,
      })
      toast.success(`Pelan ansuran dicipta - ${bil} ansuran x ${formatRM(d.jumlahPerAnsuran)}`)
      setDialogBuka(false)
      setMuridTerpilih(null); setCari(''); setSenarai([])
      setJumlah(''); setBilAnsuran('3'); setSebab('')
      muat()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setMenyimpan(false)
    }
  }

  const kemaskiniAnsuran = async (ansuranId: string, status: StatusAnsuran) => {
    try {
      await apiPatch('/api/ansuran', {
        ansuranId,
        status,
        tarikhBayar: status === 'DIBAYAR' ? TODAY.toISOString().slice(0, 10) : null,
      })
      toast.success(`Ansuran ditanda sebagai ${STATUS_ANSURAN_META[status].label}`)
      muat()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Stats
  const pelanAktif = pelan.filter(p => p.status === 'AKTIF')
  const jumlahTertunggak = pelanAktif.reduce((s, p) => {
    return s + (p.ansuran ?? []).filter(a => a.status === 'BELUM').reduce((x, a) => x + (a.jumlah ?? 0), 0)
  }, 0)
  const bilMungkir = pelan.reduce((s, p) => s + (p.ansuran ?? []).filter(a => a.status === 'MUNGKIR').length, 0)

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
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={CalendarClock} label="Pelan Aktif" value={pelanAktif.length} color="bg-emerald-500/15 text-emerald-400" />
        <StatCard icon={Wallet} label="Baki Tertunggak" value={formatRM(jumlahTertunggak)} color="bg-amber-500/15 text-amber-400" />
        <StatCard icon={XCircle} label="Ansuran Mungkir" value={bilMungkir} color="bg-rose-500/15 text-rose-400" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Senarai Pelan Ansuran</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={muat} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Muat Semula
          </Button>
          <Dialog open={dialogBuka} onOpenChange={setDialogBuka}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Pelan Baru</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cipta Pelan Ansuran</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Cari Murid</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Nama / No. murid..." className="pl-9" />
                  </div>
                  {senarai.length > 0 && (
                    <div className="mt-1 border border-border/40 rounded-lg max-h-48 overflow-y-auto bg-popover">
                      {senarai.map((m) => (
                        <button key={m.id} onClick={() => { setMuridTerpilih(m); setCari(m.nama); setSenarai([]) }} className="w-full text-left p-2 hover:bg-muted/40 border-b border-border/20 last:border-0">
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Jumlah Keseluruhan (RM)</Label>
                    <Input type="number" step="0.01" value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder="1500.00" />
                  </div>
                  <div>
                    <Label>Bil Ansuran</Label>
                    <Select value={bilAnsuran} onValueChange={setBilAnsuran}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 6, 12].map(n => <SelectItem key={n} value={String(n)}>{n} ansuran</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Tarikh Mula Ansuran Pertama</Label>
                  <Input type="date" value={tarikhMula} onChange={(e) => setTarikhMula(e.target.value)} />
                </div>
                <div>
                  <Label>Sebab / Justifikasi</Label>
                  <Textarea value={sebab} onChange={(e) => setSebab(e.target.value)} rows={3} placeholder="cth. Ibu bapa mengalami kewangan terjejas akibat kematian penjaga utama..." />
                </div>
                {jumlah && bilAnsuran && parseFloat(jumlah) > 0 && parseInt(bilAnsuran) > 0 && (
                  <p className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                    Anggaran ansuran bulanan: <span className="font-bold text-foreground">{formatRM(parseFloat(jumlah) / parseInt(bilAnsuran))}</span>
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogBuka(false)}>Batal</Button>
                <Button onClick={simpanPelan} disabled={menyimpan}>
                  {menyimpan ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Menyimpan...</> : 'Simpan Pelan'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted/40 rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted/30 rounded w-1/2 mb-3" />
                <div className="h-6 bg-muted/30 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!ralat && !loading && pelan.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Tiada pelan ansuran dicipta lagi</p>
            <p className="text-xs mt-1">Klik &quot;Pelan Baru&quot; untuk mula</p>
          </CardContent>
        </Card>
      )}

      {!ralat && !loading && pelan.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pelan.map((p) => {
            const isExpand = !!expand[p.id]
            const ansuran = p.ansuran ?? []
            const dibayar = ansuran.filter(a => a.status === 'DIBAYAR').length
            const baki = ansuran.filter(a => a.status === 'BELUM').reduce((s, a) => s + (a.jumlah ?? 0), 0)
            const perAnsuran = p.bilAnsuran ? p.jumlahKeseluruhan / p.bilAnsuran : 0
            return (
              <Card key={p.id} className="bg-card/40">
                <Collapsible open={isExpand} onOpenChange={(v) => setExpand(s => ({ ...s, [p.id]: v }))}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full text-left">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm flex items-center gap-2">
                              {isExpand ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <button
                                className="hover:text-primary hover:underline truncate"
                                onClick={(e) => { e.stopPropagation(); onBukaMurid(p.muridId) }}
                              >
                                {p.namaMurid}
                              </button>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{p.kelas} • Diluluskan oleh {p.diluluskanOleh ?? '-'}</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] py-0 shrink-0 ${STATUS_PELAN_BADGE[p.status as StatusPelan]}`}>
                            {p.status}
                          </Badge>
                        </div>
                      </CardHeader>
                    </button>
                  </CollapsibleTrigger>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Jumlah</p>
                        <p className="text-sm font-semibold">{formatRM(p.jumlahKeseluruhan)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Per Ansuran</p>
                        <p className="text-sm font-semibold">{formatRM(perAnsuran)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Kemajuan</p>
                        <p className="text-sm font-semibold">{dibayar}/{p.bilAnsuran}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Sebab: <span className="text-foreground">{p.sebab}</span></p>
                    {baki > 0 && (
                      <p className="text-xs text-amber-400 mb-2">Baki tertunggak: {formatRM(baki)}</p>
                    )}
                    <CollapsibleContent>
                      <div className="border border-border/40 rounded-lg overflow-hidden mt-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="h-8 text-[10px]">#</TableHead>
                              <TableHead className="h-8 text-[10px]">Tarikh Akhir</TableHead>
                              <TableHead className="h-8 text-[10px] text-right">Jumlah</TableHead>
                              <TableHead className="h-8 text-[10px]">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ansuran.map((a) => {
                              const meta = STATUS_ANSURAN_META[a.status as StatusAnsuran] ?? STATUS_ANSURAN_META.BELUM
                              return (
                                <TableRow key={a.id}>
                                  <TableCell className="text-xs">{a.bil}</TableCell>
                                  <TableCell className="text-xs">{formatDate(a.tarikhAkhir)}</TableCell>
                                  <TableCell className="text-xs text-right font-mono">{formatRM(a.jumlah)}</TableCell>
                                  <TableCell>
                                    <Select
                                      value={a.status}
                                      onValueChange={(v) => kemaskiniAnsuran(a.id, v as StatusAnsuran)}
                                    >
                                      <SelectTrigger className="h-7 text-[10px] px-2 py-0 w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="BELUM">Belum Bayar</SelectItem>
                                        <SelectItem value="DIBAYAR">Dibayar</SelectItem>
                                        <SelectItem value="MUNGKIR">Mungkir</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
