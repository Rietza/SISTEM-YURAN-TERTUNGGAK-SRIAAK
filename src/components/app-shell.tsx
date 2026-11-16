'use client'

import { useState, useEffect } from 'react'
import { useAuth, PERANAN_LABEL, boleh, type Peranan } from './auth-context'
import { Dashboard } from './modules/dashboard'
import { Tunggakan } from './modules/tunggakan'
import { ProfilMurid } from './modules/profil-murid'
import { Bayaran } from './modules/bayaran'
import { Peringatan } from './modules/peringatan'
import { Ansuran } from './modules/ansuran'
import { Nota } from './modules/nota'
import { Pengecualian } from './modules/pengecualian'
import { Laporan } from './modules/laporan'
import { Tetapan } from './modules/tetapan'
import { AuditLog } from './modules/audit-log'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard, Table2, User, Banknote, Bell, CreditCard,
  ClipboardList, FileCheck2, FileBarChart, Settings, ScrollText,
  LogOut, Menu, X, Wallet, ShieldAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Modul = 'dashboard' | 'tunggakan' | 'murid' | 'bayaran' | 'peringatan' | 'ansuran' | 'nota' | 'pengecualian' | 'laporan' | 'tetapan' | 'audit'

interface NavItem {
  id: Modul
  label: string
  icon: any
  tindakan: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Papan Pemuka', icon: LayoutDashboard, tindakan: 'dashboard' },
  { id: 'tunggakan', label: 'Jadual Tunggakan', icon: Table2, tindakan: 'tunggakan' },
  { id: 'murid', label: 'Profil Murid', icon: User, tindakan: 'murid' },
  { id: 'bayaran', label: 'Rekod Bayaran', icon: Banknote, tindakan: 'bayaran' },
  { id: 'peringatan', label: 'Peringatan', icon: Bell, tindakan: 'peringatan' },
  { id: 'ansuran', label: 'Pelan Ansuran', icon: CreditCard, tindakan: 'ansuran' },
  { id: 'nota', label: 'Nota Susulan', icon: ClipboardList, tindakan: 'nota' },
  { id: 'pengecualian', label: 'Pengecualian', icon: FileCheck2, tindakan: 'pengecualian' },
  { id: 'laporan', label: 'Laporan & Eksport', icon: FileBarChart, tindakan: 'laporan' },
  { id: 'tetapan', label: 'Tetapan', icon: Settings, tindakan: 'tetapan' },
  { id: 'audit', label: 'Log Audit', icon: ScrollText, tindakan: 'audit' },
]

export function AppShell() {
  const { pengguna, logKeluar } = useAuth()
  const [modul, setModul] = useState<Modul>('dashboard')
  const [muridAktif, setMuridAktif] = useState<string | null>(null)
  const [sidebarBuka, setSidebarBuka] = useState(false)
  const [saizTetapan, setSaizTetapan] = useState('dashboard')

  // Buka profil murid dari modul lain
  const bukaProfilMurid = (id: string) => {
    setMuridAktif(id)
    setModul('murid')
    setSidebarBuka(false)
  }

  const tukarModul = (m: Modul) => {
    setModul(m)
    setSidebarBuka(false)
  }

  if (!pengguna) return null

  const navTampak = NAV_ITEMS.filter(n => boleh(pengguna.peranan as Peranan, n.tindakan))

  const renderModul = () => {
    switch (modul) {
      case 'dashboard': return <Dashboard onBukaMurid={bukaProfilMurid} onTukarModul={tukarModul} />
      case 'tunggakan': return <Tunggakan onBukaMurid={bukaProfilMurid} />
      case 'murid': return muridAktif
        ? <ProfilMurid muridId={muridAktif} onKembali={() => { setMuridAktif(null); setModul('tunggakan') }} />
        : <Tunggakan onBukaMurid={bukaProfilMurid} />
      case 'bayaran': return <Bayaran onBukaMurid={bukaProfilMurid} />
      case 'peringatan': return <Peringatan onBukaMurid={bukaProfilMurid} />
      case 'ansuran': return <Ansuran onBukaMurid={bukaProfilMurid} />
      case 'nota': return <Nota onBukaMurid={bukaProfilMurid} />
      case 'pengecualian': return <Pengecualian onBukaMurid={bukaProfilMurid} />
      case 'laporan': return <Laporan />
      case 'tetapan': return <Tetapan />
      case 'audit': return <AuditLog />
      default: return null
    }
  }

  const tajukModul = NAV_ITEMS.find(n => n.id === modul)?.label ?? ''

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarBuka && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarBuka(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen w-72 z-50 lg:z-30",
        "bg-sidebar border-r border-sidebar-border flex flex-col",
        "transition-transform duration-300",
        sidebarBuka ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Brand */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-sidebar-foreground truncate">SRIAAKL</h2>
              <p className="text-xs text-sidebar-foreground/60 truncate">Tunggakan Yuran</p>
            </div>
            <button
              onClick={() => setSidebarBuka(false)}
              className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-3">
          <nav className="px-2 space-y-0.5">
            {navTampak.map((n) => {
              const Icon = n.icon
              const aktif = modul === n.id
              return (
                <button
                  key={n.id}
                  onClick={() => tukarModul(n.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                    aktif
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent"
                  )}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", aktif && "text-primary")} />
                  <span className="truncate">{n.label}</span>
                </button>
              )
            })}
          </nav>
        </ScrollArea>

        {/* User */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/50">
            <Avatar className="w-9 h-9 border border-primary/30">
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {pengguna.nama.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{pengguna.nama}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{PERANAN_LABEL[pengguna.peranan as Peranan]}</p>
            </div>
            <button
              onClick={logKeluar}
              className="text-sidebar-foreground/60 hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-500/10"
              title="Log Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border h-14 flex items-center px-4 lg:px-6 gap-3">
          <button
            onClick={() => setSidebarBuka(true)}
            className="lg:hidden text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">{tajukModul}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:flex border-primary/30 text-primary">
              {PERANAN_LABEL[pengguna.peranan as Peranan]}
            </Badge>
            <span className="text-xs text-muted-foreground hidden md:inline">
              16 Nov 2026
            </span>
          </div>
        </header>

        {/* Module content */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {renderModul()}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-border bg-card/50 px-4 lg:px-6 py-3 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>&copy; 2026 Sekolah Rendah Islam Al-Amin Keramat &middot; Sistem Tunggakan Yuran v1.0</p>
          <p className="text-muted-foreground/70">Prototaip • Data dummy • PDPA 2010</p>
        </footer>
      </div>
    </div>
  )
}
