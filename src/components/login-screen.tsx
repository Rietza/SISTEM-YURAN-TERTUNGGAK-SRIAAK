'use client'

import { useState } from 'react'
import { useAuth } from './auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wallet, LogIn, Eye, EyeOff, ShieldCheck } from 'lucide-react'

const DEMO_AKAUN = [
  { peranan: 'Pentadbir', emel: 'pentadbir@sriaakl.edu.my', katalaluan: 'pentadbir123' },
  { peranan: 'Bendahari', emel: 'bendahari@sriaakl.edu.my', katalaluan: 'bendahari123' },
  { peranan: 'Pengetua', emel: 'pengetua@sriaakl.edu.my', katalaluan: 'pengetua123' },
  { peranan: 'Guru Kelas', emel: 'guru1@sriaakl.edu.my', katalaluan: 'guru123' },
]

export function LoginScreen() {
  const { logMasuk } = useAuth()
  const [emel, setEmel] = useState('')
  const [kataLaluan, setKataLaluan] = useState('')
  const [ralat, setRalat] = useState('')
  const [loading, setLoading] = useState(false)
  const [tunjukKp, setTunjukKp] = useState(false)

  const hantar = async (e: React.FormEvent) => {
    e.preventDefault()
    setRalat('')
    setLoading(true)
    const r = await logMasuk(emel, kataLaluan)
    setLoading(false)
    if (!r.berjaya) setRalat(r.ralat || 'Log masuk gagal')
  }

  const demoClick = (d: typeof DEMO_AKAUN[0]) => {
    setEmel(d.emel)
    setKataLaluan(d.katalaluan)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background decorative gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-chart-2/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 mb-3">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SRIAAKL Tunggakan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistem Pemantauan Tunggakan Yuran Murid
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Sekolah Rendah Islam Al-Amin Keramat
          </p>
        </div>

        <Card className="border-border/60 shadow-xl bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LogIn className="w-5 h-5 text-primary" />
              Log Masuk Sistem
            </CardTitle>
            <CardDescription>Sila masukkan emel dan kata laluan anda</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={hantar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emel">Emel</Label>
                <Input
                  id="emel"
                  type="email"
                  value={emel}
                  onChange={(e) => setEmel(e.target.value)}
                  placeholder="nama@sriaakl.edu.my"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kp">Kata Laluan</Label>
                <div className="relative">
                  <Input
                    id="kp"
                    type={tunjukKp ? 'text' : 'password'}
                    value={kataLaluan}
                    onChange={(e) => setKataLaluan(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setTunjukKp(!tunjukKp)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {tunjukKp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {ralat && (
                <Alert variant="destructive">
                  <AlertDescription>{ralat}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sedang log masuk...' : 'Log Masuk'}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Akaun Demo (klik untuk isi)</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_AKAUN.map((d) => (
                  <button
                    key={d.emel}
                    onClick={() => demoClick(d)}
                    className="text-left px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition border border-border/40 text-xs"
                  >
                    <div className="font-medium text-foreground">{d.peranan}</div>
                    <div className="text-muted-foreground truncate">{d.emel}</div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/60 mt-4">
          Data dummy prototaip • Tiada data sebenar murid digunakan
        </p>
      </div>
    </div>
  )
}
