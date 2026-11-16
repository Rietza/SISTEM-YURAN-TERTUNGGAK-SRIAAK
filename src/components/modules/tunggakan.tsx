'use client'

import { useEffect, useState, useMemo } from 'react'
import { apiGet, formatRM, jsonKeCsv, muatTurunCsv, cetakPdf } from '@/components/shared/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BULAN_NAMA, STATUS_SEL_STYLE, type StatusSel } from '@/lib/tunggakan'
import {
  Search, Download, FileText, Filter, Users, ArrowUpRight, CheckCircle2,
  AlertTriangle, Clock, CircleDashed, X
} from 'lucide-react'

interface MuridRow {
  id: string
  noMurid: string
  nama: string
  kelas: string
  tahunDarjah: number
  namaPenjaga: string
  noTelefonPenjaga: string
  status: string
  matrix: Record<number, { bulan: number; status: StatusSel; baki: number; jumlah: number; dibayar: number; invoisId?: string }[]>
  ringkasan: {
    baki2025: number; baki2026: number
    tunggakanSebelum: number; tunggakanSemasa: number
    jumlahKeseluruhan: number; bilBulanTertunggak: number
  }
  skor: number
  bilMungkir: number
}

const STATUS_ICON: Record<StatusSel, any> = {
  LUNAS: CheckCircle2,
  SEPARA: CircleDashed,
  TERTUNGGAK: AlertTriangle,
  BELUM_JATUH_TEMPO: Clock,
  TIADA_INVOIS: X,
}

