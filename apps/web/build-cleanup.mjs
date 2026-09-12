export const astroIslandInlineStyle = "<style>astro-island,astro-slot,astro-static-slot{display:contents}</style>";

export function cleanupBuiltHtml(html) {
  const withoutInlineIslandStyle = html.split(astroIslandInlineStyle).join("");

  return withoutInlineIslandStyle.replace(
    /<astro-island\b[^>]*>/g,
    (tag) => tag.replace(/\suid="[^"]*"/g, ""),
  );
}
