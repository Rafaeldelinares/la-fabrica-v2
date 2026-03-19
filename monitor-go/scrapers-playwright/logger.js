/**
 * Logger estructurado mínimo — sin dependencias externas.
 * Escribe JSON en stdout (info/warn) y stderr (error).
 */
const _write = (level, msg) => {
    const line = JSON.stringify({ level, msg, time: new Date().toISOString() }) + '\n';
    if (level === 'error') process.stderr.write(line);
    else process.stdout.write(line);
};

module.exports = {
    /** Loguea un mensaje informativo en stdout como JSON estructurado. @param {string} msg */
    info:  (msg) => _write('info',  msg),
    /** Loguea una advertencia en stdout como JSON estructurado. @param {string} msg */
    warn:  (msg) => _write('warn',  msg),
    /** Loguea un error en stderr como JSON estructurado. @param {string} msg */
    error: (msg) => _write('error', msg),
};
