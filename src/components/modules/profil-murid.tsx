'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPost, formatRM, formatDate, formatDateTime, cetakPdf } from '@/components/shared/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/components/auth-context'
import { BULAN_NAMA, BULAN_NAMA_PENUH, STATUS_SEL_STYLE, TODAY, type StatusSel } from '@/lib/tunggakan'
import { toast } from 'sonner'
import {
  ArrowLeft, User, Phone, Users2, Wallet, Banknote, Bell, ClipboardList,
  CreditCard, FileCheck2, Calendar, TrendingDown, AlertTriangle, CheckCircle2,
  Plus, Send
} from 'lucide-react'

interface ProfilData {
  murid: any
  matrix: Record<number, any[]>
  ringkasan: any
  skor: number
  bilMungkir: number
  bayaran: any[]
  peringatan: any[]
  notaSusulan: any[]
  pelanAnsuran: any[]
  pengecualian: any[]
  invois: any[]
}

export function ProfilMurid({ muridId, onKembali }: { muridId: string; onKembali: () => void }) {
  const { pengguna } = useAuth()
  const [data, setData] = useState<ProfilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [ralat, setRalat] = useState('')
  const [bayaranDialog, setBayaranDialog] = useState(false)
  const [notaDialog, setNotaDialog] = useState(false)

  // Payment form state
  const [bayarJumlah, setBayarJumlah] = useState('')
  const [bayarKaedah, setBayarKaedah] = useState('TUNAI')
  const [bayarTarikh, setBayarTarikh] = useState(TODAY.toISOString().slice(0,10))
  const [bayarNoRujukan, setBayarNoRujukan] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [menyimpan, setMenyimpan] = useState(false)

  // Note form state
  const [notaJenis, setNotaJenis] = useState('PANGGILAN')
  const [notaCatatan, setNotaCatatan] = useState('')
  const [notaJanji, setNotaJanji] = useState('')

  const muat = async () => {
    setLoading(true)
    try {
      const d = await apiGet(`/api/murid/${muridId}`)
      setData(d)
      setRalat('')
    } catch (e: any) {
      setRalat(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { muat() }, [muridId])

  // FIFO preview
  const muatPreview = async () => {
    const j = parseFloat(bayarJumlah)
    if (!j || j <= 0) { setPreview(null); return }
    try {
      const d = await apiGet(`/api/bayaran?muridId=${muridId}&previewJumlah=${j}`)
      setPreview(d.preview)
    } catch (e: any) {
      setPreview(null)
    }
  }

  useEffect(() => { muatPreview() }, [bayarJumlah])

  const simpanBayaran = async () => {
    const j = parseFloat(bayarJumlah)
    if (!j || j <= 0) { toast.error('Jumlah bayaran tidak sah'); return }
    setMenyimpan(true)
    try {
      await apiPost('/api/bayaran', {
        muridId,
        jumlah: j,
        kaedah: bayarKaedah,
        tarikhBayar: bayarTarikh,
        noRujukan: bayarNoRujukan || null,
        direkodOlehId: pengguna?.id,
      })
      toast.success(`Bayaran RM${j.toFixed(2)} berjaya direkod`)
      setBayaranDialog(false)
      setBayarJumlah(''); setBayarNoRujukan(''); setPreview(null)
      muat()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setMenyimpan(false)
    }
  }

  const simpanNota = async () => {
    if (!notaCatatan) { toast.error('Catatan diperlukan'); return }
    try {
      await apiPost('/api/nota', {
        muridId,
        jenis: notaJenis,
        catatan: notaCatatan,
        janjiBayarTarikh: notaJanji || null,
        diciptaOlehId: pengguna?.id,
      })
      toast.success('Nota susulan ditambah')
      setNotaDialog(false); setNotaCatatan(''); setNotaJanji('')
      muat()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading) return <Card className="p-6 animate-pulse h-96 bg-card/40">Memuatkan...</Card>
  if (ralat) return <Card className="p-6 border-rose-500/30"><p className="text-rose-400">Ralat: {ralat}</p></Card>
  if (!data) return null

  const m = data.murid
  const r = data.ringkasan

  return (
    <div className="space-y-4">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onKembali}>
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{m.nama}</h2>
          <p className="text-xs text-muted-foreground">{m.noMurid} &middot; {m.kelas} &middot; Guru: {m.guruKelas}</p>
        </div>
        {m.status === 'TIDAK_AKTIF' && <Badge variant="outline" className="text-rose-400 border-rose-500/30">Tidak Aktif</Badge>}
      </div>

      {/* Identity + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Maklumat Murid</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="No. Murid" value={m.noMurid} />
            <Row label="Kelas" value={m.kelas} />
            <Row label="Tahun Darjah" value={`Tahun ${m.tahunDarjah}`} />
            <Row label="Tarikh Daftar" value={formatDate(m.tarikhDaftar)} />
            <Row label="Nama Penjaga" value={m.namaPenjaga} />
            <Row label="No. Telefon" value={<a href={`tel:${m.noTelefonPenjaga}`} className="text-primary hover:underline flex items-center gap-1"><Phone className="w-3 h-3" />{m.noTelefonPenjaga}</a>} />
            <Row label="No. KP Penjaga" value={m.noKpPenjaga} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-primary/30 bg-gradient-to-br from-primary/10 to-card">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Ringkasan Kewangan</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Tunggakan 2025" value={formatRM(r.baki2025)} className="text-orange-400" />
              <Stat label="Tunggakan 2026" value={formatRM(r.baki2026)} className="text-amber-400" />
              <Stat label="Jumlah Tunggakan" value={formatRM(r.jumlahKeseluruhan)} className="text-rose-400" />
              <Stat label="Bulan Tertunggak" value={String(r.bilBulanTertunggak)} className="text-yellow-400" />
              <Stat label="Skor Risiko" value={String(data.skor)} className={
                data.skor >= 150 ? 'text-rose-400' : data.skor >= 80 ? 'text-amber-400' : 'text-emerald-400'
              } />
              <Stat label="Umur Tertinggi" value={r.umurTertinggi?.replace('_', '-').replace('LEBIH', '>')} className="text-muted-foreground" />
              <Stat label="Mungkir Ansuran" value={String(data.bilMungkir)} className="text-rose-400" />
              <Stat label="Bil Invois" value={String(data.invois.length)} className="text-muted-foreground" />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Dialog open={bayaranDialog} onOpenChange={setBayaranDialog}>
                <DialogTrigger asChild><Button size="sm"><Banknote className="w-4 h-4" /> Rekod Bayaran</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Rekod Bayaran - {m.nama}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Jumlah (RM) *</Label><Input type="number" value={bayarJumlah} onChange={(e) => setBayarJumlah(e.target.value)} placeholder="150.00" /></div>
                      <div><Label>Tarikh Bayar</Label><Input type="date" value={bayarTarikh} onChange={(e) => setBayarTarikh(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Kaedah</Label>
                        <Select value={bayarKaedah} onValueChange={setBayarKaedah}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TUNAI">Tunai</SelectItem>
                            <SelectItem value="FPX">FPX</SelectItem>
                            <SelectItem value="DUITNOW">DuitNow</SelectItem>
                            <SelectItem value="CEK">Cek</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>No. Rujukan</Label><Input value={bayarNoRujukan} onChange={(e) => setBayarNoRujukan(e.target.value)} placeholder="RX-001..." /></div>
                    </div>
                    {preview && (
                      <Card className="bg-muted/30 border-primary/30">
                        <CardContent className="p-3 text-xs">
                          <p className="font-medium mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Pratonton Peruntukan FIFO</p>
                          {preview.peruntukan.length === 0 ? (
                            <p className="text-muted-foreground">Tiada invois tertunggak - bayaran akan direkod sebagai kredit</p>
                          ) : (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {preview.peruntukan.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between">
                                  <span className="text-muted-foreground">{BULAN_NAMA[(p.bulan-1)]} {p.tahun}</span>
                                  <span className="font-mono">{formatRM(p.jumlah)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="border-t border-border/40 mt-2 pt-2 flex justify-between font-medium">
                            <span>Jumlah Diperuntukkan</span>
                            <span className="text-emerald-400">{formatRM(preview.jumlahDiperuntukkan)}</span>
                          </div>
                          {preview.lebihan > 0 && (
                            <div className="flex justify-between text-amber-400">
                              <span>Lebihan (Kredit)</span><span>{formatRM(preview.lebihan)}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBayaranDialog(false)}>Batal</Button>
                    <Button onClick={simpanBayaran} disabled={menyimpan}>{menyimpan ? 'Menyimpan...' : 'Simpan Bayaran'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={notaDialog} onOpenChange={setNotaDialog}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><ClipboardList className="w-4 h-4" /> Tambah Nota</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nota Susulan - {m.nama}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Jenis Tindakan</Label>
                      <Select value={notaJenis} onValueChange={setNotaJenis}>
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
                    <div><Label>Catatan *</Label><Textarea value={notaCatatan} onChange={(e) => setNotaCatatan(e.target.value)} rows={3} placeholder="Hasil perbualan / temu janji..." /></div>
                    <div><Label>Tarikh Janji Bayar (pilihan)</Label><Input type="date" value={notaJanji} onChange={(e) => setNotaJanji(e.target.value)} /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNotaDialog(false)}>Batal</Button>
                    <Button onClick={simpanNota}>Simpan Nota</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Matrix / Bayaran / Invois / Garis Masa */}
      <Tabs defaultValue="matrix">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="matrix">Matriks 12 Bulan</TabsTrigger>
          <TabsTrigger value="bayaran">Sejarah Bayaran ({data.bayaran.length})</TabsTrigger>
          <TabsTrigger value="invois">Invois ({data.invois.length})</TabsTrigger>
          <TabsTrigger value="nota">Garis Masa ({data.notaSusulan.length})</TabsTrigger>
          <TabsTrigger value="ansuran">Ansuran ({data.pelanAnsuran.length})</TabsTrigger>
          <TabsTrigger value="pengecualian">Pengecualian ({data.pengecualian.length})</TabsTrigger>
        </TabsList>

        {/* Matrix */}
        <TabsContent value="matrix" className="space-y-4">
          {[2026, 2025].map(tahun => (
            <Card key={tahun}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tahun {tahun}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-1.5">
                  {data.matrix[tahun].map((c: any, i: number) => {
                    const style = STATUS_SEL_STYLE[c.status as StatusSel]
                    return (
                      <div key={i} className={`rounded-lg p-2 border border-border/30 ${style.cellClass}`}>
                        <p className="text-[10px] uppercase opacity-80">{BULAN_NAMA[c.bulan-1]}</p>
                        <p className="text-sm font-mono font-bold">{c.baki > 0 ? `RM${c.baki.toFixed(0)}` : c.status === 'LUNAS' ? '✓' : '-'}</p>
                        <p className="text-[9px] opacity-70 mt-0.5">{style.label}</p>
                        {c.umur > 0 && <p className="text-[9px] mt-0.5 opacity-60">{c.umur}h</p>}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Bayaran */}
        <TabsContent value="bayaran">
          <Card>
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Tarikh</TableHead><TableHead>Kaedah</TableHead><TableHead>No. Rujukan</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead><TableHead>Peruntukan</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {data.bayaran.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell>{formatDate(b.tarikhBayar)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{b.kaedah}</Badge></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{b.noRujukan || '-'}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-emerald-400">{formatRM(b.jumlah)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {b.peruntukan.map((p: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px] py-0">
                              {BULAN_NAMA[p.bulan-1]} {p.tahun}: {formatRM(p.jumlah)}
                            </Badge>
                          ))}
                          {b.peruntukan.length === 0 && <span className="text-xs text-muted-foreground">Kredit (belum dialokasi)</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.bayaran.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Tiada rekod bayaran</TableCell></TableRow>}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Invois */}
        <TabsContent value="invois">
          <Card>
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Bulan</TableHead><TableHead>Tarikh Akhir</TableHead>
                  <TableHead className="text-right">Invois</TableHead><TableHead className="text-right">Diskaun</TableHead>
                  <TableHead className="text-right">Dibayar</TableHead><TableHead className="text-right">Baki</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {data.invois.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell>{BULAN_NAMA_PENUH[inv.bulan-1]} {inv.tahun}</TableCell>
                      <TableCell>{formatDate(inv.tarikhAkhir)}</TableCell>
                      <TableCell className="text-right font-mono">{formatRM(inv.jumlah)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{formatRM(inv.diskaun)}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-400">{formatRM(inv.dibayar)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-rose-400">{formatRM(inv.baki)}</TableCell>
                      <TableCell><Badge variant="outline" className={STATUS_SEL_STYLE[inv.status as StatusSel].badgeClass + ' text-xs'}>{STATUS_SEL_STYLE[inv.status as StatusSel].label}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Garis Masa Nota */}
        <TabsContent value="nota">
          <Card>
            <CardContent className="p-4">
              {data.notaSusulan.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Tiada nota susulan</p>
              ) : (
                <div className="space-y-3">
                  {data.notaSusulan.map((n: any) => (
                    <div key={n.id} className="flex gap-3 pb-3 border-b border-border/30 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{n.jenis.replace('_',' ')}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDateTime(n.tarikhCipta)}</span>
                          {n.janjiBayarTarikh && <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30"><Calendar className="w-3 h-3 mr-1" />Janji: {formatDate(n.janjiBayarTarikh)}</Badge>}
                        </div>
                        <p className="text-sm text-foreground">{n.catatan}</p>
                        <p className="text-xs text-muted-foreground mt-1">Oleh: {n.diciptaOleh}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ansuran */}
        <TabsContent value="ansuran">
          <Card>
            <CardContent className="p-4">
              {data.pelanAnsuran.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Tiada pelan ansuran</p>
              ) : (
                <div className="space-y-3">
                  {data.pelanAnsuran.map((p: any) => (
                    <div key={p.id} className="border border-border/40 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">Pelan {p.bilAnsuran} ansuran</span>
                          <span className="text-muted-foreground text-sm ml-2">{formatRM(p.jumlahKeseluruhan)} ({formatRM(p.jumlahKeseluruhan/p.bilAnsuran)}/ansuran)</span>
                        </div>
                        <Badge variant="outline" className={p.status === 'AKTIF' ? 'text-emerald-400' : p.status === 'MUNGKIR' ? 'text-rose-400' : ''}>{p.status}</Badge>
                      </div>
                      {p.sebab && <p className="text-xs text-muted-foreground mb-2">{p.sebab}</p>}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {p.ansuran.map((a: any) => (
                          <div key={a.id} className={`rounded p-2 text-xs border ${
                            a.status === 'DIBAYAR' ? 'bg-emerald-500/10 border-emerald-500/30' :
                            a.status === 'MUNGKIR' ? 'bg-rose-500/10 border-rose-500/30' :
                            'bg-muted/30 border-border/30'
                          }`}>
                            <p className="font-medium">#{a.bil} - {formatDate(a.tarikhAkhir)}</p>
                            <p className="font-mono">{formatRM(a.jumlah)}</p>
                            <p className="opacity-70">{a.status}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pengecualian */}
        <TabsContent value="pengecualian">
          <Card>
            <CardContent className="p-4">
              {data.pengecualian.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Tiada pengecualian / bantuan</p>
              ) : (
                <div className="space-y-2">
                  {data.pengecualian.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-3 border border-border/40 rounded-lg">
                      <div>
                        <Badge variant="outline" className="text-xs">{p.jenis.replace('_',' ')}</Badge>
                        <p className="text-sm mt-1">{p.sebab}</p>
                        <p className="text-xs text-muted-foreground">Diluluskan oleh: {p.diluluskanOleh}</p>
                      </div>
                      <span className="text-lg font-bold text-primary">{formatRM(p.jumlah)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-foreground text-sm font-medium text-right">{value}</span>
    </div>
  )
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg bg-background/40 border border-border/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${className}`}>{value}</p>
    </div>
  )
}
