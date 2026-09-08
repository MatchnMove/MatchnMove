import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourceArticle } from "@/components/resource-article";
import { SiteShell } from "@/components/site-shell";
import { articleResources, getResource } from "@/lib/moving-resources";
import { absoluteUrl, createPageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

export function generateStaticParams() {
  return articleResources.map((resource) => ({ slug: resource.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resource = getResource(slug);

  if (!resource) {
    return createPageMetadata({
      title: "Moving and Cleaning Resource",
      description: "Practical New Zealand moving and move-out cleaning guidance.",
      path: `/resources/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: resource.title,
    description: resource.description,
    path: `/resources/${resource.slug}`,
  });
}

export default async function MovingResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = getResource(slug);
  if (!resource) notFound();

  const pageUrl = absoluteUrl(`/resources/${resource.slug}`);
  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Resources", item: absoluteUrl("/resources") },
    ...(resource.category === "cleaning"
      ? [
          {
            "@type": "ListItem",
            position: 3,
            name: "Cleaning quotes",
            item: absoluteUrl("/cleaning-quotes"),
          },
        ]
      : []),
    {
      "@type": "ListItem",
      position: resource.category === "cleaning" ? 4 : 3,
      name: resource.shortTitle,
      item: pageUrl,
    },
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbItems,
      },
      {
        "@type": "Article",
        headline: resource.title,
        description: resource.description,
        dateModified: resource.category === "cleaning" ? "2026-09-08" : "2026-06-15",
        datePublished: resource.category === "cleaning" ? "2026-09-08" : "2026-06-15",
        articleSection: resource.category === "cleaning" ? "Move-out cleaning" : "Moving",
        inLanguage: "en-NZ",
        mainEntityOfPage: pageUrl,
        author: {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: SITE_NAME,
        },
        publisher: {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: SITE_NAME,
        },
      },
    ],
  };

  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ResourceArticle resource={resource} />
    </SiteShell>
  );
}
