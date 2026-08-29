import type { ReactNode } from 'react'

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-4 py-8 text-center">
      <p className="font-semibold text-navy">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-base text-muted">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
