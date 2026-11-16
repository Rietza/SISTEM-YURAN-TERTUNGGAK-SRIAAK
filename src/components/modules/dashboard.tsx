'use client'

import { useEffect, useState } from 'react'
import { apiGet, formatRM } from '@/components/shared/api'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Wallet, TrendingDown, Users, Percent, AlertTriangle, ArrowUpRight,
  Banknote, Phone, LayoutDashboard, Table2, Trophy, Building2,
  BarChart2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ComposedChart, Line, PieChart, Pie, Cell
} from 'recharts'

interface DashboardData {
  kad: {
    tunggakanKeseluruhan: number
    tunggakan2026: number
    tunggakan2025: number
    kadarKutipanBulanIni: number
    bilMenunggak: number
    bilMurid: number
  }
  bulanan2026: { bulan: number; namaBulan: string; invois: number; bayaran: number; tunggakan: number }[]
  ageing: { kategori: string; jumlah: number }[]
  top10: any[]
  tunggakanKelas: { kelas: string; tahunDarjah: number; bilMurid: number; tunggakan: number; bilMenunggak: number }[]
  jumlahInvoisNov: number
  jumlahDiterimaNov: number
  tarikhSemasa: string
}

const AGEING_LABEL: Record<string, string> = {
  '0_30': '0-30 hari',
  '31_60': '31-60 hari',
  '61_90': '61-90 hari',
  'LEBIH_90': 'Lebih 90 hari',
  'BELUM_JATUH_TEMPO': 'Belum jatuh tempo',
}

const AGEING_WARNA: Record<string, string> = {
  '0_30': 'oklch(0.62 0.14 145)',
  '31_60': 'oklch(0.65 0.18 75)',
  '61_90': 'oklch(0.62 0.18 50)',
  'LEBIH_90': 'oklch(0.62 0.21 25)',
  'BELUM_JATUH_TEMPO': 'oklch(0.55 0.01 250)',
}

