import { expect, test } from "@playwright/test";

const publishedSlug = "fuite-de-donnees-etablir-avant-de-conclure";
const nis2Slug = "nis-2-france-perimetre-obligations-preuves";
const craSlug = "cyber-resilience-act-signalements-septembre-2026";
const aiActSlug = "ai-act-2-aout-2026-transparence-preuves";
const doraSlug = "dora-sous-traitance-ict-dependances-plans-sortie";
const dataActSlug = "data-act-2026-reversibilite-cloud-delais-frais-sortie";
const postQuantumSlug = "preuves-numeriques-cryptographie-post-quantique-verification-dix-ans";
const eudiWalletSlug = "eudi-wallet-fin-2026-preuve-verification-sans-surcollecte";
const productLiabilitySlug = "responsabilite-logiciels-fin-2026-preparer-preuve-avant-litige";
const hawkSlug = "claude-hawk-256-symetrie-latticielle-factorisation-entiers";
const draftSlug = "brouillon-gabarit";

test("editorial index exposes the evidence contract and only published analyses", async ({ page }) => {
  await page.goto("/analyses");

  await expect(page.getByRole("heading", { level: 1, name: "Établir les faits avant de raconter l’attaque." })).toBeVisible();
  await expect(page.getByRole("link", {
    name: "Fuite de données : ce qu’il faut établir avant de conclure",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: "NIS 2 en France : qui est concerné et que préparer dès maintenant",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: "Cyber Resilience Act : préparer les signalements obligatoires de septembre 2026",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: "AI Act au 2 août 2026 : transparence, modèles généraux et reports à surveiller",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: "DORA 2026 : sous-traitance ICT, dépendances critiques et plans de sortie",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: "Data Act 2026 : réversibilité cloud, délais et limites du « zéro frais » en 2027",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: "Cryptographie post-quantique : préparer des preuves numériques vérifiables à dix ans",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: "EUDI Wallet fin 2026 : construire une preuve de vérification sans surcollecter",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: "Responsabilité des logiciels fin 2026 : préparer la preuve avant le litige",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("link", {
    name: "Claude et HAWK-256 : la symétrie latticielle qui a conduit au retrait de HAWK",
    exact: true,
  })).toBeVisible();
  await expect(page.getByText("Brouillon permanent", { exact: false })).toHaveCount(0);
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute(
    "href",
    "/analyses/feed.xml",
  );
});

test("software liability analysis separates legal presumptions, evidence and proportionate retention", async ({ page }) => {
  await page.goto(`/analyses/${productLiabilitySlug}`);

  await expect(page.getByRole("heading", {
    level: 1,
    name: "Responsabilité des logiciels fin 2026 : préparer la preuve avant le litige",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Le 9 décembre 2026 sépare deux régimes",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "La charge de la preuve demeure, les présomptions modifient le risque",
  })).toBeVisible();
  await expect(page.getByText("proposition opérationnelle BLACKPROOF", {
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Inconnues au 29 juillet 2026",
  })).toBeVisible();
  await expect(page.locator("figure.analysis-figure")).toHaveCount(2);
  await expect(page.locator(".source-register li")).toHaveCount(6);
  await expect(page.getByRole("link", {
    name: "directive (UE) 2024/2853 consolidée",
    exact: true,
  })).toHaveAttribute(
    "href",
    "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02024L2853-20241118",
  );

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(horizontalOverflow).toBe(false);
  }
});

test("EUDI Wallet analysis separates registered purpose, validation and minimal retention", async ({ page }) => {
  await page.goto(`/analyses/${eudiWalletSlug}`);

  await expect(page.getByRole("heading", {
    level: 1,
    name: "EUDI Wallet fin 2026 : construire une preuve de vérification sans surcollecter",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "La demande d’attributs est liée à une utilisation enregistrée",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Le journal du wallet n’est pas le reçu de la partie utilisatrice",
  })).toBeVisible();
  await expect(page.getByText("La structure suivante est une proposition opérationnelle BLACKPROOF.", {
    exact: false,
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Inconnues et limites au 27 juillet 2026",
  })).toBeVisible();
  await expect(page.locator("figure.analysis-figure")).toHaveCount(2);
  await expect(page.locator(".source-register li")).toHaveCount(11);
  await expect(page.getByRole("link", {
    name: "règlement d’exécution 2026/1730",
    exact: true,
  }).first()).toHaveAttribute(
    "href",
    "https://eur-lex.europa.eu/eli/reg_impl/2026/1730/oj/fra",
  );

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(horizontalOverflow).toBe(false);
  }
});

