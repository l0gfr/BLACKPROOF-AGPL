import { getCollection, type CollectionEntry } from "astro:content";

export type AnalysisEntry = CollectionEntry<"analyses">;

export async function getPublishedAnalyses(): Promise<AnalysisEntry[]> {
  const entries = await getCollection("analyses", ({ data }) => data.draft === false);

  return entries.sort((left, right) => (
    right.data.publishedAt.getTime() - left.data.publishedAt.getTime()
  ));
}

export function getAnalysisPath(entry: AnalysisEntry): string {
  return `/analyses/${entry.id}`;
}

export function getAnalysisLastModified(entry: AnalysisEntry): Date {
  return entry.data.updatedAt ?? entry.data.publishedAt;
}

export function getAnalysisLastVerified(entry: AnalysisEntry): Date {
  return new Date(Math.max(...entry.data.sources.map((source) => source.consultedAt.getTime())));
}

export function formatAnalysisDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(date);
}
