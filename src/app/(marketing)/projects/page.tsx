import { db } from "@/db";
import { projects } from "@/db/schema";
import { PageHero } from "@/components/ui/page-hero";
import { ProjectsGallery } from "@/components/home/projects-gallery";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projectsData = await db.select().from(projects).orderBy(projects.sortOrder);

  return (
    <>
      <PageHero
        eyebrow="Projects"
        title="Recent installations across the Gulf."
        description="A selection of the events our screens have powered — from intimate galas to 10,000-person outdoor celebrations."
      />
      <ProjectsGallery projects={projectsData} hideHeading />
    </>
  );
}
