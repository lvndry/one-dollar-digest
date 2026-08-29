import { z } from "zod";

const SourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  bias: z.enum(["far-left", "left", "center", "right", "far-right"]).optional(),
  sourceStatus: z.string().optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
});

export const ArticleSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(10),
  source: z.string().min(1).optional(),
  sources: z.array(SourceSchema).min(1),
  category: z.enum(["tech", "politics", "finance"]),
  subcategory: z.string().optional().nullable(),
  bias: z
    .enum(["far-left", "left", "center", "right", "far-right"])
    .optional()
    .nullable(),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
  digestDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  readingTimeMinutes: z.number().int().positive().optional().nullable(),
  importanceScore: z.number().min(0).max(1).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  regions: z.array(z.string()).optional().nullable(),
  primaryRegion: z.string().optional().nullable(),
  strategicInterpretation: z.string().optional().nullable(),
  technicalSignificance: z.string().optional().nullable(),
  whyItMatters: z.string().optional().nullable(),
});

export const ArticleArraySchema = z.array(ArticleSchema).min(1);

export type Article = z.infer<typeof ArticleSchema>;
