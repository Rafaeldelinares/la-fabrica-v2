/**
 * Pure helper functions for ReputacionTab.
 * @fileoverview Data extraction, availability checks, and display formatting.
 */

import { fmtFechaHora } from '../../../utils/dates';

/**
 * Extracts and normalizes reputation data from the n8n response.
 *
 * @param {object} data - Raw n8n query response
 * @returns {{ score: number|null, stars: number|null, reviewCount: number|null, reviews: Array, alertState: boolean, refreshedAt: string|null, isUnavailable: boolean }}
 */
const extractReputacionData = (data) => ({
  score: data?.score ?? null,
  stars: data?.stars ?? null,
  reviewCount: data?.review_count ?? null,
  reviews: data?.reviews || [],
  alertState: data?.alert_state === true,
  refreshedAt: data?.refreshed_at ?? null,
  isUnavailable: data?.error === 'engine_unreachable' || data?.error === 'no_response',
});

/**
 * Determines whether the reputation engine is unavailable based on query state.
 *
 * @param {boolean} isError - Whether the query returned an error
 * @param {object} data - Query response data
 * @returns {boolean}
 */
const isEngineUnavailable = (isError, data) =>
  isError || data?.error === 'engine_unreachable' || data?.error === 'no_response';

/**
 * Formats a reputation score for display.
 *
 * @param {number|null} score
 * @returns {string}
 */
const formatScore = (score) => (score != null ? String(score) : '—');

/**
 * Formats star rating to one decimal place.
 *
 * @param {number|null} stars
 * @returns {string}
 */
const formatStars = (stars) => (stars != null ? stars.toFixed(1) : '—');

export { extractReputacionData, isEngineUnavailable, formatScore, formatStars, fmtFechaHora };
