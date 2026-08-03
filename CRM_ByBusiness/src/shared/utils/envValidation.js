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
