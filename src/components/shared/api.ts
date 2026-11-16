'use client'

// Shared helpers & API client
import { formatRM as fmtRM, formatRMPlain } from '@/lib/tunggakan'

export async function apiGet(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error((await res.json())?.ralat || `HTTP ${res.status}`)
  return res.json()
}

export async function apiPost(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.ralat || `HTTP ${res.status}`)
  return data
}

export async function apiPatch(url: string, body: any) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.ralat || `HTTP ${res.status}`)
  return data
}

export async function apiPut(url: string, body: any) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.ralat || `HTTP ${res.status}`)
  return data
}

export function formatRM(j: number) { return fmtRM(j) }
export function formatRMP(j: number) { return formatRMPlain(j) }

export function formatDate(d: string | Date) {
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(d: string | Date) {
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// CSV download
export function muatTurunCsv(csv: string, filename: string) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Convert JSON to CSV
export function jsonKeCsv(rows: any[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map(h => {
      const v = r[h]
      if (v === null || v === undefined) return ''
      if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
        return `"${v.replace(/"/g, '""')}"`
      }
      return String(v)
    }).join(','))
  }
  return lines.join('\n')
}

// Export HTML table to print (PDF)
export function cetakPdf(tajuk: string, htmlKandungan: string) {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return
  w.document.write(`
    <!DOCTYPE html><html><head><title>${tajuk}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
      h1 { color: #0f5132; font-size: 18px; }
      .meta { color: #555; font-size: 12px; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { padding: 6px 8px; border: 1px solid #ccc; text-align: left; }
      th { background: #f0f5f3; font-weight: bold; }
      tr:nth-child(even) td { background: #fafafa; }
      .footer { margin-top: 20px; font-size: 10px; color: #888; }
    </style></head><body>
    <h1>SRIAAKL - ${tajuk}</h1>
    <div class="meta">Sekolah Rendah Islam Al-Amin Keramat &middot; Dijana pada ${new Date().toLocaleString('ms-MY')}</div>
    ${htmlKandungan}
    <div class="footer">Sistem Pemantauan Tunggakan Yuran Murid v1.0 - Prototaip</div>
    </body></html>
  `)
  w.document.close()
  setTimeout(() => { w.print() }, 300)
}
