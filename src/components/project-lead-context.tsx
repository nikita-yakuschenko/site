'use client'

import { createContext, useContext, type ReactNode } from 'react'
type ProjectContext = { id: string; cmsId?: string; slug: string; name: string }
const Context = createContext<ProjectContext | null>(null)
export const useProjectLeadContext = () => useContext(Context)
export function ProjectLeadProvider({ project, children }: { project: ProjectContext; children: ReactNode }) {
  return <Context.Provider value={project}>{children}</Context.Provider>
}
