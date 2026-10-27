'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireMember } from '@backend/lib/auth'
import { markAllRead, markRead } from '@backend/lib/notifications'

const id = z.string().min(1).max(64)

export async function markReadAction(rawId: string): Promise<void> {
  const user = await requireMember()
  const parsed = id.safeParse(rawId)
  if (!parsed.success) return
  await markRead(user.id, parsed.data)
  revalidatePath('/', 'layout')
}

export async function markAllReadAction(): Promise<void> {
  const user = await requireMember()
  await markAllRead(user.id)
  revalidatePath('/', 'layout')
}
