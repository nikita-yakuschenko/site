export function projectPublicationStatus(project: { _status?: string | null; unpublishedAt?: string | null }) {
  return project._status === 'published' ? 'published' : project.unpublishedAt ? 'unpublished' : 'draft'
}
