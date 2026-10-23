import { ImageResponse } from 'next/og'

const SIZES = ['192', '512']

/** Icona PNG dell'app: una pallina da tennis su fondo scuro. `?maskable=1` lascia il margine di sicurezza del 20%. */
export async function GET(request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params
  if (!SIZES.includes(size)) return new Response('Not found', { status: 404 })
  const px = Number(size)
  const maskable = new URL(request.url).searchParams.get('maskable') === '1'
  const ball = Math.round(px * (maskable ? 0.56 : 0.76))

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827' }}>
        <div
          style={{
            width: ball,
            height: ball,
            borderRadius: '50%',
            background: '#c6f432',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#111827',
            fontSize: Math.round(ball * 0.42),
            fontWeight: 800,
            letterSpacing: -2,
          }}
        >
          PG
        </div>
      </div>
    ),
    { width: px, height: px, headers: { 'Cache-Control': 'public, max-age=86400' } },
  )
}
