'use server'

import { signOut } from '@backend/lib/auth'

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}
