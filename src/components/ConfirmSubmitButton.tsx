'use client'

import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'

/** Pulsante di invio che chiede conferma prima di eseguire l'azione. */
export function ConfirmSubmitButton({ message, ...props }: ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      {...props}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault()
      }}
    />
  )
}
