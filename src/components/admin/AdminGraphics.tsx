/** Квадратный знак AVGST. Цвет задаёт CSS по теме. */
function AdminMark({ className }: { className?: string }) {
  return <img className={`avgst-admin-mark ${className ?? ''}`.trim()} src="/logo.svg" alt="" />
}

export function AdminLogo() {
  return <img alt="Авангард строй" className="avgst-admin-lockup" src="/ASP.svg" />
}

export function AdminNavBrand() {
  return (
    <a className="avgst-nav-brand" href="/admin">
      <AdminLogo />
    </a>
  )
}

export function AdminIcon() {
  return <AdminMark className="avgst-admin-icon" />
}