test("post-quantum analysis separates integrity, identity, time and preservation", async ({ page }) => {
  await page.goto(`/analyses/${postQuantumSlug}`);

  await expect(page.getByRole("heading", {
    level: 1,
    name: "Cryptographie post-quantique : préparer des preuves numériques vérifiables à dix ans",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cinq propriétés à conserver séparément" })).toBeVisible();
  await expect(page.getByText("Le protocole suivant est une proposition BLACKPROOF.", {
    exact: false,
  })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inconnues et limites" })).toBeVisible();
  await expect(page.locator("figure.analysis-figure")).toHaveCount(2);
  await expect(page.locator(".source-register li")).toHaveCount(14);
  await expect(page.getByRole("link", {
    name: "standard de signature ML-DSA FIPS 204",
    exact: true,
  }).first()).toHaveAttribute(
    "href",
    "https://csrc.nist.gov/pubs/fips/204/final",
  );

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(horizontalOverflow).toBe(false);
  }
});

test("Data Act analysis separates binding switching rules, migration costs and the pending Omnibus", async ({ page }) => {
  await page.goto(`/analyses/${dataActSlug}`);

  await expect(page.getByRole("heading", { level: 1, name: /Data Act 2026/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Synthèse exécutive" })).toBeVisible();
  await expect(page.getByText("proposition opérationnelle de BLACKPROOF", { exact: false })).toBeVisible();
  await expect(page.getByText("awaiting committee decision", { exact: false })).toBeVisible();
  await expect(page.locator("figure.analysis-figure")).toHaveCount(2);
  await expect(page.locator(".source-register li")).toHaveCount(7);
  await expect(page.getByRole("link", { name: "règlement (UE) 2023/2854", exact: true })).toHaveAttribute(
    "href",
    "https://eur-lex.europa.eu/eli/reg/2023/2854/oj/fra",
  );

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(horizontalOverflow).toBe(false);
  }
});

test("DORA analysis connects the register, subcontracting chain and tested exit", async ({ page }) => {
  await page.goto(`/analyses/${doraSlug}`);

  await expect(page.getByRole("heading", { level: 1, name: /DORA 2026/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Synthèse exécutive" })).toBeVisible();
  await expect(page.getByText("proposition opérationnelle BLACKPROOF", { exact: false })).toBeVisible();
  await expect(page.locator("figure.analysis-figure")).toHaveCount(2);
  await expect(page.locator(".source-register li")).toHaveCount(9);
  await expect(page.getByRole("link", { name: "règlement DORA", exact: true })).toHaveAttribute(
    "href",
    "https://eur-lex.europa.eu/eli/reg/2022/2554/oj/fra",
  );

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(horizontalOverflow).toBe(false);
  }
});

test("AI Act analysis separates applicable duties, adopted delays and evidence controls", async ({ page }) => {
  await page.goto(`/analyses/${aiActSlug}`);

  await expect(page.getByRole("heading", { level: 1, name: /AI Act au 2 août 2026/ })).toBeVisible();
  await expect(page.getByText("en attente de publication au Journal officiel", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Questions encore ouvertes au 20 juillet 2026" })).toBeVisible();
  await expect(page.getByText("proposition opérationnelle BLACKPROOF", { exact: false })).toBeVisible();
  await expect(page.locator("figure.analysis-figure")).toHaveCount(3);
  await expect(page.locator(".source-register li")).toHaveCount(8);
  await expect(page.getByRole("link", { name: "règlement (UE) 2024/1689", exact: false }).first()).toHaveAttribute(
    "href",
    "https://eur-lex.europa.eu/eli/reg/2024/1689/oj/fra",
  );

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(horizontalOverflow).toBe(false);
  }
});

test("CRA analysis keeps legal thresholds, current unknowns and operational evidence distinct", async ({ page }) => {
  await page.goto(`/analyses/${craSlug}`);

  await expect(page.getByRole("heading", { level: 1, name: /Cyber Resilience Act/ })).toBeVisible();
  await expect(page.getByText("à partir du 11 septembre 2026", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Incertitudes au 20 juillet 2026" })).toBeVisible();
  await expect(page.getByText("proposition opérationnelle BLACKPROOF", { exact: false })).toBeVisible();
  await expect(page.locator("figure.analysis-figure")).toHaveCount(3);
  await expect(page.locator(".source-register li")).toHaveCount(5);
  await expect(page.getByRole("link", { name: "règlement (UE) 2024/2847", exact: false }).first()).toHaveAttribute(
    "href",
    "https://eur-lex.europa.eu/eli/reg/2024/2847/oj/fra",
  );

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(horizontalOverflow).toBe(false);
  }
});

test("NIS 2 analysis distinguishes current law, pending French transposition and operational preparation", async ({ page }) => {
  await page.goto(`/analyses/${nis2Slug}`);

  await expect(page.getByRole("heading", { level: 1, name: /NIS 2 en France/ })).toBeVisible();
  await expect(page.getByText("la transposition nationale est encore en cours au 20 juillet 2026", {
    exact: false,
  })).toBeVisible();
  await expect(page.locator("figure.analysis-figure")).toHaveCount(3);
  await expect(page.locator(".source-register li")).toHaveCount(8);
  await expect(page.getByRole("link", { name: "directive (UE) 2022/2555", exact: false }).first()).toHaveAttribute(
    "href",
    "https://eur-lex.europa.eu/eli/dir/2022/2555",
  );
  await expect(page.getByText("proposition opérationnelle BLACKPROOF", { exact: false })).toBeVisible();

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(horizontalOverflow).toBe(false);
  }
});

test("published analysis keeps article metadata, sources and visual evidence explicit", async ({ page }) => {
  await page.goto(`/analyses/${publishedSlug}`);

  await expect(page.getByRole("heading", { level: 1, name: /Fuite de données/ })).toBeVisible();
  await expect(page.locator('article[itemtype="https://schema.org/Article"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
  await expect(page.locator('meta[property="article:published_time"]')).toHaveCount(1);
  await expect(page.locator("figure.analysis-figure")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Registre des sources" })).toBeVisible();
  await expect(page.locator(".source-register li")).toHaveCount(3);
  await expect(page.getByRole("link", { name: /Violations de données personnelles/ })).toHaveAttribute(
    "href",
    "https://www.cnil.fr/fr/violations-de-donnees-personnelles-les-regles-suivre",
  );

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(horizontalOverflow).toBe(false);
  }
});

test("HAWK analysis separates the recovered key, lattice symmetry and integer factorization", async ({ page }) => {
  await page.goto(`/analyses/${hawkSlug}`);

  await expect(page.getByRole("heading", {
    level: 1,
    name: "Claude et HAWK-256 : la symétrie latticielle qui a conduit au retrait de HAWK",
    exact: true,
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "HAWK signe, il ne chiffre pas",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Une symétrie transforme le problème public",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Factorisation d’entiers : une autre structure, une autre rupture",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Le rôle de Claude reste une affirmation de processus vérifiable seulement en partie",
  })).toBeVisible();
  await expect(page.locator("figure.analysis-figure")).toHaveCount(2);
  await expect(page.locator(".source-register li")).toHaveCount(13);
  await expect(page.getByRole("link", {
    name: "préprint d’Anthropic",
    exact: true,
  }).first()).toHaveAttribute(
    "href",
    "https://www.anthropic.com/document/hawk_key_recovery.pdf",
  );

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(horizontalOverflow).toBe(false);
  }
});

test("drafts stay out of routes, RSS and sitemap", async ({ request }) => {
  for (const slug of [draftSlug]) {
    const draftResponse = await request.get(`/analyses/${slug}`);
    expect(draftResponse.status()).toBe(404);
  }

  const feedResponse = await request.get("/analyses/feed.xml");
  expect(feedResponse.ok()).toBe(true);
  expect(feedResponse.headers()["content-type"]).toMatch(/^(application\/rss\+xml|text\/xml)/);
  const feed = await feedResponse.text();
  expect(feed).toContain(`/analyses/${publishedSlug}`);
  expect(feed).toContain(`/analyses/${nis2Slug}`);
  expect(feed).toContain(`/analyses/${craSlug}`);
  expect(feed).toContain(`/analyses/${aiActSlug}`);
  expect(feed).toContain(`/analyses/${doraSlug}`);
  expect(feed).toContain(`/analyses/${dataActSlug}`);
  expect(feed).toContain(`/analyses/${postQuantumSlug}`);
  expect(feed).toContain(`/analyses/${eudiWalletSlug}`);
  expect(feed).toContain(`/analyses/${productLiabilitySlug}`);
  expect(feed).toContain(`/analyses/${hawkSlug}`);
  expect(feed).not.toContain(draftSlug);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("https://blackproof.fr/analyses</loc>");
  expect(sitemap).toContain(`https://blackproof.fr/analyses/${publishedSlug}`);
  expect(sitemap).toContain(`https://blackproof.fr/analyses/${nis2Slug}`);
  expect(sitemap).toContain(`https://blackproof.fr/analyses/${craSlug}`);
  expect(sitemap).toContain(`https://blackproof.fr/analyses/${aiActSlug}`);
  expect(sitemap).toContain(`https://blackproof.fr/analyses/${doraSlug}`);
  expect(sitemap).toContain(`https://blackproof.fr/analyses/${dataActSlug}`);
  expect(sitemap).toContain(`https://blackproof.fr/analyses/${postQuantumSlug}`);
  expect(sitemap).toContain(`https://blackproof.fr/analyses/${eudiWalletSlug}`);
  expect(sitemap).toContain(`https://blackproof.fr/analyses/${productLiabilitySlug}`);
  expect(sitemap).toContain(`https://blackproof.fr/analyses/${hawkSlug}`);
  expect(sitemap).not.toContain(draftSlug);
});
