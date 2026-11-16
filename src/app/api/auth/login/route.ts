// SRIAAKL - Auth API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

function hash(p: string) {
  return createHash('sha256').update(p).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const { emel, kataLaluan } = await req.json()
    if (!emel || !kataLaluan) {
      return NextResponse.json({ ralat: 'Emel dan kata laluan diperlukan' }, { status: 400 })
    }
    const pengguna = await db.pengguna.findUnique({
      where: { emel: emel.toLowerCase() },
    })
    if (!pengguna || !pengguna.aktif) {
      return NextResponse.json({ ralat: 'Pengguna tidak dijumpai atau tidak aktif' }, { status: 401 })
    }
    if (pengguna.kataLaluanHash !== hash(kataLaluan)) {
      return NextResponse.json({ ralat: 'Kata laluan salah' }, { status: 401 })
    }
    await db.logAudit.create({
      data: {
        penggunaId: pengguna.id,
        tindakan: 'LOG_MASUK',
        entiti: 'PENGGUNA',
        butiran: `${pengguna.nama} log masuk`,
      },
    })
    return NextResponse.json({
      pengguna: {
        id: pengguna.id,
        nama: pengguna.nama,
        emel: pengguna.emel,
        peranan: pengguna.peranan,
      },
      token: Buffer.from(`${pengguna.id}:${Date.now()}`).toString('base64'),
    })
  } catch (e: any) {
    return NextResponse.json({ ralat: e.message }, { status: 500 })
  }
}
