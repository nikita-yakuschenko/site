'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
type ProjectContext = { id: string; cmsId?: string; slug: string; name: string }
const Context = createContext<ProjectContext | null>(null)
export const useProjectLeadContext = () => useContext(Context)
export function ProjectLeadProvider({ project, children }: { project: ProjectContext; children: ReactNode }) {
  // Шторка контактов стоит вне карточки, поэтому имя проекта читает с документа.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.leadProject = project.name
    root.dataset.leadProjectSlug = project.slug
    root.dataset.leadProjectId = project.id
    return () => {
      delete root.dataset.leadProject
      delete root.dataset.leadProjectSlug
      delete root.dataset.leadProjectId
    }
  }, [project.id, project.name, project.slug])
  return <Context.Provider value={project}>{children}</Context.Provider>
}
