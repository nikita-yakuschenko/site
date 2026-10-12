import { Badge } from '../ui/badge'

export function BlockedCell({ cellData }: { cellData?: boolean }) {
  return <Badge variant={cellData ? 'destructive' : 'outline'}>{cellData ? 'Заблокирован' : 'Активен'}</Badge>
}
