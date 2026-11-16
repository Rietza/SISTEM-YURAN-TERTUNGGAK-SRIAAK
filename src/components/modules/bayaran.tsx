'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPost, formatRM, formatDate } from '@/components/shared/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/components/auth-context'
import { BULAN_NAMA, TODAY } from '@/lib/tunggakan'
import { toast } from 'sonner'
import { Banknote, Search, CheckCircle2, TrendingUp, Clock } from 'lucide-react'

export function Bayaran({ onBukaMurid }: { onBukaMurid: (id: string) => void }) {
  const { pengguna } = useAuth()
  const [cari, setCari] = useState('')
  const [senarai, setSenarai] = useState<any[]>([])
  const [muridTerpilih, setMuridTerpilih] = useState<any | null>(null)
  const [invoisMurid, setInvoisMurid] = useState<any[]>([])
  const [preview, setPreview] = useState<any>(null)
  const [jumlah, setJumlah] = useState('')
  const [kaedah, setKaedah] = useState('TUNAI')
  const [tarikh, setTarikh] = useState(TODAY.toISOString().slice(0,10))
  const [noRujukan, setNoRujukan] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const [recent, setRecent] = useState<any[]>([])

  const muatSenarai = async () => {
    if (cari.length < 2) { setSenarai([]); return }
    try {
      const d = await apiGet(`/api/murid?cari=${encodeURIComponent(cari)}&pageSize=20`)
      setSenarai(d.murid.filter((m: any) => m.ringkasan.jumlahKeseluruhan > 0.01))
    } catch {}
  }

  useEffect(() => { const t = setTimeout(muatSenarai, 250); return () => clearTimeout(t) }, [cari])

  const pilihMurid = async (m: any) => {
    setMuridTerpilih(m)
    setCari(m.nama)
    setSenarai([])
    try {
      const d = await apiGet(`/api/bayaran?muridId=${m.id}`)
      setInvoisMurid(d.invois)
    } catch {}
  }

  const muatPreview = async () => {
    if (!muridTerpilih) return
    const j = parseFloat(jumlah)
    if (!j || j <= 0) { setPreview(null); return }
    try {
      const d = await apiGet(`/api/bayaran?muridId=${muridTerpilih.id}&previewJumlah=${j}`)
      setPreview(d.preview)
    } catch {}
  }

  useEffect(() => { muatPreview() }, [jumlah, muridTerpilih])

  const simpan = async () => {
    if (!muridTerpilih) { toast.error('Pilih murid dahulu'); return }
    const j = parseFloat(jumlah)
    if (!j || j <= 0) { toast.error('Jumlah tidak sah'); return }
    setMenyimpan(true)
    try {
      await apiPost('/api/bayaran', {
        muridId: muridTerpilih.id,
        jumlah: j,
        kaedah,
        tarikhBayar: tarikh,
        noRujukan: noRujukan || null,
        direkodOlehId: pengguna?.id,
      })
      toast.success(`Bayaran RM${j.toFixed(2)} berjaya direkod untuk ${muridTerpilih.nama}`)
      setJumlah(''); setNoRujukan(''); setPreview(null)
      // Refresh recent
      const recent = await apiGet('/api/bayaran')
      setRecent(recent.bayaran.slice(0, 10))
      // Refresh invoice list
      const d = await apiGet(`/api/bayaran?muridId=${muridTerpilih.id}`)
      setInvoisMurid(d.invois)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setMenyimpan(false)
    }
  }

  useEffect(() => {
    apiGet('/api/bayaran').then(d => setRecent(d.bayaran.slice(0, 10))).catch(() => {})
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Form */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Banknote className="w-4 h-4 text-primary" /> Rekod Bayaran Baru</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Search student */}
            <div>
              <Label>Cari Murid (dengan tunggakan)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Nama / No. murid..." className="pl-9" />
              </div>
              {senarai.length > 0 && (
                <div className="mt-1 border border-border/40 rounded-lg max-h-60 overflow-y-auto bg-popover">
                  {senarai.map((m) => (
                    <button key={m.id} onClick={() => pilihMurid(m)} className="w-full text-left p-2 hover:bg-muted/40 border-b border-border/20 last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{m.nama}</p>
                          <p className="text-xs text-muted-foreground">{m.noMurid} • {m.kelas}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-rose-400">{formatRM(m.ringkasan.jumlahKeseluruhan)}</p>
                          <p className="text-[10px] text-muted-foreground">{m.ringkasan.bilBulanTertunggak} bulan</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {muridTerpilih && (
              <Card className="bg-primary/5 border-primary/30">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{muridTerpilih.nama}</p>
                      <p className="text-xs text-muted-foreground">{muridTerpilih.noMurid} • {muridTerpilih.kelas}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Tunggakan Semasa</p>
                      <p className="text-lg font-bold text-rose-400">{formatRM(muridTerpilih.ringkasan.jumlahKeseluruhan)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Jumlah (RM) *</Label><Input type="number" step="0.01" value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder="150.00" /></div>
              <div><Label>Tarikh Bayar</Label><Input type="date" value={tarikh} onChange={(e) => setTarikh(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kaedah Bayaran</Label>
                <Select value={kaedah} onValueChange={setKaedah}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TUNAI">Tunai</SelectItem>
                    <SelectItem value="FPX">FPX</SelectItem>
                    <SelectItem value="DUITNOW">DuitNow</SelectItem>
                    <SelectItem value="CEK">Cek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>No. Rujukan</Label><Input value={noRujukan} onChange={(e) => setNoRujukan(e.target.value)} placeholder="RX-..." /></div>
            </div>

            {/* FIFO Preview */}
            {preview && (
              <Card className="bg-muted/30 border-emerald-500/30">
                <CardContent className="p-3">
                  <p className="font-medium text-sm mb-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Pratonton Peruntukan FIFO</p>
                  {preview.peruntukan.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Tiada invois tertunggak - bayaran akan direkod sebagai kredit</p>
                  ) : (
                    <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                      {preview.peruntukan.map((p: any, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-muted-foreground">→ {BULAN_NAMA[p.bulan-1]} {p.tahun}</span>
                          <span className="font-mono">{formatRM(p.jumlah)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-border/40 mt-2 pt-2 flex justify-between text-sm font-medium">
                    <span>Jumlah Diperuntukkan</span><span className="text-emerald-400">{formatRM(preview.jumlahDiperuntukkan)}</span>
                  </div>
                  {preview.lebihan > 0 && (
                    <div className="flex justify-between text-xs text-amber-400 mt-1">
                      <span>Lebihan (Kredit untuk invois berikut)</span><span>{formatRM(preview.lebihan)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Button onClick={simpan} disabled={!muridTerpilih || menyimpan} className="w-full">
              {menyimpan ? 'Menyimpan...' : 'Simpan Bayaran'}
            </Button>
          </CardContent>
        </Card>

        {/* Outstanding invoices */}
        {muridTerpilih && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Invois Tertunggak - {muridTerpilih.nama}</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="max-h-72">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Bulan</TableHead><TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Dibayar</TableHead><TableHead className="text-right">Baki</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {invoisMurid.filter((i: any) => i.baki > 0.01).map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell>{BULAN_NAMA[i.bulan-1]} {i.tahun}</TableCell>
                        <TableCell className="text-right font-mono">{formatRM(i.jumlah)}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-400">{formatRM(i.dibayar)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-rose-400">{formatRM(i.baki)}</TableCell>
                      </TableRow>
                    ))}
                    {invoisMurid.filter((i: any) => i.baki > 0.01).length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-emerald-400 py-4">Semua invois telah lunas!</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent payments */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /> Bayaran Terkini</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[700px]">
            <div className="space-y-2">
              {recent.map((b) => (
                <div key={b.id} className="p-2 border border-border/30 rounded-lg cursor-pointer hover:bg-muted/30" onClick={() => onBukaMurid(b.muridId)}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.namaMurid}</p>
                      <p className="text-xs text-muted-foreground">{b.kelas} • {formatDate(b.tarikhBayar)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">{formatRM(b.jumlah)}</p>
                      <Badge variant="outline" className="text-[10px] py-0">{b.kaedah}</Badge>
                    </div>
                  </div>
                </div>
              ))}
              {recent.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Tiada bayaran terkini</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
