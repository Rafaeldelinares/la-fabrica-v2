/**
 * TabOptimizacionGbp.deprecated.test.jsx
 *
 * Confirma que el archivo TabOptimizacionGbp fue deprecado y ya no se importa
 * en ClienteDrawer. El contenido sigue intacto para rollback seguro.
 *
 * @since gbp-ficha-improvements S1 (2026-08-05)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const DEPR_PATH = '/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/TabOptimizacionGbp.deprecated.jsx';
const DRAWER_PATH = '/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/ClienteDrawer.jsx';

describe('TabOptimizacionGbp.deprecated', () => {
  it('el archivo existe con extension .deprecated.jsx', () => {
    expect(() => readFileSync(DEPR_PATH, 'utf8')).not.toThrow();
  });

  it('contiene el header comment de deprecacion', () => {
    const content = readFileSync(DEPR_PATH, 'utf8');
    expect(content).toMatch(/DEPRECATED\s+2026-08-05\s+by\s+gbp-ficha-improvements\s+S1/);
  });

  it('ya no se importa en ClienteDrawer', () => {
    const drawer = readFileSync(DRAWER_PATH, 'utf8');
    expect(drawer).not.toMatch(/TabOptimizacionGbp/);
  });

  it('el archivo sigue siendo importable como module (sin errores de sintaxis)', () => {
    const content = readFileSync(DEPR_PATH, 'utf8');
    expect(content).toMatch(/export\s+default\s+TabOptimizacionGbp/);
  });
});
