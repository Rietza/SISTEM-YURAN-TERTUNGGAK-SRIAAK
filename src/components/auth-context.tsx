/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Peranan = 'PENTADBIR' | 'BENDAHARI' | 'GURU_KELAS' | 'PENGETUA'

export interface PenggunaSesi {
  id: string
  nama: string
  emel: string
  peranan: Peranan
}

interface AuthCtx {
  pengguna: PenggunaSesi | null
  loading: boolean
  selesai: boolean
  logMasuk: (emel: string, kataLaluan: string) => Promise<{ berjaya: boolean; ralat?: string }>
  logKeluar: () => void
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

function bacaSesi(): PenggunaSesi | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('sriaakl_sesi')
    if (raw) {
      const data = JSON.parse(raw)
      if (data?.pengguna) return data.pengguna
    }
  } catch {}
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initial state is always null to avoid SSR/client hydration mismatch
  const [pengguna, setPengguna] = useState<PenggunaSesi | null>(null)
  const [selesai, setSelesai] = useState(false)

  // Read localStorage after mount (legitimate client-only init pattern)
  useEffect(() => {
    setPengguna(bacaSesi())
    setSelesai(true)
  }, [])

  const logMasuk = async (emel: string, kataLaluan: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emel, kataLaluan }),
      })
      const data = await res.json()
      if (!res.ok) return { berjaya: false, ralat: data.ralat }
      localStorage.setItem('sriaakl_sesi', JSON.stringify({ pengguna: data.pengguna, token: data.token }))
      setPengguna(data.pengguna)
      return { berjaya: true }
    } catch (e: any) {
      return { berjaya: false, ralat: e.message }
    }
  }

  const logKeluar = () => {
    localStorage.removeItem('sriaakl_sesi')
    setPengguna(null)
  }

  return (
    <Ctx.Provider value={{ pengguna, loading: !selesai, selesai, logMasuk, logKeluar }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)

// RBAC helpers
export const PERANAN_LABEL: Record<Peranan, string> = {
  PENTADBIR: 'Pentadbir Sistem',
  BENDAHARI: 'Bendahari',
  GURU_KELAS: 'Guru Kelas',
  PENGETUA: 'Pengetua',
}

export function boleh(peranan: Peranan, tindakan: string): boolean {
  const akses: Record<Peranan, string[]> = {
    PENTADBIR: ['dashboard','tunggakan','murid','bayaran','peringatan','ansuran','nota','pengecualian','laporan','tetapan','audit'],
    BENDAHARI: ['dashboard','tunggakan','murid','bayaran','peringatan','ansuran','nota','pengecualian','laporan'],
    PENGETUA: ['dashboard','tunggakan','murid','laporan','pengecualian'],
    GURU_KELAS: ['dashboard','tunggakan','murid','nota'],
  }
  return akses[peranan]?.includes(tindakan) ?? false
}
