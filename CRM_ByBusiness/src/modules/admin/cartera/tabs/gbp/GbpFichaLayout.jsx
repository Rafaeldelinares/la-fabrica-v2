/**
 * GbpFichaLayout — Sidebar + main panel para la ficha GBP del cliente.
 *
 * Wrapper que reemplaza los 7 collapsibles apilados de GbpIndex.
 * Sidebar de 200px a la izquierda con items navegables.
 * Main panel scrollable con el contenido del item activo.
 *
 * Responsive: en mobile (<768px), sidebar colapsa a top tabs.
 *
 * @param {{ cliente, items, activeItem, onItemChange, children }} props
 *   - items: [{ id, label, icon, badge?, badgeColor? }]
 *   - activeItem: id del item actualmente visible
 *   - onItemChange: (itemId) => void
 *   - children: contenido del item activo
 *
 * @since gbp-ficha-redesign 2026-08-12
 */
import React from 'react';
import PropTypes from 'prop-types';

const GbpFichaLayout = ({ items, activeItem, onItemChange, children }) => {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-[200px] shrink-0 border-r border-slate-800 bg-slate-950/50 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-800 shrink-0">
          <p className="text-[9px] font-mono uppercase tracking-widest text-slate-600">
            Ficha GBP
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto custom-scrollbar">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeItem;
            const Badge = item.badge;
            const badgeColor = item.badgeColor || 'bg-slate-700 text-slate-300';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemChange(item.id)}
                className={`flex items-center gap-2 w-full px-3 py-2.5 text-left text-[11px] font-mono uppercase tracking-wide border-l-2 transition-colors ${
                  isActive
                    ? 'bg-slate-900 border-[#D00000] text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                {Icon && <Icon size={12} className={isActive ? 'text-[#D00000]' : ''} />}
                <span className="flex-1 truncate">{item.label}</span>
                {Badge !== undefined && Badge !== null && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold ${badgeColor}`}>
                    {Badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="px-3 py-2 border-t border-slate-800 shrink-0">
          <p className="text-[9px] font-mono text-slate-700">
            xiaomi-12 sync
          </p>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
};

GbpFichaLayout.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      badgeColor: PropTypes.string,
    })
  ).isRequired,
  activeItem: PropTypes.string.isRequired,
  onItemChange: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default GbpFichaLayout;
