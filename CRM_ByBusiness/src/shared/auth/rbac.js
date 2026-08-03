/**
 * RBAC granular del CRM ByBusiness.
 *
 * Define los permisos disponibles y los roles con sus permisos asociados.
 * El frontend consulta `can(user, 'perm.name')` para saber si el usuario
 * puede ejecutar una acción. El backend valida por separado en n8n.
 *
 * Modelo:
 *   - Los permisos son strings snake_case legibles.
 *   - Los roles son arrays de permisos.
 *   - `admin` tiene todos los permisos (se genera automáticamente).
 *   - Los usuarios que no tengan rol caen a `operador`.
 *
 * Para extender:
 *   1. Agregar el permiso a `ALL_PERMISSIONS`.
 *   2. Asignarlo al rol correspondiente.
 *   3. Usar `can(user, 'nuevo.permiso')` en el componente.
 */

export const ALL_PERMISSIONS = [
  // Leads
  'leads.read.all',
  'leads.read.own',
  'leads.assign',
  'leads.update.status',
  'leads.delete',
  'leads.read',
  'leads.write',
  // Clientes
  'clientes.read.all',
  'clientes.read.own',
  'clientes.update',
  // Ventas
  'ventas.create',
  'ventas.read.all',
  'ventas.read.own',
  // Agenda
  'agenda.read.all',
  'agenda.read.own',
  'agenda.snapshots',
  // Reportes
  'reportes.read',
  // Auditoria
  'auditoria.read',
  // Admin
  'admin.users.manage',
  'admin.system.config',
  'admin.workflows.edit',
  // GBP
  'gbp.write',
  'gbp.read',
  // Scraper
  'scraper.read',
  // Candidatos (RRHH)
  'candidatos.read',
  // Backup
  'backup.admin',
  // Usuarios
  'usuarios.write',
];

/**
 * Mapa rol → array de permisos.
 * 'admin' se resuelve dinámicamente a todos los permisos.
 */
export const ROLE_PERMISSIONS = {
  admin: null, // sentinel: se resuelve a ALL_PERMISSIONS en runtime
  supervisor: [
    'leads.read.all',
    'clientes.read.all',
    'ventas.read.all',
    'agenda.read.all',
    'reportes.read',
    'auditoria.read',
    'gbp.read',
    'scraper.read',
    'candidatos.read',
  ],
  operador: [
    'leads.read.own',
    'leads.update.status',
    'clientes.read.own',
    'ventas.create',
    'ventas.read.own',
    'agenda.read.own',
  ],
  en_practicas: [
    'leads.read.own',
    'ventas.create',
    'agenda.read.own',
  ],
};

/**
 * Devuelve la lista efectiva de permisos para un rol.
 * 'admin' se expande a todos los permisos.
 */
export function getPermissionsForRole(rol) {
  if (!rol) return [];
  if (rol === 'admin') return [...ALL_PERMISSIONS];
  return ROLE_PERMISSIONS[rol] || [];
}

/**
 * Devuelve la lista efectiva de permisos para un usuario.
 * Cachea por referencia de user.
 */
export function getPermissionsForUser(user) {
  if (!user) return [];
  const rol = user.role || user.rol || 'operador';
  return getPermissionsForRole(rol);
}

/**
 * Chequea si un usuario tiene un permiso específico.
 * @param {Object|null|undefined} user
 * @param {string} permission
 * @returns {boolean}
 */
export function can(user, permission) {
  if (!user) return false;
  if (!permission) return false;
  const permisos = getPermissionsForUser(user);
  return permisos.includes(permission);
}

/**
 * Chequea múltiples permisos (todos requeridos).
 */
export function canAll(user, ...permissions) {
  return permissions.every(p => can(user, p));
}

/**
 * Chequea múltiples permisos (al menos uno requerido).
 */
export function canAny(user, ...permissions) {
  return permissions.some(p => can(user, p));
}
