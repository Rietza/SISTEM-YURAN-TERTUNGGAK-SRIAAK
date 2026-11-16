// SRIAAKL - Log Audit API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '100')
  const data = await db.logAudit.findMany({
    include: { pengguna: true },
    orderBy: { masa: 'desc' },
    take: limit,
  })
  return NextResponse.json({
    log: data.map(l => ({
      id: l.id,
      penggunaId: l.penggunaId,
      namaPengguna: l.pengguna?.nama ?? '-',
      peranan: l.pengguna?.peranan ?? '-',
      tindakan: l.tindakan,
      entiti: l.entiti,
      masa: l.masa,
      butiran: l.butiran,
    })),
  })
}
