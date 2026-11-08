"use client";

import { useProjectLeadContext } from './project-lead-context';
import { ProjectPassportConcept } from './project-passport-concept';

/** Media outside a project has no project passport to download. */
export function ViewerPassport({ active = true }: { active?: boolean }) {
  const project = useProjectLeadContext();
  if (!project?.slug) return null;
  return <div className="viewer-passport" onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
    <ProjectPassportConcept project={project.name} projectSlug={project.slug} placement="viewer" active={active} />
  </div>;
}
