import { notFound } from 'next/navigation'

/** Ogni URL sconosciuto sotto /it o /en finisce nella pagina 404 localizzata (`[locale]/not-found.tsx`). */
export default function CatchAll() {
  notFound()
}
