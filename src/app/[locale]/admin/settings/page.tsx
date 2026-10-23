import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/auth'
import { ruleParams } from '@/lib/booking-rules'
import { getSettings } from '@/lib/settings'
import { SettingsForm } from './settings-form'

export default async function AdminSettingsPage() {
  await requireAdmin()
  const [s, t] = await Promise.all([getSettings(), getTranslations('admin.settings')])
  const p = ruleParams(s)
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('intro')}</p>
      <SettingsForm
        defaults={{
          open: p.open,
          close: p.close,
          stepMinutes: s.stepMinutes,
          maxAdvanceDays: s.maxAdvanceDays,
          maxActiveBookings: s.maxActiveBookings,
          changeWindowHours: s.changeWindowHours,
          maxSlotsPerBooking: s.maxSlotsPerBooking,
          membershipWarnDays: s.membershipWarnDays,
          reminderHours: s.reminderHours,
        }}
      />
    </div>
  )
}
