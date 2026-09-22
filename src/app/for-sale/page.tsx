import { permanentRedirect } from 'next/navigation'

export default function ForSalePage() {
  permanentRedirect('/catalog?status=ready')
}
