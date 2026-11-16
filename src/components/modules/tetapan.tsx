'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPut, formatRM } from '@/components/shared/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PERANAN_LABEL } from '@/components/auth-context'
import { toast } from 'sonner'
import {
  Settings, DollarSign, Calculator, School, Users, Save, RefreshCw,
  AlertCircle, Plus, Trash2,
} from 'lucide-react'

interface YuranEntry {
  id?: string
  tahun: number
  tahunDarjah: number
  jenisYuran: string
  jumlahBulanan: number
  hariAkhirBayar: number
}

const JENIS_YURAN_OPTIONS = ['YURAN_PENDIDIKAN', 'YURAN_PEPERIKSAAN', 'YURAN_MAKANAN', 'YURAN_PENGANGKUTAN', 'YURAN_TAHUNAN', 'YURAN_AKADEMIK']

const PEMBERAT_KEYS: { key: string; label: string; penerangan: string }[] = [
  { key: 'PEMBERAT_BULAN_TUNGGAKAN', label: 'Pemberat Bilangan Bulan Tunggakan', penerangan: 'Mata per bulan tertunggak (default: 10)' },
  { key: 'PEMBERAT_JUMLAH_PER_RM100', label: 'Pemberat Jumlah per RM100', penerangan: 'Mata per RM100 jumlah tunggakan (default: 2)' },
  { key: 'PEMBERAT_UMUR_0_30', label: 'Pemberat Umur 0-30 hari', penerangan: 'Mata untuk kategori umur 0-30 hari (default: 0)' },
  { key: 'PEMBERAT_UMUR_31_60', label: 'Pemberat Umur 31-60 hari', penerangan: 'Mata untuk kategori umur 31-60 hari (default: 10)' },
  { key: 'PEMBERAT_UMUR_61_90', label: 'Pemberat Umur 61-90 hari', penerangan: 'Mata untuk kategori umur 61-90 hari (default: 20)' },
  { key: 'PEMBERAT_UMUR_LEBIH_90', label: 'Pemberat Umur Lebih 90 hari', penerangan: 'Mata untuk kategori umur lebih 90 hari (default: 30)' },
  { key: 'PEMBERAT_MUNGKIR', label: 'Pemberat Mungkir Janji', penerangan: 'Mata per janji bayar mungkir (default: 15)' },
]

