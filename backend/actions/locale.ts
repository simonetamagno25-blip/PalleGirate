'use server'

import { getSessionUser } from '@backend/lib/auth'
import { setUserLocale } from '@backend/lib/members'

/** Salva la lingua sul profilo se l'utente è autenticato (altrimenti vale solo l'URL/cookie). */
export async function saveLocaleAction(locale: string): Promise<void> {
  const user = await getSessionUser()
  if (user) await setUserLocale(user.id, locale)
}
