import type { APIRoute } from "astro";
import { getPublishedAnalyses, type AnalysisEntry } from "../../../lib/analyses";
import { getAnalysisOgPath } from "../../../lib/analysis-og-path";
import { renderAnalysisOgImage } from "../../../lib/analysis-og";

// Static files only: no on-demand renderer, request parameters or remote assets.
export const prerender = true;

export async function getStaticPaths() {
  return (await getPublishedAnalyses()).map((entry) => ({
    params: { image: getAnalysisOgPath(entry).split("/").pop()!.slice(0, -4) },
    props: { entry },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as { entry: AnalysisEntry };
  const png = await renderAnalysisOgImage(entry.data);
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
