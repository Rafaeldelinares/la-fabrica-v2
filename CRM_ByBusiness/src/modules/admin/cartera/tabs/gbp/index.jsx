/**
 * tabs/gbp/index.jsx
 *
 * GBP unified tab entry point — replaces TabOptimizacionGbp and TabGbp.
 * All sub-components live in this directory (S2 implementation).
 * GGA: ≤150 LOC per sub-component file.
 *
 * RBAC: requires gbp.read (admin+supervisor). Write actions (audit, save place_id)
 * gate internally with useRbac.can('gbp.write') — no "trust the parent" pattern.
 *
 * @since gbp-ficha-improvements S1 (2026-08-05)
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useRbac } from '../../../../../shared/auth/useRbac';
import AccessDenied from '../../../../../shared/ui/AccessDenied';

/** Section collapse state defaults: Header + FichaActual open, rest collapsed */
const DEFAULT_OPEN = { header: true, fichaActual: true, audit: false, historico: false, gestion: false };

/**
 * Collapsible section wrapper.
 * @param {string} id - Section identifier
 * @param {boolean} isOpen - Whether section is expanded
 * @param {Function} onToggle - Toggle callback
 * @param {string} title - Section header label
 * @param {React.ReactNode} children - Section body
 */
function Section({ id, isOpen, onToggle, title, children }) {
  return (
    <div className="border border-slate-800 rounded-sm">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-slate-900 transition-colors"
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
          {title}
        </span>
        <span className="text-slate-600 text-xs">{isOpen ? '▾' : '▸'}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

Section.propTypes = {
  id: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
};

/**
 * GBP tab — S1 scaffold.
 * Renders 5 collapsible sections (empty placeholders until S2).
 * RBAC early-return: operador sees AccessDenied.
 */
export default function GbpIndex({ cliente }) {
  const rbac = useRbac();
  const [open, setOpen] = useState(DEFAULT_OPEN);

  if (!rbac.can('gbp.read')) {
    return <AccessDenied permission="gbp.read" />;
  }

  const toggle = (id) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex flex-col gap-3 px-3 py-4">
      <Section id="header" isOpen={open.header} onToggle={toggle} title="Header">
        {/* S2: score + cache status pill — placeholder */}
        <p className="text-[10px] text-slate-600 font-mono py-2">
          Place ID: <span className="text-slate-400">{cliente?.google_place_id || '—'}</span>
        </p>
      </Section>

      <Section id="fichaActual" isOpen={open.fichaActual} onToggle={toggle} title="Ficha actual">
        {/* S2: current audit display + top-5 gaps — placeholder */}
        <p className="text-[10px] text-slate-600 font-mono py-2">
          Sin datos — ejecute Auditar para cargar la ficha.
        </p>
      </Section>

      <Section id="audit" isOpen={open.audit} onToggle={toggle} title="Audit">
        {/* S2: run-audit mutation — placeholder */}
        <p className="text-[10px] text-slate-600 font-mono py-2">
          Sin auditoría ejecutada.
        </p>
      </Section>

      <Section id="historico" isOpen={open.historico} onToggle={toggle} title="Histórico">
        {/* S3: drift timeline — placeholder */}
        <p className="text-[10px] text-slate-600 font-mono py-2">
          Sin histórico disponible.
        </p>
      </Section>

      <Section id="gestion" isOpen={open.gestion} onToggle={toggle} title="Gestión place_id">
        {/* S2: place_id edit + save — placeholder */}
        <p className="text-[10px] text-slate-600 font-mono py-2">
          Place ID: <span className="text-slate-400">{cliente?.google_place_id || '—'}</span>
        </p>
      </Section>
    </div>
  );
}

GbpIndex.propTypes = {
  /** Cliente object from ClienteDrawer */
  cliente: PropTypes.object.isRequired,
};
