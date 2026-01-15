import { describe, it, expect } from 'vitest';

import {
  parseProactiveInsightOutput,
  parseSecurityRecommendationsOutput,
} from '../src/ai/flows/ai-output-parsers';

describe('AI output parsing', () => {
  it('returns null for missing security recommendations output', () => {
    expect(parseSecurityRecommendationsOutput(undefined)).toBeNull();
    expect(parseSecurityRecommendationsOutput(null)).toBeNull();
  });

  it('returns null for missing proactive insight output', () => {
    expect(parseProactiveInsightOutput(undefined)).toBeNull();
    expect(parseProactiveInsightOutput({})).toBeNull();
  });

  it('accepts valid proactive insight output', () => {
    const parsed = parseProactiveInsightOutput({ insight: 'Wallet looks healthy.' });
    expect(parsed).toEqual({ insight: 'Wallet looks healthy.' });
  });

  it('accepts valid security recommendations output', () => {
    const parsed = parseSecurityRecommendationsOutput({
      recommendations: [
        {
          title: 'Privacy Threat Level',
          description: 'Address reuse is low and privacy risk appears minimal.',
          level: 'Good',
        },
      ],
    });
    expect(parsed?.recommendations.length).toBe(1);
  });
});
