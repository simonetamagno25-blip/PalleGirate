import { getFormatter, getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/i18n/routing'
import { requireAdmin } from '@backend/lib/auth'
import { listMembers } from '@backend/lib/members'
import { getStandingsByUser } from '@backend/lib/payments'
import { getSettings } from '@backend/lib/settings'
import { daysBetween, romeDay } from '@backend/lib/time'
import { renewAction, resetAccessAction, toggleAdminAction } from '@backend/actions/admin-members'

export default async function MembersPage({ searchParams }: PageProps<'/[locale]/admin/members'>) {
  const admin = await requireAdmin()
  const { q, error } = await searchParams
  const search = typeof q === 'string' ? q : undefined
  const [members, settings, t, format] = await Promise.all([
    listMembers(admin, search),
    getSettings(),
    getTranslations('admin.members'),
    getFormatter(),
  ])
  const standings = await getStandingsByUser(admin, members.map((m) => m.id))
  const today = romeDay(new Date())

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <Button render={<Link href="/admin/members/new" />}>{t('new')}</Button>
      </div>

      <form className="flex max-w-md gap-2" role="search">
        <Input name="q" defaultValue={search} placeholder={t('search')} aria-label={t('search')} />
        <Button type="submit" variant="secondary">
          {t('searchButton')}
        </Button>
      </form>

      {typeof error === 'string' && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${error}` as 'errors.LAST_ADMIN')}
        </p>
      )}

      {members.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('col.name')}</TableHead>
              <TableHead>{t('col.card')}</TableHead>
              <TableHead>{t('col.expires')}</TableHead>
              <TableHead>{t('col.status')}</TableHead>
              <TableHead>{t('col.standing')}</TableHead>
              <TableHead className="text-right">{t('col.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const daysLeft = m.membership ? daysBetween(today, romeDay(m.membership.expiresAt)) : null
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {m.lastName} {m.firstName}
                      </span>
                      {m.isAdmin && <Badge variant="secondary">{t('badge.admin')}</Badge>}
                      {standings.get(m.id)?.blocked && <Badge variant="destructive">{t('badge.blocked')}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </TableCell>
                  <TableCell>{m.membership?.number ?? <Badge variant="outline">{t('badge.noCard')}</Badge>}</TableCell>
                  <TableCell>
                    {m.membership && daysLeft !== null && (
                      <div className="flex flex-col items-start gap-1">
                        <span>{format.dateTime(m.membership.expiresAt, { dateStyle: 'medium' })}</span>
                        {daysLeft < 0 ? (
                          <Badge variant="destructive">{t('badge.expired')}</Badge>
                        ) : daysLeft <= settings.membershipWarnDays ? (
                          <Badge variant="outline">{t('badge.expiresIn', { days: daysLeft })}</Badge>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{m.activatedAt ? t('status.active') : t('status.pending')}</TableCell>
                  <TableCell className="text-sm">
                    {t('standing', { strikes: standings.get(m.id)?.strikes ?? 0, unpaid: standings.get(m.id)?.unpaidCount ?? 0 })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button size="sm" variant="outline" render={<Link href={`/admin/members/${m.id}`} />}>
                        {t('action.detail')}
                      </Button>
                      <Button size="sm" variant="outline" render={<Link href={`/admin/members/${m.id}/edit`} />}>
                        {t('action.edit')}
                      </Button>
                      {m.membership && (
                        <form action={renewAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <ConfirmSubmitButton size="sm" variant="outline" message={t('action.confirmRenew')}>
                            {t('action.renew')}
                          </ConfirmSubmitButton>
                        </form>
                      )}
                      {m.membership && m.id !== admin.id && (
                        <form action={resetAccessAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <ConfirmSubmitButton size="sm" variant="outline" message={t('action.confirmReset')}>
                            {t('action.resetAccess')}
                          </ConfirmSubmitButton>
                        </form>
                      )}
                      <form action={toggleAdminAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="makeAdmin" value={String(!m.isAdmin)} />
                        <Button size="sm" variant="outline" type="submit">
                          {m.isAdmin ? t('action.removeAdmin') : t('action.makeAdmin')}
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
