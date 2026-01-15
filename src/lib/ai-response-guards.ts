import type { SecurityRecommendation } from './types';
import { logger } from './logger';

const RECOMMENDATION_LEVELS = new Set(['Good', 'Warning', 'Info', 'Critical']);
const DEFAULT_INSIGHT_ERROR =
  'AI insights are unavailable right now. Please try again.';
const DEFAULT_RECOMMENDATIONS_ERROR =
  'We could not generate recommendations right now. Please try again.';

// Filter out backend schema/runtime errors that sometimes leak through model/tool outputs.
const looksLikeSchemaError = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('typename') ||
    normalized.includes('cannot read properties of undefined') ||
    normalized.includes('schema') ||
    normalized.includes('analysis error')
  );
};

const isRecommendation = (value: unknown): value is SecurityRecommendation => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as SecurityRecommendation;
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    RECOMMENDATION_LEVELS.has(candidate.level)
  );
};

const normalizeSecurityRecommendations = (
  value: unknown,
): { recommendations: SecurityRecommendation[]; error: string | null } => {
  if (!Array.isArray(value)) {
    logger.warn('normalizeSecurityRecommendations: Expected array payload.', {
      payload: value,
    });
    return { recommendations: [], error: DEFAULT_RECOMMENDATIONS_ERROR };
  }

  const valid = value.filter(isRecommendation).filter((rec) => {
    return !looksLikeSchemaError(rec.title) && !looksLikeSchemaError(rec.description);
  });

  if (valid.length === 0) {
    logger.warn('normalizeSecurityRecommendations: No valid recommendations found.', {
      payload: value,
    });
    return { recommendations: [], error: DEFAULT_RECOMMENDATIONS_ERROR };
  }

  return { recommendations: valid, error: null };
};

const normalizeProactiveInsight = (
  value: unknown,
): { insight: string; error: string | null } => {
  if (typeof value !== 'string') {
    logger.warn('normalizeProactiveInsight: Expected string payload.', {
      payload: value,
    });
    return { insight: '', error: DEFAULT_INSIGHT_ERROR };
  }

  const trimmed = value.trim();
  if (!trimmed || looksLikeSchemaError(trimmed)) {
    logger.warn('normalizeProactiveInsight: Insight payload is invalid.', {
      payload: value,
    });
    return { insight: '', error: DEFAULT_INSIGHT_ERROR };
  }

  return { insight: trimmed, error: null };
};

export {
  normalizeSecurityRecommendations,
  normalizeProactiveInsight,
  DEFAULT_INSIGHT_ERROR,
  DEFAULT_RECOMMENDATIONS_ERROR,
};
