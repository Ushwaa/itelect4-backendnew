import { GoogleGenAI } from '@google/genai';
import { reviewSchema, reviewJsonSchema, type Review } from './reviewSchema';
import { EXAMPLES, MODEL, SYSTEM_PROMPT, wrap } from './prompt';

export class GeminiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConfigurationError';
  }
}

export class GeminiQuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiQuotaExceededError';
  }
}

export class GeminiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiUnavailableError';
  }
}

export class GeminiInvalidResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiInvalidResponseError';
  }
}

function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const status = 'status' in error ? Number((error as { status?: number }).status) : undefined;
  const message = 'message' in error ? String((error as { message?: string }).message).toLowerCase() : '';

  return status === 429 || /quota|rate limit/.test(message);
}

function isUnavailableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const status = 'status' in error ? Number((error as { status?: number }).status) : undefined;
  const message = 'message' in error ? String((error as { message?: string }).message) : '';

  return status === 503 || /503|UNAVAILABLE|high demand|overload/i.test(message);
}

let client: GoogleGenAI | null = null;

export function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new GeminiConfigurationError('GEMINI_API_KEY is missing. Add it to the backend .env file before using Gemini.');
  }

  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }

  return client;
}

export function buildContents(prompt: string): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const actualUserPrompt = wrap(prompt);

  return [
    { role: 'user', parts: [{ text: EXAMPLES[0].user }] },
    { role: 'model', parts: [{ text: JSON.stringify(EXAMPLES[0].model, null, 2) }] },
    { role: 'user', parts: [{ text: EXAMPLES[1].user }] },
    { role: 'model', parts: [{ text: JSON.stringify(EXAMPLES[1].model, null, 2) }] },
    { role: 'user', parts: [{ text: actualUserPrompt }] },
  ];
}

export async function reviewProject(prompt: string): Promise<Review> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildContents(prompt),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseJsonSchema: reviewJsonSchema,
    },
  });

  if (!response.text) {
    throw new GeminiInvalidResponseError('Gemini returned an empty response.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new GeminiInvalidResponseError('Gemini returned an unusable response format.');
  }

  const validation = reviewSchema.safeParse(parsed);
  if (!validation.success) {
    throw new GeminiInvalidResponseError('Gemini returned invalid structured data.');
  }

  return validation.data;
}

export async function reviewProjectWithErrorHandling(prompt: string): Promise<Review> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await reviewProject(prompt);
    } catch (error) {
      if (error instanceof GeminiConfigurationError) throw error;

      if (isQuotaError(error) || (error instanceof Error && /429|quota|rate limit/i.test(error.message))) {
        throw new GeminiQuotaExceededError('Gemini quota exceeded. Please try again later.');
      }

      if (error instanceof GeminiInvalidResponseError) {
        throw new GeminiInvalidResponseError('Gemini returned an unusable or invalid response.');
      }

      if (isUnavailableError(error)) {
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        throw new GeminiUnavailableError(
          'Gemini is temporarily unavailable due to high demand. Please wait a minute and try again.'
        );
      }

      throw error;
    }
  }

  throw new GeminiUnavailableError('Gemini is temporarily unavailable. Please try again shortly.');
}

export { reviewSchema, reviewJsonSchema };
