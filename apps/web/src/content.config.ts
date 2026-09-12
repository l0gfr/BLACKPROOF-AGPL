import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const sourceSchema = z.object({
  title: z.string().min(3).max(180),
  publisher: z.string().min(2).max(80),
  url: z.url(),
  kind: z.enum([
    "Source primaire",
    "Source institutionnelle",
    "Recherche",
    "Presse de référence",
  ]),
  publicationDate: z.coerce.date().optional(),
  consultedAt: z.coerce.date(),
});

const analyses = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/analyses" }),
  schema: z.object({
    title: z.string().min(12).max(110),
    description: z.string().min(70).max(170),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    category: z.enum([
      "Fuites de données",
      "Intrusions",
      "Rançongiciels",
      "Vulnérabilités",
      "Chaîne d’approvisionnement",
      "Réglementation",
      "Méthode",
    ]),
    format: z.enum(["Analyse", "Décryptage", "Méthode"]),
    confidence: z.enum([
      "Établi",
      "Confiance élevée",
      "Confiance moyenne",
      "Incertitude forte",
    ]),
    author: z.string().min(3).max(80).default("Rédaction BLACKPROOF"),
    tags: z.array(z.string().min(2).max(40)).min(1).max(6),
    readingMinutes: z.number().int().min(1).max(45),
    featured: z.boolean().default(false),
    draft: z.boolean().default(true),
    sources: z.array(sourceSchema).min(2).max(20),
  }),
});

export const collections = { analyses };
