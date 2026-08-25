import { copy } from '../../lib/copy'

export default function NotFound() {
  return (
    <main className="empty">
      <h1>{copy.notFound}</h1>
    </main>
  )
}
