import { describe, it, expect } from 'vitest';

import {
  normalizeProactiveInsight,
  normalizeSecurityRecommendations,
} from '../src/lib/ai-response-guards';

describe('AI response guards', () => {
  it('treats typeName schema errors as invalid insight payloads', () => {
    const result = normalizeProactiveInsight(
      "An error occurred while generating an insight: Cannot read properties of undefined (reading 'typeName')",
    );

    expect(result.insight).toBe('');
    expect(result.error).toBeTruthy();
  });

  it('filters out error recommendations and returns a controlled error', () => {
    const result = normalizeSecurityRecommendations([
      {
        title: 'Analysis Error',
        description: "Cannot read properties of undefined (reading 'typeName')",
        level: 'Warning',
      },
    ]);

    expect(result.recommendations).toHaveLength(0);
    expect(result.error).toBeTruthy();
  });
});
