export function PageHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold text-navy">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-base text-muted">{subtitle}</p> : null}
    </header>
  )
}