export function Dashboard({
  onBukaMurid,
  onTukarModul,
}: {
  onBukaMurid: (id: string) => void
  onTukarModul: (m: any) => void
}) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [ralat, setRalat] = useState('')
  const [loading, setLoading] = useState(true)

  const muat = async () => {
    setLoading(true)
    try {
      const d = await apiGet('/api/dashboard')
      setData(d)
      setRalat('')
    } catch (e: any) {
      setRalat(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { muat() }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-28 bg-card/40" />
          ))}
        </div>
        <Card className="animate-pulse h-72 bg-card/40" />
        <Card className="animate-pulse h-72 bg-card/40" />
      </div>
    )
  }

  if (ralat) {
    return (
      <Card className="p-6 border-rose-500/30 bg-rose-500/5">
        <p className="text-rose-400 font-medium">Ralat memuatkan papan pemuka: {ralat}</p>
        <Button onClick={muat} variant="outline" className="mt-3">Cuba Semula</Button>
      </Card>
    )
  }

  if (!data) return null

  const kad = data.kad

  return (
    <div className="space-y-5">
      {/* Hero summary */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <LayoutDashboard className="w-4 h-4 text-primary" />
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Ringkasan Eksekutif</p>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Jumlah Tunggakan Keseluruhan</h2>
              <p className="text-3xl font-bold text-primary mt-1">{formatRM(kad.tunggakanKeseluruhan)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Daripada {kad.bilMurid} murid &middot; {kad.bilMenunggak} menunggak yuran
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
              <div className="px-4 py-3 rounded-lg bg-background/50 border border-border/40">
                <p className="text-xs text-muted-foreground">Tunggakan 2026</p>
                <p className="text-lg font-bold text-amber-400">{formatRM(kad.tunggakan2026)}</p>
              </div>
              <div className="px-4 py-3 rounded-lg bg-background/50 border border-border/40">
                <p className="text-xs text-muted-foreground">Tunggakan 2025</p>
                <p className="text-lg font-bold text-rose-400">{formatRM(kad.tunggakan2025)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          tajuk="Kadar Kutipan (Nov 2026)"
          nilai={`${kad.kadarKutipanBulanIni.toFixed(1)}%`}
          subTajuk={`${formatRM(data.jumlahDiterimaNov)} / ${formatRM(data.jumlahInvoisNov)}`}
          ikon={Percent}
          aksenKelas="bg-emerald-500/10 border-emerald-500/20"
          warnaKelas="text-emerald-400"
        />
        <StatCard
          tajuk="Bilangan Menunggak"
          nilai={kad.bilMenunggak}
          subTajuk={`Daripada ${kad.bilMurid} murid`}
          ikon={Users}
          aksenKelas="bg-amber-500/10 border-amber-500/20"
          warnaKelas="text-amber-400"
        />
        <StatCard
          tajuk="Tunggakan Semasa (2026)"
          nilai={formatRM(kad.tunggakan2026)}
          subTajuk="Jan - Nov 2026"
          ikon={TrendingDown}
          aksenKelas="bg-orange-500/10 border-orange-500/20"
          warnaKelas="text-orange-400"
        />
        <StatCard
          tajuk="Tunggakan Lapok (2025)"
          nilai={formatRM(kad.tunggakan2025)}
          subTajuk="Dibawa ke 2026"
          ikon={AlertTriangle}
          aksenKelas="bg-rose-500/10 border-rose-500/20"
          warnaKelas="text-rose-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Monthly bar chart - 2 cols */}
        <Card className="xl:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Carta Bulanan 2026 - Invois vs Bayaran vs Tunggakan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.bulanan2026}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.018 250 / 0.3)" />
                <XAxis dataKey="namaBulan" stroke="oklch(0.7 0.015 250)" fontSize={11} />
                <YAxis stroke="oklch(0.7 0.015 250)" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'oklch(0.205 0.018 250)', border: '1px solid oklch(0.30 0.018 250)', borderRadius: 8, color: 'oklch(0.96 0.005 250)', fontSize: 12 }}
                  formatter={(v: any, n: string) => [formatRM(v), n === 'invois' ? 'Invois' : n === 'bayaran' ? 'Bayaran' : 'Tunggakan']}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'oklch(0.7 0.015 250)' }} />
                <Bar dataKey="invois" name="Invois" fill="oklch(0.55 0.12 250)" radius={[3,3,0,0]} />
                <Bar dataKey="bayaran" name="Bayaran" fill="oklch(0.62 0.14 145)" radius={[3,3,0,0]} />
                <Line dataKey="tunggakan" name="Tunggakan" stroke="oklch(0.62 0.21 25)" strokeWidth={2} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ageing pie */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Pengelasan Umur Tunggakan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.ageing.filter(a => a.jumlah > 0)}
                  dataKey="jumlah"
                  nameKey="kategori"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(e: any) => `${(e.jumlah/1000).toFixed(1)}k`}
                  labelLine={false}
                >
                  {data.ageing.map((a, i) => (
                    <Cell key={i} fill={AGEING_WARNA[a.kategori] || 'oklch(0.5 0 0)'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'oklch(0.205 0.018 250)', border: '1px solid oklch(0.30 0.018 250)', borderRadius: 8, color: 'oklch(0.96 0.005 250)', fontSize: 12 }}
                  formatter={(v: any) => formatRM(v)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {data.ageing.filter(a => a.jumlah > 0).map((a) => (
                <div key={a.kategori} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: AGEING_WARNA[a.kategori] }} />
                    <span className="text-muted-foreground">{AGEING_LABEL[a.kategori]}</span>
                  </div>
                  <span className="font-medium text-foreground">{formatRM(a.jumlah)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 defaulters + per kelas chart */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Top 10 */}
        <Card className="xl:col-span-3 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              10 Penunggak Tertinggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Nama Murid</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-center">Skor</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top10.map((m, i) => (
                    <TableRow
                      key={m.id}
                      className="cursor-pointer hover:bg-muted/40 border-border/30"
                      onClick={() => onBukaMurid(m.id)}
                    >
                      <TableCell className="font-mono text-muted-foreground">{i+1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{m.nama}</div>
                        <div className="text-xs text-muted-foreground">{m.noMurid}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{m.kelas}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-rose-400">
                        {formatRM(m.jumlahTunggakan)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={
                          m.skor >= 150 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                          m.skor >= 80 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        } variant="outline">
                          {m.skor}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => { e.stopPropagation(); onBukaMurid(m.id) }}
                          >
                            <ArrowUpRight className="w-3 h-3" /> Profil
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Per kelas */}
        <Card className="xl:col-span-2 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Tunggakan Mengikut Kelas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={data.tunggakanKelas} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.018 250 / 0.3)" />
                <XAxis type="number" stroke="oklch(0.7 0.015 250)" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="kelas" stroke="oklch(0.7 0.015 250)" fontSize={11} width={60} />
                <Tooltip
                  contentStyle={{ background: 'oklch(0.205 0.018 250)', border: '1px solid oklch(0.30 0.018 250)', borderRadius: 8, color: 'oklch(0.96 0.005 250)', fontSize: 12 }}
                  formatter={(v: any) => formatRM(v)}
                />
                <Bar dataKey="tunggakan" name="Tunggakan" fill="oklch(0.62 0.14 165)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button onClick={() => onTukarModul('tunggakan')} variant="outline" className="h-20 flex-col gap-1 bg-card/40">
          <Table2 className="w-5 h-5 text-primary" />
          <span className="text-xs">Jadual Jan-Dis</span>
        </Button>
        <Button onClick={() => onTukarModul('bayaran')} variant="outline" className="h-20 flex-col gap-1 bg-card/40">
          <Banknote className="w-5 h-5 text-emerald-400" />
          <span className="text-xs">Rekod Bayaran</span>
        </Button>
        <Button onClick={() => onTukarModul('peringatan')} variant="outline" className="h-20 flex-col gap-1 bg-card/40">
          <Phone className="w-5 h-5 text-amber-400" />
          <span className="text-xs">Hantar Peringatan</span>
        </Button>
        <Button onClick={() => onTukarModul('laporan')} variant="outline" className="h-20 flex-col gap-1 bg-card/40">
          <Wallet className="w-5 h-5 text-chart-5" />
          <span className="text-xs">Laporan & Eksport</span>
        </Button>
      </div>
    </div>
  )
}
