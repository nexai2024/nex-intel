import { z } from 'zod';

// Enum values from Prisma schema
const DeploymentEnum = z.enum(['CLOUD', 'SELF_HOSTED', 'HYBRID']);
const PricingModelEnum = z.enum(['SUBSCRIPTION', 'USAGE_BASED', 'FREEMIUM', 'ONE_TIME', 'TIERED']);
const SalesMotionEnum = z.enum(['PRODUCT_LED', 'SALES_LED', 'ENTERPRISE', 'SELF_SERVE', 'MIXED']);

// URL validation schema
const urlSchema = z.string().url().max(2048).refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },
  { message: 'Invalid URL format' }
);

// Project creation validation schema
export const createProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be 255 characters or less')
    .transform((val) => sanitizeText(val)),
  description: z.union([
    z.string().max(5000, 'Description must be 5000 characters or less').transform((val) => sanitizeText(val)),
    z.null()
  ]).optional(),
  category: z.union([
    z.string().max(255, 'Category must be 255 characters or less').transform((val) => sanitizeText(val)),
    z.null()
  ]).optional(),
  industry: z.union([
    z.string().max(255, 'Industry must be 255 characters or less').transform((val) => sanitizeText(val)),
    z.null()
  ]).optional(),
  subIndustry: z.union([
    z.string().max(255, 'Sub-industry must be 255 characters or less').transform((val) => sanitizeText(val)),
    z.null()
  ]).optional(),
  targetSegments: z.array(z.string().max(255))
    .default([])
    .transform((arr) => arr.map(sanitizeText).filter(Boolean)),
  regions: z.array(z.string().max(100))
    .default([])
    .transform((arr) => arr.map(sanitizeText).filter(Boolean)),
  deployment: DeploymentEnum.nullable().optional(),
  pricingModel: PricingModelEnum.nullable().optional(),
  salesMotion: SalesMotionEnum.nullable().optional(),
  complianceNeeds: z.array(z.string().max(255))
    .default([])
    .transform((arr) => arr.map(sanitizeText).filter(Boolean)),
  teamId: z.string().uuid().nullable().optional(),
  inputs: z.object({
    keywords: z.array(z.string().max(255))
      .default([])
      .transform((arr) => arr.map(sanitizeText).filter(Boolean)),
    competitors: z.array(z.string().max(255))
      .default([])
      .transform((arr) => arr.map(sanitizeText).filter(Boolean)),
    platforms: z.array(z.string().max(255))
      .default([])
      .transform((arr) => arr.map(sanitizeText).filter(Boolean)),
    urls: z.array(urlSchema)
      .default([])
      .max(50, 'Maximum 50 URLs allowed'),
    problem: z.union([
      z.string().max(5000, 'Problem description must be 5000 characters or less').transform((val) => sanitizeText(val)),
      z.null()
    ]).optional(),
    solution: z.union([
      z.string().max(5000, 'Solution description must be 5000 characters or less').transform((val) => sanitizeText(val)),
      z.null()
    ]).optional(),
    priceTarget: z.union([
      z.string().max(255, 'Price target must be 255 characters or less').transform((val) => sanitizeText(val)),
      z.null()
    ]).optional(),
  }).nullable().optional(),
  features: z.array(z.string().max(255))
    .default([])
    .transform((arr) => arr.map(sanitizeText).filter(Boolean)),
}).strict(); // Strict mode prevents unknown fields

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/**
 * Sanitizes text input by removing potentially dangerous HTML/script content
 * and trimming whitespace. Server-side compatible.
 */
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Trim whitespace
  let sanitized = text.trim();
  
  // Remove HTML tags (simple regex approach for server-side)
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove script-like patterns
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '');
  
  // Decode HTML entities
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
  
  // Remove any remaining HTML entities
  sanitized = sanitized.replace(/&#?[a-zA-Z0-9]+;/g, '');
  
  return sanitized.trim();
}

/**
 * Validates and sanitizes project creation input
 */
export function validateProjectInput(data: unknown): CreateProjectInput {
  return createProjectSchema.parse(data);
}

