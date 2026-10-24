import Image from 'next/image'

// Il file è già ridimensionato (560 px di larghezza, rapporto 1349:1166): niente ottimizzatore di immagini.
const RATIO = 1349 / 1166

/** Logo del sito (tre palloni: calcio, tennis, basket). `height` è l'altezza in pixel. */
export function Logo({ height = 40, priority = false }: { height?: number; priority?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      aria-hidden
      width={Math.round(height * RATIO)}
      height={height}
      unoptimized
      priority={priority}
      className="shrink-0 select-none"
    />
  )
}
