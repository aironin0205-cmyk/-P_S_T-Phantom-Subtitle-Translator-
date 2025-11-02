// ===== DEVELOPMENT/DEBUG TRANSLATION SCHEMAS =====
// This file centralizes all Zod schemas for the translation feature.
// It provides a single source of truth for API request and response shapes,
// including a detailed schema for our core Blueprint data structure.

// ===== IMPORTS & DEPENDENCIES =====
import { z } from 'zod';

// --- Reusable Core Domain Schemas ---

const glossaryItemSchema = z.object({
  term: z.string(),
  proposedTranslation: z.string(),
  justification: z.string(),
});

// This is the detailed schema for the blueprint object.
// It ensures that the data we receive from the user (and from our AI agent)
// is structured correctly, preventing a major source of potential bugs.
const blueprintSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  characterProfiles: z.array(z.object({
    character: z.string(),
    style: z.string(),
  })),
  culturalAdaptations: z.array(z.object({
    original: z.string(),
    adaptation: z.string(),
  })),
  glossary: z.array(glossaryItemSchema),
});

const settingsSchema = z.object({
  tone: z.string({ required_error: 'Tone is required.' }).min(1, 'Tone cannot be empty.'),
});

// --- Route-Specific Schemas ---

// POST /api/v1/translate/blueprint
export const blueprintRequestSchema = {
  body: z.object({
    subtitleContent: z.string().min(1, 'subtitleContent cannot be empty.'),
    settings: settingsSchema,
  }),
};

// POST /api/v1/translate/execute
export const executeRequestSchema = {
  body: z.object({
    jobId: z.string().min(1, 'jobId is required.'),
    settings: settingsSchema,
    // We now validate the confirmedBlueprint against our detailed schema.
    confirmedBlueprint: blueprintSchema,
  }),
};
