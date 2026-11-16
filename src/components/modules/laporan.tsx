'use client'

import { useEffect, useState } from 'react'
import { apiGet, formatRM, muatTurunCsv, cetakPdf, jsonKeCsv } from '@/components/shared/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  FileBarChart, Download, Printer, FileSpreadsheet, RefreshCw,
  AlertCircle, BarChart3, FileText,
} from 'lucide-react'

type JenisLaporan = 'tunggakan' | 'kutipan' | 'ageing' | 'kelas'

const JENIS_LABEL: Record<JenisLaporan, string> = {
  tunggakan: 'Laporan Tunggakan',
  kutipan: 'Laporan Kutipan',
  ageing: 'Laporan Umur Tunggakan (Ageing)',
  kelas: 'Laporan Mengikut Kelas',
}

export function Laporan() {
  const [jenis, setJenis] = useState<JenisLaporan>('tunggakan')
  const [tahun, setTahun] = useState<string>('2026')
  const [kelas, setKelas] = useState<string>('SEMUA')
  const [senaraiKelas, setSenaraiKelas] = useState<any[]>([])
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [mengeksport, setMengeksport] = useState(false)
  const [ralat, setRalat] = useState<string | null>(null)

  useEffect(() => {
    apiGet('/api/kelas').then(d => setSenaraiKelas(d.kelas ?? [])).catch(() => {})
  }, [])

  const muat = async () => {
    setLoading(true); setRalat(null)
    try {
      const params = new URLSearchParams({ jenis, tahun })
      if (kelas !== 'SEMUA') params.set('kelas', kelas)
      const d = await apiGet(`/api/laporan?${params.toString()}`)
      setData(d)
    } catch (e: any) {
      setRalat(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(muat, 200)
    return () => clearTimeout(t)
  }, [jenis, tahun, kelas])

  const eksportCsv = async () => {
    setMengeksport(true)
    try {
      const params = new URLSearchParams({ jenis, tahun, format: 'csv' })
      if (kelas !== 'SEMUA') params.set('kelas', kelas)
      const d = await apiGet(`/api/laporan?${params.toString()}`)
      if (d.csv) {
        muatTurunCsv(d.csv, d.filename ?? `laporan-${jenis}-${tahun}.csv`)
        toast.success('CSV dimuat turun')
      } else {
        // fallback: convert json rows to csv
        const csv = jsonKeCsv(d.rows ?? [])
        muatTurunCsv(csv, `laporan-${jenis}-${tahun}.csv`)
        toast.success('CSV dimuat turun')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setMengeksport(false)
    }
  }

  const eksportExcel = async () => {
    setMengeksport(true)
    try {
      const params = new URLSearchParams({ jenis, tahun, format: 'csv' })
      if (kelas !== 'SEMUA') params.set('kelas', kelas)
      const d = await apiGet(`/api/laporan?${params.toString()}`)
      const csv = d.csv ?? jsonKeCsv(d.rows ?? [])
      muatTurunCsv(csv, `laporan-${jenis}-${tahun}.xls`)
      toast.success('Excel (sebagai .xls) dimuat turun')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setMengeksport(false)
    }
  }

  const eksportPdf = () => {
    if (!data?.rows?.length) { toast.error('Tiada data untuk dicetak'); return }
    const headers = Object.keys(data.rows[0])
    const html = `
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>
          ${data.rows.map((r: any) => `<tr>${headers.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    `
    cetakPdf(`${JENIS_LABEL[jenis]} ${tahun}`, html)
    toast.success('PDF dijana untuk dicetak')
  }

  const rows = data?.rows ?? []
  const summary = data?.summary ?? {}
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileBarChart className="w-4 h-4 text-primary" /> Jana Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Jenis Laporan</Label>
              <Select value={jenis} onValueChange={(v) => setJenis(v as JenisLaporan)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tunggakan">Tunggakan</SelectItem>
                  <SelectItem value="kutipan">Kutipan</SelectItem>
                  <SelectItem value="ageing">Umur Tunggakan (Ageing)</SelectItem>
                  <SelectItem value="kelas">Mengikut Kelas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tahun</Label>
              <Select value={tahun} onValueChange={setTahun}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kelas</Label>
              <Select value={kelas} onValueChange={setKelas}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua Kelas</SelectItem>
                  {senaraiKelas.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.namaKelas} (T{k.tahunDarjah})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            {JENIS_LABEL[jenis]} {tahun}
            {kelas !== 'SEMUA' && ` • ${senaraiKelas.find(k => k.id === kelas)?.namaKelas ?? ''}`}
          </Badge>
          {rows.length > 0 && (
            <span className="text-xs text-muted-foreground">{rows.length} baris</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={muat} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Muat Semula
          </Button>
          <Button variant="outline" size="sm" onClick={eksportCsv} disabled={mengeksport || !rows.length}>
            <Download className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={eksportExcel} disabled={mengeksport || !rows.length}>
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={eksportPdf} disabled={!rows.length}>
            <Printer className="w-3.5 h-3.5 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Summary */}
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(summary).slice(0, 8).map(([k, v]: any) => (
            <Card key={k} className="bg-card/40">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{k}</p>
                <p className="text-base font-bold">
                  {typeof v === 'number' && (k.toLowerCase().includes('jumlah') || k.toLowerCase().includes('total'))
                    ? formatRM(v)
                    : String(v ?? '-')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" /> Pratonton Data
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
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
              ))}
            </div>
          )}
          {!ralat && !loading && rows.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileBarChart className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Tiada data untuk laporan ini</p>
              <p className="text-xs mt-1">Cuba tukar penapis jenis / tahun / kelas</p>
            </div>
          )}
          {!ralat && !loading && rows.length > 0 && (
            <ScrollArea className="max-h-[480px]">
              <div className="border border-border/40 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map(h => (
                        <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 200).map((r: any, i: number) => (
                      <TableRow key={i}>
                        {headers.map(h => {
                          const v = r[h]
                          const isJumlah = h.toLowerCase().includes('jumlah') || h.toLowerCase().includes('total') || h.toLowerCase().includes('baki')
                          return (
                            <TableCell key={h} className={`text-xs whitespace-nowrap ${isJumlah && typeof v === 'number' ? 'text-right font-mono' : ''}`}>
                              {typeof v === 'number' && isJumlah ? formatRM(v) : String(v ?? '-')}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 200 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Memaparkan 200 dari {rows.length} baris. Eksport untuk data penuh.
                </p>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
