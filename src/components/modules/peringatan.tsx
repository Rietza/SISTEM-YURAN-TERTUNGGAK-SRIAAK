'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPost, formatRM, formatDateTime } from '@/components/shared/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/components/auth-context'
import { toast } from 'sonner'
import {
  Bell, Search, Send, MessageSquare, Smartphone, Mail,
  RefreshCw, Inbox, AlertCircle, CheckCircle2,
} from 'lucide-react'

type Peringkat = 'MESRA' | 'TEGAS' | 'NOTIS_AKHIR'
type Saluran = 'WHATSAPP' | 'SMS' | 'EMEL'

const SALURAN_META: Record<Saluran, { label: string; icon: any; badge: string }> = {
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare, badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  SMS: { label: 'SMS', icon: Smartphone, badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  EMEL: { label: 'Emel', icon: Mail, badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
}

const PERINGKAT_META: Record<Peringkat, { label: string; badge: string }> = {
  MESRA: { label: 'Mesra', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  TEGAS: { label: 'Tegas', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  NOTIS_AKHIR: { label: 'Notis Akhir', badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
}

function binaMesej(peringkat: Peringkat, namaMurid: string, kelas: string, jumlah: number): string {
  const j = formatRM(jumlah)
  switch (peringkat) {
    case 'MESRA':
      return `Assalamualaikum w.b.t. Dimaklumkan yuran sekolah bagi murid ${namaMurid} (${kelas}) berjumlah ${j} masih belum dijelaskan. Mohon dapat membuat bayaran secepatnya. Terima kasih. - SRIAAKL`
    case 'TEGAS':
      return `Dimaklumkan bahawa tunggakan yuran bagi murid ${namaMurid} (${kelas}) berjumlah ${j} telah melebihi tempoh yang ditetapkan. Sila jelaskan dalam tempoh 7 hari dari tarikh notis ini. - SRIAAKL`
    case 'NOTIS_AKHIR':
      return `NOTIS AKHIR: Tunggakan yuran murid ${namaMurid} (${kelas}) berjumlah ${j} perlu dijelaskan dengan segera. Tindakan susulan akan diambil jika bayaran tidak diterima dalam tempoh 3 hari dari notis ini. - SRIAAKL`
  }
}

export function Peringatan({ onBukaMurid }: { onBukaMurid: (id: string) => void }) {
  const { pengguna } = useAuth()
  const [saluran, setSaluran] = useState<Saluran>('WHATSAPP')
  const [peringkat, setPeringkat] = useState<Peringkat>('MESRA')
  const [cari, setCari] = useState('')
  const [senarai, setSenarai] = useState<any[]>([])
  const [terpilih, setTerpilih] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [menghantar, setMenghantar] = useState(false)
  const [log, setLog] = useState<any[]>([])
  const [logLoading, setLogLoading] = useState(true)
  const [ralat, setRalat] = useState<string | null>(null)

  const muatLog = async () => {
    setLogLoading(true); setRalat(null)
    try {
      const d = await apiGet('/api/peringatan')
      setLog(d.peringatan ?? [])
    } catch (e: any) {
      setRalat(e.message)
    } finally {
      setLogLoading(false)
    }
  }

  useEffect(() => { muatLog() }, [])

  const muatSenarai = async () => {
    if (cari.length < 2) { setSenarai([]); setLoading(false); return }
    setLoading(true)
    try {
      const d = await apiGet(`/api/murid?cari=${encodeURIComponent(cari)}&pageSize=30`)
      setSenarai(d.murid.filter((m: any) => m.ringkasan?.jumlahKeseluruhan > 0.01))
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => {
    const t = setTimeout(muatSenarai, 250)
    return () => clearTimeout(t)
  }, [cari])

  const bilTerpilih = Object.values(terpilih).filter(Boolean).length
  const pilihSemua = () => {
    const next: Record<string, boolean> = {}
    senarai.forEach(m => { next[m.id] = bilTerpilih < senarai.length })
    setTerpilih(next)
  }

  const mesejContoh = binaMesej(
    peringkat,
    senarai.find(m => terpilih[m.id])?.nama ?? 'Ahmad Bin Ali',
    senarai.find(m => terpilih[m.id])?.kelas ?? 'Tahun 4 Biruni',
    senarai.find(m => terpilih[m.id])?.ringkasan?.jumlahKeseluruhan ?? 450.00,
  )

  const hantar = async () => {
    if (bilTerpilih === 0) { toast.error('Pilih sekurang-kurangnya satu murid'); return }
    if (!pengguna) { toast.error('Sesi tidak sah'); return }
    const muridIds = senarai.filter(m => terpilih[m.id]).map(m => m.id)
    setMenghantar(true)
    try {
      const d = await apiPost('/api/peringatan', {
        muridIds,
        saluran,
        peringkat,
        dihantarOlehId: pengguna.id,
      })
      toast.success(`${d.bilDihantar} peringatan ${SALURAN_META[saluran].label} (${PERINGKAT_META[peringkat].label}) dihantar`)
      setTerpilih({})
      setCari('')
      setSenarai([])
      muatLog()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setMenghantar(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Composer */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Hantar Peringatan Tunggakan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Saluran</Label>
                <Select value={saluran} onValueChange={(v) => setSaluran(v as Saluran)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="EMEL">Emel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Peringkat</Label>
                <Select value={peringkat} onValueChange={(v) => setPeringkat(v as Peringkat)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MESRA">Mesra</SelectItem>
                    <SelectItem value="TEGAS">Tegas</SelectItem>
                    <SelectItem value="NOTIS_AKHIR">Notis Akhir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Cari Murid (dengan tunggakan)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Nama / No. murid..." className="pl-9" />
              </div>
              {senarai.length > 0 && (
                <div className="mt-2 border border-border/40 rounded-lg bg-popover">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
                    <span className="text-xs text-muted-foreground">{senarai.length} murid ditemui</span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={pilihSemua}>
                      {bilTerpilih < senarai.length ? 'Pilih Semua' : 'Nyahpilih Semua'}
                    </Button>
                  </div>
                  <ScrollArea className="max-h-72">
                    <div className="divide-y divide-border/20">
                      {senarai.map((m) => (
                        <label key={m.id} className="flex items-start gap-3 p-2.5 hover:bg-muted/30 cursor-pointer">
                          <Checkbox
                            checked={!!terpilih[m.id]}
                            onCheckedChange={(v) => setTerpilih(s => ({ ...s, [m.id]: !!v }))}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.nama}</p>
                            <p className="text-xs text-muted-foreground">{m.noMurid} • {m.kelas}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-rose-400">{formatRM(m.ringkasan?.jumlahKeseluruhan ?? 0)}</p>
                            <p className="text-[10px] text-muted-foreground">{m.ringkasan?.bilBulanTertunggak ?? 0} bulan</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
              {cari.length >= 2 && !loading && senarai.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Tiada murid dengan tunggakan ditemui.
                </p>
              )}
            </div>

            {/* Message preview */}
            <Card className="bg-muted/20 border-border/40">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Pratonton Mesej</p>
                  <div className="flex gap-1">
                    <Badge variant="outline" className={`text-[10px] py-0 ${SALURAN_META[saluran].badge}`}>
                      {SALURAN_META[saluran].label}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] py-0 ${PERINGKAT_META[peringkat].badge}`}>
                      {PERINGKAT_META[peringkat].label}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm leading-relaxed font-mono whitespace-pre-wrap">{mesejContoh}</p>
                <p className="text-[10px] text-muted-foreground italic">* {bilTerpilih} murid dipilih - jumlah akan disesuaikan dengan tunggakan masing-masing</p>
              </CardContent>
            </Card>

            <Button onClick={hantar} disabled={bilTerpilih === 0 || menghantar} className="w-full">
              {menghantar ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Menghantar...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Hantar ke {bilTerpilih} Murid</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent log */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Inbox className="w-4 h-4 text-muted-foreground" /> Log Peringatan Terkini
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={muatLog} disabled={logLoading}>
              <RefreshCw className={`w-3.5 h-3.5 ${logLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {ralat && (
              <div className="text-center py-8 space-y-2">
                <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
                <p className="text-xs text-muted-foreground">{ralat}</p>
                <Button variant="outline" size="sm" onClick={muatLog}>Cuba Semula</Button>
              </div>
            )}
            {!ralat && logLoading && (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-2 border border-border/30 rounded-lg animate-pulse">
                    <div className="h-3 bg-muted/40 rounded w-1/2 mb-1.5" />
                    <div className="h-2.5 bg-muted/30 rounded w-3/4" />
                  </div>
                ))}
              </div>
            )}
            {!ralat && !logLoading && log.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Tiada peringatan dihantar lagi</p>
              </div>
            )}
            {!ralat && !logLoading && log.length > 0 && (
              <ScrollArea className="max-h-[640px]">
                <div className="space-y-2">
                  {log.map((p) => {
                    const SalIc = SALURAN_META[p.saluran as Saluran]?.icon ?? Bell
                    return (
                      <div
                        key={p.id}
                        className="p-2.5 border border-border/30 rounded-lg hover:bg-muted/30 cursor-pointer"
                        onClick={() => onBukaMurid(p.muridId)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <SalIc className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <p className="text-sm font-medium truncate">{p.namaMurid}</p>
                          </div>
                          {p.status === 'BERJAYA' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-1.5">{p.mesej}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            <Badge variant="outline" className={`text-[10px] py-0 ${SALURAN_META[p.saluran as Saluran]?.badge}`}>
                              {SALURAN_META[p.saluran as Saluran]?.label}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] py-0 ${PERINGKAT_META[p.peringkat as Peringkat]?.badge}`}>
                              {PERINGKAT_META[p.peringkat as Peringkat]?.label}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{formatDateTime(p.tarikhHantar)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