export function Tunggakan({ onBukaMurid }: { onBukaMurid: (id: string) => void }) {
  const [data, setData] = useState<{ murid: MuridRow[]; total: number; kelasList: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [ralat, setRalat] = useState('')
  const [tahun, setTahun] = useState<'2026' | '2025' | 'bandingan'>('2026')
  const [cari, setCari] = useState('')
  const [kelasFilter, setKelasFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [umurFilter, setUmurFilter] = useState('all')
  const [statusSelFilter, setStatusSelFilter] = useState('all')
  const [minJumlah, setMinJumlah] = useState('')

  const muat = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        tahun,
        cari,
        kelas: kelasFilter === 'all' ? '' : kelasFilter,
        status: statusFilter === 'all' ? '' : statusFilter,
        umur: umurFilter === 'all' ? '' : umurFilter,
        statusSel: statusSelFilter === 'all' ? '' : statusSelFilter,
        minJumlah: minJumlah || '0',
        pageSize: '500',
      })
      const d = await apiGet(`/api/murid?${params}`)
      setData(d)
      setRalat('')
    } catch (e: any) {
      setRalat(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { muat() }, [tahun, kelasFilter, statusFilter, umurFilter, statusSelFilter, minJumlah])

  const tahunDipaparkan = tahun === 'bandingan' ? [2025, 2026] : [parseInt(tahun)]

  const eksportCsv = () => {
    if (!data) return
    const rows = data.murid.map(m => {
      const r: any = {
        noMurid: m.noMurid,
        nama: m.nama,
        kelas: m.kelas,
        status: m.status,
        tunggakan2025: m.ringkasan.baki2025,
        tunggakan2026: m.ringkasan.baki2026,
        jumlahTunggakan: m.ringkasan.jumlahKeseluruhan,
        bilBulanTertunggak: m.ringkasan.bilBulanTertunggak,
        skor: m.skor,
      }
      for (const t of tahunDipaparkan) {
        for (let b = 1; b <= 12; b++) {
          const cell = m.matrix[t]?.[b-1]
          if (cell) r[`${t}_${BULAN_NAMA[b-1]}`] = cell.baki
        }
      }
      return r
    })
    muatTurunCsv(jsonKeCsv(rows), `tunggakan_${tahun}_${new Date().toISOString().slice(0,10)}.csv`)
  }

  const eksportPdf = () => {
    if (!data) return
    const tahunLabel = tahun === 'bandingan' ? 'Bandingan 2025 vs 2026' : `Tahun ${tahun}`
    const html = `
      <h2>${tahunLabel} - ${data.murid.length} murid</h2>
      <table>
        <thead><tr>
          <th>No. Murid</th><th>Nama</th><th>Kelas</th>
          ${tahunDipaparkan.flatMap(t => BULAN_NAMA.map(b => `<th>${b}<br/>${t}</th>`)).join('')}
          <th>Tunggakan 2025</th><th>Tunggakan 2026</th><th>Jumlah</th>
        </tr></thead>
        <tbody>
          ${data.murid.slice(0, 100).map(m => `
            <tr>
              <td>${m.noMurid}</td><td>${m.nama}</td><td>${m.kelas}</td>
              ${tahunDipaparkan.flatMap(t => (m.matrix[t] || []).map(c => `<td style="text-align:right">${c.baki > 0 ? c.baki.toFixed(0) : '-'}</td>`)).join('')}
              <td style="text-align:right">${m.ringkasan.baki2025.toFixed(0)}</td>
              <td style="text-align:right">${m.ringkasan.baki2026.toFixed(0)}</td>
              <td style="text-align:right;font-weight:bold">${m.ringkasan.jumlahKeseluruhan.toFixed(0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    cetakPdf(`Jadual Tunggakan ${tahunLabel}`, html)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-end">
            <div className="flex-1 w-full">
              <Label className="text-xs">Cari Murid</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && muat()}
                  placeholder="Nama / No. murid / Penjaga / Telefon..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:flex gap-2 w-full lg:w-auto">
              <div>
                <Label className="text-xs">Kelas</Label>
                <Select value={kelasFilter} onValueChange={setKelasFilter}>
                  <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {data?.kelasList?.map(k => (
                      <SelectItem key={k.id} value={k.id}>{k.namaKelas}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="AKTIF">Aktif</SelectItem>
                    <SelectItem value="TIDAK_AKTIF">Tidak Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Umur Tunggakan</Label>
                <Select value={umurFilter} onValueChange={setUmurFilter}>
                  <SelectTrigger className="w-full md:w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="0_30">0-30 hari</SelectItem>
                    <SelectItem value="31_60">31-60 hari</SelectItem>
                    <SelectItem value="61_90">61-90 hari</SelectItem>
                    <SelectItem value="LEBIH_90">Lebih 90 hari</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Status Sel</Label>
                <Select value={statusSelFilter} onValueChange={setStatusSelFilter}>
                  <SelectTrigger className="w-full md:w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="LUNAS">Lunas</SelectItem>
                    <SelectItem value="SEPARA">Separa</SelectItem>
                    <SelectItem value="TERTUNGGAK">Tertunggak</SelectItem>
                    <SelectItem value="BELUM_JATUH_TEMPO">Belum Jatuh Tempo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Min. Jumlah (RM)</Label>
                <Input
                  type="number"
                  value={minJumlah}
                  onChange={(e) => setMinJumlah(e.target.value)}
                  placeholder="0"
                  className="w-full md:w-28"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={muat} variant="default" size="sm">
                <Filter className="w-4 h-4" /> Tapis
              </Button>
              <Button onClick={eksportCsv} variant="outline" size="sm">
                <Download className="w-4 h-4" /> CSV
              </Button>
              <Button onClick={eksportPdf} variant="outline" size="sm">
                <FileText className="w-4 h-4" /> PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Year tabs */}
      <Tabs value={tahun} onValueChange={(v) => setTahun(v as any)}>
        <TabsList>
          <TabsTrigger value="2026">2026 (Semasa)</TabsTrigger>
          <TabsTrigger value="2025">2025 (Sebelum)</TabsTrigger>
          <TabsTrigger value="bandingan">Bandingan</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card/40 border-border/40"><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Jumlah Murid</p>
            <p className="text-xl font-bold">{data.total}</p>
          </CardContent></Card>
          <Card className="bg-card/40 border-border/40"><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Menunggak</p>
            <p className="text-xl font-bold text-amber-400">{data.murid.filter(m => m.ringkasan.jumlahKeseluruhan > 0.01).length}</p>
          </CardContent></Card>
          <Card className="bg-card/40 border-border/40"><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Jumlah Tunggakan</p>
            <p className="text-xl font-bold text-rose-400">{formatRM(data.murid.reduce((s,m) => s + m.ringkasan.jumlahKeseluruhan, 0))}</p>
          </CardContent></Card>
          <Card className="bg-card/40 border-border/40"><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Tunggakan Lapok (2025)</p>
            <p className="text-xl font-bold text-orange-400">{formatRM(data.murid.reduce((s,m) => s + m.ringkasan.baki2025, 0))}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Matrix table */}
      {ralat ? (
        <Card className="p-6 border-rose-500/30 bg-rose-500/5">
          <p className="text-rose-400">Ralat: {ralat}</p>
        </Card>
      ) : loading ? (
        <Card className="p-6 animate-pulse h-96 bg-card/40">Memuatkan...</Card>
      ) : data && data.murid.length > 0 ? (
        <Card className="border-border/60 overflow-hidden">
          <ScrollArea className="w-full overflow-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="sticky left-0 bg-card z-10 min-w-40">Nama Murid</TableHead>
                  <TableHead className="min-w-24">Kelas</TableHead>
                  {tahunDipaparkan.flatMap(t =>
                    BULAN_NAMA.map(b => (
                      <TableHead key={`${t}-${b}`} className="text-center min-w-20 px-1">
                        <div className="font-medium">{b}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">{t}</div>
                      </TableHead>
                    ))
                  )}
                  <TableHead className="text-right min-w-24">Dibawa 2025</TableHead>
                  <TableHead className="text-right min-w-24">Tunggakan 2026</TableHead>
                  <TableHead className="text-right min-w-28">Jumlah</TableHead>
                  <TableHead className="text-center min-w-20">Skor</TableHead>
                  <TableHead className="text-right min-w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.murid.map(m => (
                  <TableRow key={m.id} className="border-border/30 hover:bg-muted/30 cursor-pointer" onClick={() => onBukaMurid(m.id)}>
                    <TableCell className="sticky left-0 bg-card z-10">
                      <div className="font-medium text-foreground">{m.nama}</div>
                      <div className="text-[10px] text-muted-foreground">{m.noMurid} {m.status === 'TIDAK_AKTIF' && <Badge variant="outline" className="ml-1 text-[9px] py-0 px-1">Tidak Aktif</Badge>}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{m.kelas}</Badge></TableCell>
                    {tahunDipaparkan.flatMap(t =>
                      (m.matrix[t] || []).map((c, i) => {
                        const style = STATUS_SEL_STYLE[c.status]
                        const Icon = STATUS_ICON[c.status]
                        return (
                          <TableCell key={`${t}-${i}`} className="text-center p-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`rounded px-1.5 py-1.5 ${style.cellClass} cursor-pointer hover:ring-1 hover:ring-ring/40 transition`}>
                                    <div className="flex items-center justify-center gap-0.5">
                                      <Icon className="w-3 h-3" />
                                      {c.baki > 0 && <span className="font-mono text-[10px] font-medium">{c.baki.toFixed(0)}</span>}
                                      {c.status === 'LUNAS' && <span className="text-[9px]">✓</span>}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <div><strong>{BULAN_NAMA[c.bulan-1]} {t}</strong></div>
                                  <div>Status: {style.label}</div>
                                  <div>Invois: {formatRM(c.jumlah)}</div>
                                  <div>Dibayar: {formatRM(c.dibayar)}</div>
                                  <div>Baki: {formatRM(c.baki)}</div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        )
                      })
                    )}
                    <TableCell className="text-right font-mono text-orange-400">{m.ringkasan.baki2025 > 0 ? m.ringkasan.baki2025.toFixed(0) : '-'}</TableCell>
                    <TableCell className="text-right font-mono text-amber-400">{m.ringkasan.baki2026 > 0 ? m.ringkasan.baki2026.toFixed(0) : '-'}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-rose-400">{m.ringkasan.jumlahKeseluruhan > 0 ? formatRM(m.ringkasan.jumlahKeseluruhan) : '-'}</TableCell>
                    <TableCell className="text-center">
                      {m.skor > 0 && (
                        <Badge variant="outline" className={
                          m.skor >= 150 ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                          m.skor >= 80 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                          m.skor >= 30 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                          'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }>{m.skor}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onBukaMurid(m.id) }}>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Tiada murid dijumpai dengan penapis semasa</p>
        </Card>
      )}

      {/* Legend */}
      <Card className="bg-card/30 border-border/40">
        <CardContent className="p-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground font-medium">Petunjuk:</span>
          {(['LUNAS','SEPARA','TERTUNGGAK','BELUM_JATUH_TEMPO','TIADA_INVOIS'] as StatusSel[]).map(s => {
            const style = STATUS_SEL_STYLE[s]
            const Icon = STATUS_ICON[s]
            return (
              <div key={s} className={`flex items-center gap-1.5 px-2 py-1 rounded ${style.cellClass}`}>
                <Icon className="w-3 h-3" />
                <span>{style.label}</span>
              </div>
            )
          })}
          <span className="ml-auto text-muted-foreground/70">Klik sel bulan untuk butiran invois &middot; Klik baris untuk profil penuh</span>
        </CardContent>
      </Card>
    </div>
  )
}
