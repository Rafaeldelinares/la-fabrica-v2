/**
 * Pure helper functions for ScraperConfigPanel.
 * @fileoverview Config validation, list parsing, and display formatting.
 */

/**
 * Parses a comma-separated raw input string into a list of trimmed non-empty strings.
 * Returns the current list if raw input is empty or null.
 *
 * @param {string|null} raw - Raw comma-separated input
 * @param {Array} current - Current list value
 * @returns {Array}
 */
const parseListInput = (raw, current) => {
  if (raw === null || raw === '') return current;
  const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return items.length > 0 ? items : current;
};

/**
 * Builds the updates object for the scraper config mutation.
 *
 * @param {object} local - Local edit state { depth, frequency, localities, excluded }
 * @param {object} current - Current server values { depth, frequency, localities, excluded }
 * @returns {object} Updates to send to the mutation
 */
const buildConfigUpdates = (local, current) => {
  const updates = {};
  if (local.depth !== null && local.depth !== current.depth) {
    updates.depth = Number(local.depth);
  }
  if (local.frequency !== null && local.frequency !== current.frequency) {
    updates.frequency = String(local.frequency);
  }
  if (local.localities !== null && JSON.stringify(local.localities) !== JSON.stringify(current.localities)) {
    updates.localities = local.localities;
  }
  if (local.excluded !== null && JSON.stringify(local.excluded) !== JSON.stringify(current.excluded)) {
    updates.excluded_categories = local.excluded;
  }
  return updates;
};

/**
 * Detects whether there are pending changes between local edit state and current values.
 *
 * @param {object} local - Local edit state
 * @param {object} current - Current server values
 * @returns {boolean}
 */
const hasPendingChanges = (local, current) =>
  (local.depth !== null && local.depth !== current.depth) ||
  (local.frequency !== null && local.frequency !== current.frequency) ||
  (local.localities !== null && JSON.stringify(local.localities) !== JSON.stringify(current.localities)) ||
  (local.excluded !== null && JSON.stringify(local.excluded) !== JSON.stringify(current.excluded));

export { parseListInput, buildConfigUpdates, hasPendingChanges };
