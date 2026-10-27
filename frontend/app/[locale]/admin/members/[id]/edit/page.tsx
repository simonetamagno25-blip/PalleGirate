import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@backend/lib/auth'
import { prisma } from '@backend/lib/db'
import { romeDay } from '@backend/lib/time'
import { updateMemberAction } from '@backend/actions/admin-members'
import { MemberForm } from '../../member-form'

export default async function EditMemberPage({ params }: PageProps<'/[locale]/admin/members/[id]/edit'>) {
  await requireAdmin()
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, include: { membership: true } })
  if (!user) notFound()
  const t = await getTranslations('admin.members.form')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('titleEdit')}</h1>
      <MemberForm
        action={updateMemberAction.bind(null, user.id)}
        hasMembership={user.membership !== null}
        defaults={{
          firstName: user.firstName,
          lastName: user.lastName,
          birthDate: user.birthDate ? romeDay(user.birthDate) : '',
          email: user.email,
          phone: user.phone ?? '',
          membershipNumber: user.membership?.number,
          issuedAt: user.membership ? romeDay(user.membership.issuedAt) : undefined,
          expiresAt: user.membership ? romeDay(user.membership.expiresAt) : undefined,
        }}
      />
    </div>
  )
}