export function Tetapan() {
  const [tetapan, setTetapan] = useState<Record<string, any>>({})
  const [yuran, setYuran] = useState<YuranEntry[]>([])
  const [pengguna, setPengguna] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [menyimpanYuran, setMenyimpanYuran] = useState(false)
  const [menyimpanPemberat, setMenyimpanPemberat] = useState(false)
  const [menyimpanSekolah, setMenyimpanSekolah] = useState(false)
  const [ralat, setRalat] = useState<string | null>(null)

  const muat = async () => {
    setLoading(true); setRalat(null)
    try {
      const d = await apiGet('/api/tetapan')
      setTetapan(d.tetapan ?? {})
      setYuran(d.yuran ?? [])
      setPengguna(d.pengguna ?? [])
    } catch (e: any) {
      setRalat(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { muat() }, [])

  const simpanYuran = async () => {
    setMenyimpanYuran(true)
    try {
      await apiPut('/api/tetapan', { yuran: yuran.map(y => ({
        id: y.id,
        tahun: Number(y.tahun),
        tahunDarjah: Number(y.tahunDarjah),
        jenisYuran: y.jenisYuran,
        jumlahBulanan: Number(y.jumlahBulanan),
        hariAkhirBayar: Number(y.hariAkhirBayar),
      })) })
      toast.success('Struktur yuran berjaya disimpan')
      muat()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setMenyimpanYuran(false)
    }
  }

  const simpanPemberat = async () => {
    setMenyimpanPemberat(true)
    try {
      await apiPut('/api/tetapan', { tetapan: Object.fromEntries(
        PEMBERAT_KEYS.map(k => [k.key, Number(tetapan[k.key] ?? 0)])
      ) })
      toast.success('Pemberat skor risiko berjaya disimpan')
      muat()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setMenyimpanPemberat(false)
    }
  }

  const simpanSekolah = async () => {
    setMenyimpanSekolah(true)
    try {
      await apiPut('/api/tetapan', { tetapan: {
        NAMA_SEKOLAH: tetapan.NAMA_SEKOLAH,
        KOD_SEKOLAH: tetapan.KOD_SEKOLAH,
        HARI_AKHIR_BAYAR: Number(tetapan.HARI_AKHIR_BAYAR),
      } })
      toast.success('Maklumat sekolah berjaya disimpan')
      muat()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setMenyimpanSekolah(false)
    }
  }

  const kemaskiniYuran = (i: number, field: keyof YuranEntry, value: any) => {
    setYuran(prev => prev.map((y, idx) => idx === i ? { ...y, [field]: value } : y))
  }

  const tambahYuran = () => {
    setYuran(prev => [...prev, {
      tahun: 2026,
      tahunDarjah: 1,
      jenisYuran: 'YURAN_PENDIDIKAN',
      jumlahBulanan: 0,
      hariAkhirBayar: 15,
    }])
  }

  const padamYuran = (i: number) => {
    setYuran(prev => prev.filter((_, idx) => idx !== i))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (ralat) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-sm text-muted-foreground">{ralat}</p>
          <Button variant="outline" size="sm" onClick={muat}>Cuba Semula</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="yuran">
      <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
        <TabsTrigger value="yuran" className="text-xs"><DollarSign className="w-3.5 h-3.5 mr-1" /> Struktur Yuran</TabsTrigger>
        <TabsTrigger value="pemberat" className="text-xs"><Calculator className="w-3.5 h-3.5 mr-1" /> Pemberat Skor</TabsTrigger>
        <TabsTrigger value="sekolah" className="text-xs"><School className="w-3.5 h-3.5 mr-1" /> Maklumat Sekolah</TabsTrigger>
        <TabsTrigger value="pengguna" className="text-xs"><Users className="w-3.5 h-3.5 mr-1" /> Pengguna</TabsTrigger>
      </TabsList>

      {/* Struktur Yuran */}
      <TabsContent value="yuran" className="space-y-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Struktur Yuran Bulanan</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={muat}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Muat Semula</Button>
              <Button variant="outline" size="sm" onClick={tambahYuran}><Plus className="w-3.5 h-3.5 mr-1" /> Tambah</Button>
              <Button size="sm" onClick={simpanYuran} disabled={menyimpanYuran}>
                {menyimpanYuran ? <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Menyimpan...</> : <><Save className="w-3.5 h-3.5 mr-1" /> Simpan</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[480px]">
              <div className="border border-border/40 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Tahun</TableHead>
                      <TableHead className="text-xs">Tahun Darjah</TableHead>
                      <TableHead className="text-xs">Jenis Yuran</TableHead>
                      <TableHead className="text-xs text-right">Jumlah Bulanan (RM)</TableHead>
                      <TableHead className="text-xs text-center">Hari Akhir Bayar</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yuran.map((y, i) => (
                      <TableRow key={y.id ?? `new-${i}`}>
                        <TableCell>
                          <Select value={String(y.tahun)} onValueChange={(v) => kemaskiniYuran(i, 'tahun', Number(v))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2025">2025</SelectItem>
                              <SelectItem value="2026">2026</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={String(y.tahunDarjah)} onValueChange={(v) => kemaskiniYuran(i, 'tahunDarjah', Number(v))}>
                            <SelectTrigger className="h-8 text-xs w-16"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>T{n}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={y.jenisYuran} onValueChange={(v) => kemaskiniYuran(i, 'jenisYuran', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {JENIS_YURAN_OPTIONS.map(j => <SelectItem key={j} value={j}>{j.replace('YURAN_', '').replace('_', ' ')}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number" step="0.01" value={y.jumlahBulanan}
                            onChange={(e) => kemaskiniYuran(i, 'jumlahBulanan', Number(e.target.value))}
                            className="h-8 text-xs text-right font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number" min="1" max="28" value={y.hariAkhirBayar}
                            onChange={(e) => kemaskiniYuran(i, 'hariAkhirBayar', Number(e.target.value))}
                            className="h-8 text-xs w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:text-rose-500" onClick={() => padamYuran(i)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {yuran.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-6">
                          Tiada entri yuran. Klik &quot;Tambah&quot; untuk mula.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Pemberat Skor */}
      <TabsContent value="pemberat" className="space-y-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Pemberat Skor Risiko</CardTitle>
            <Button size="sm" onClick={simpanPemberat} disabled={menyimpanPemberat}>
              {menyimpanPemberat ? <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Menyimpan...</> : <><Save className="w-3.5 h-3.5 mr-1" /> Simpan</>}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/20 border border-border/40 rounded-lg p-3 text-xs">
              <p className="font-medium mb-1">Formula Skor Risiko:</p>
              <p className="font-mono text-muted-foreground">
                Skor = (Bil bulan tertunggak x PEMBERAT_BULAN_TUNGGAKAN)
                + (Jumlah tunggakan / 100 x PEMBERAT_JUMLAH_PER_RM100)
                + (Mata umur)
                + (Bil mungkir x PEMBERAT_MUNGKIR)
              </p>
              <p className="mt-2 text-muted-foreground">Kategori: RENDAH (&lt;30) | SEDERHANA (&lt;80) | TINGGI (&lt;150) | KRITIKAL (&ge;150)</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PEMBERAT_KEYS.map((p) => (
                <div key={p.key} className="space-y-1">
                  <Label className="text-xs">{p.label}</Label>
                  <Input
                    type="number" step="1"
                    value={tetapan[p.key] ?? 0}
                    onChange={(e) => setTetapan(prev => ({ ...prev, [p.key]: Number(e.target.value) }))}
                    className="h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">{p.penerangan}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Maklumat Sekolah */}
      <TabsContent value="sekolah" className="space-y-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Maklumat Sekolah</CardTitle>
            <Button size="sm" onClick={simpanSekolah} disabled={menyimpanSekolah}>
              {menyimpanSekolah ? <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Menyimpan...</> : <><Save className="w-3.5 h-3.5 mr-1" /> Simpan</>}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 max-w-lg">
            <div>
              <Label>Nama Sekolah</Label>
              <Input
                value={tetapan.NAMA_SEKOLAH ?? ''}
                onChange={(e) => setTetapan(prev => ({ ...prev, NAMA_SEKOLAH: e.target.value }))}
                placeholder="Sekolah Rendah Islam Al-Amin Keramat"
              />
            </div>
            <div>
              <Label>Kod Sekolah</Label>
              <Input
                value={tetapan.KOD_SEKOLAH ?? ''}
                onChange={(e) => setTetapan(prev => ({ ...prev, KOD_SEKOLAH: e.target.value }))}
                placeholder="SBA1107"
              />
            </div>
            <div>
              <Label>Hari Akhir Bayar (setiap bulan)</Label>
              <Input
                type="number" min="1" max="28"
                value={tetapan.HARI_AKHIR_BAYAR ?? 15}
                onChange={(e) => setTetapan(prev => ({ ...prev, HARI_AKHIR_BAYAR: Number(e.target.value) }))}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Tarikh akhir pembayaran yuran setiap bulan (1-28)</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Pengguna */}
      <TabsContent value="pengguna" className="space-y-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Senarai Pengguna Sistem</CardTitle>
            <Button variant="ghost" size="sm" onClick={muat}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Muat Semula</Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[480px]">
              <div className="border border-border/40 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nama</TableHead>
                      <TableHead className="text-xs">Emel</TableHead>
                      <TableHead className="text-xs">Peranan</TableHead>
                      <TableHead className="text-xs text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pengguna.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm font-medium">{p.nama}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.emel}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] py-0 bg-primary/10 text-primary border-primary/30">
                            {PERANAN_LABEL[p.peranan as keyof typeof PERANAN_LABEL] ?? p.peranan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Switch checked={!!p.aktif} disabled />
                            <span className={`text-[10px] ${p.aktif ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                              {p.aktif ? 'Aktif' : 'Tidak Aktif'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pengguna.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground text-xs py-6">Tiada pengguna berdaftar</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              * Pengurusan pengguna (tambah / nyahaktif) perlu dilakukan oleh Pentadbir Sistem melalui pangkalan data.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
