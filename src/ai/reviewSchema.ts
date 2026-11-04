import { z } from 'zod';

export const reviewSchema = z.object({
  summary: z
    .string()
    .min(30, 'Summary must be at least 30 characters long.')
    .max(500, 'Summary must be no more than 500 characters long.')
    .describe('A concise overall assessment of the submitted project idea and readiness.'),
  strengths: z
    .array(z.string().min(5).max(200))
    .min(1)
    .max(3)
    .describe('The strongest parts of the project, such as clarity, scope, fit, or technical quality.'),
  improvements: z
    .array(z.string().min(5).max(200))
    .min(1)
    .max(3)
    .describe('The most important issues, risks, or gaps that should be fixed before final submission.'),
  nextSteps: z
    .array(z.string().min(5).max(200))
    .min(1)
    .max(4)
    .describe('Actionable steps the student should take next to improve the project outcome.'),
  readiness: z
    .enum(['ready', 'almost', 'not-yet'])
    .describe('Overall readiness of the project for submission based on the provided description.'),
});

export type Review = z.infer<typeof reviewSchema>;

export const reviewJsonSchema = z.toJSONSchema(reviewSchema);
