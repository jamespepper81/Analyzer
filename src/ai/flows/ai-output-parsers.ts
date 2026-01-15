import { z } from '@genkit-ai/core';

const RecommendationSchema = z.object({
  title: z.string().describe('A short, clear title for the recommendation.'),
  description: z
    .string()
    .describe(
      'A concise (2-3 sentences) explanation of the recommendation, its importance, and what the user should do.',
    ),
  level: z
    .enum(['Good', 'Warning', 'Info', 'Critical'])
    .describe(
      "The severity or type of recommendation. 'Critical' for severe risks. 'Warning' for medium risks. 'Good' for positive findings. 'Info' for general advice.",
    ),
});

const SecurityRecommendationsOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).describe('An array of security recommendations.'),
});

const ProactiveInsightOutputSchema = z.object({
  insight: z
    .string()
    .describe(
      "A single, concise, and interesting insight about the user's wallet. It must not start with a greeting like 'Hello' or 'Welcome back'.",
    ),
});

type SecurityRecommendationsOutput = z.infer<typeof SecurityRecommendationsOutputSchema>;
type ProactiveInsightOutput = z.infer<typeof ProactiveInsightOutputSchema>;

const parseSecurityRecommendationsOutput = (
  value: unknown,
): SecurityRecommendationsOutput | null => {
  const parsed = SecurityRecommendationsOutputSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  if (!parsed.data.recommendations.length) {
    return null;
  }

  return parsed.data;
};

const parseProactiveInsightOutput = (
  value: unknown,
): ProactiveInsightOutput | null => {
  const parsed = ProactiveInsightOutputSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  const insight = parsed.data.insight.trim();
  if (!insight) {
    return null;
  }

  return { insight };
};

export {
  RecommendationSchema,
  SecurityRecommendationsOutputSchema,
  ProactiveInsightOutputSchema,
  parseSecurityRecommendationsOutput,
  parseProactiveInsightOutput,
};

export type { SecurityRecommendationsOutput, ProactiveInsightOutput };
