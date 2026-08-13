/**
 * Required environment variable validation.
 * Throws at module load time if the variable is missing or empty.
 * Enforces AD-12: no localhost fallbacks allowed.
 *
 * @param {string} name - env var name (e.g. 'VITE_N8N_URL')
 * @returns {string} the value
 * @throws {Error} if the variable is not set
 */
export function validateEnvVar(name) {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `[envValidation] Missing required env var "${name}". ` +
        `Add it to .env.local (dev) or .env.production (prod).`
    );
  }
  return value;
}

/**
 * Optional environment variable getter.
 * Returns the value if set, or a default if missing/empty.
 * Use this for env vars that are NICE TO HAVE but should not break the app.
 *
 * @param {string} name - env var name
 * @param {string} [defaultValue=null] - fallback if not set
 * @returns {string} the value or defaultValue
 */
export function getEnvVar(name, defaultValue = null) {
  const value = import.meta.env[name];
  return value && String(value).length > 0 ? value : defaultValue;
}

/**
 * Returns true if the env var is set and non-empty.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function hasEnvVar(name) {
  const value = import.meta.env[name];
  return Boolean(value && String(value).length > 0);
}
