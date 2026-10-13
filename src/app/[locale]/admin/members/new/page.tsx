import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/auth'
import { romeDay } from '@/lib/time'
import { createMemberAction } from '../actions'
import { MemberForm } from '../member-form'

export default async function NewMemberPage() {
  await requireAdmin()
  const t = await getTranslations('admin.members.form')
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('titleNew')}</h1>
      <MemberForm isNew action={createMemberAction} defaults={{ issuedAt: romeDay(new Date()) }} />
    </div>
  )
}
