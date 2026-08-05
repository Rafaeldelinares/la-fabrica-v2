import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Power, PowerOff, Trash2, Loader } from 'lucide-react';
import { n8nGet, n8nPost } from '../../../shared/hooks/useN8n';
import KeywordChart from './KeywordChart';

/**
 * KeywordsPanel — Manages organic SERP keyword tracking for a client.
 * Shows active/inactive keywords, allows add/remove/toggle.
 * @param {{ clienteId: number, bybusinessUrl: string }} props
 */
const KeywordsPanel = ({ clienteId, bybusinessUrl }) => {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['seo-keywords', clienteId],
    queryFn: () => n8nGet('crm-seo-keywords-list', { cliente_id: clienteId }),
    enabled: !!clienteId,
    staleTime: 60_000,
  });

  const addMutation = useMutation({
    mutationFn: (payload) => n8nPost('crm-seo-keywords-add', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-keywords', clienteId] });
      setAdding(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => n8nPost('crm-seo-keywords-toggle', { id, is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seo-keywords', clienteId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => n8nPost('crm-seo-keywords-delete', { id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seo-keywords', clienteId] }),
  });

  const keywords = data?.keywords || [];
  const active = keywords.filter(k => k.is_active);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
        Keywords SEO — {active.length} activas
      </p>

      {adding && (
        <AddKeywordForm
          clienteId={clienteId}
          defaultDomain={bybusinessUrl || ''}
          onSubmit={(payload) => addMutation.mutate(payload)}
          onCancel={() => setAdding(false)}
          isSubmitting={addMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="h-16 bg-slate-800/40 rounded-sm animate-pulse" />
      ) : keywords.length === 0 ? (
        <div className="px-3 py-4 border border-dashed border-slate-800 rounded-sm text-center">
          <p className="text-[10px] text-slate-600 font-mono">
            Sin keywords. Agrega una para empezar el tracking diario.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {keywords.map(kw => (
            <KeywordRow
              key={kw.id}
              kw={kw}
              isExpanded={expandedId === kw.id}
              onToggleExpand={() => setExpandedId(expandedId === kw.id ? null : kw.id)}
              onToggle={(is_active) => toggleMutation.mutate({ id: kw.id, is_active })}
              onDelete={() => {
                if (confirm(`Eliminar "${kw.keyword}"? Esto borra el histórico.`)) {
                  deleteMutation.mutate(kw.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {!adding && (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors">
          <Plus size={11} /> Agregar keyword
        </button>
      )}
    </div>
  );
};

const KeywordRow = ({ kw, isExpanded, onToggleExpand, onToggle, onDelete }) => (
  <>
    <div className={`flex items-center justify-between px-3 py-2 rounded-sm border transition-colors ${
      kw.is_active ? 'bg-slate-900 border-slate-800' : 'bg-slate-950 border-slate-800/50 opacity-60'
    }`}>
      <button onClick={onToggleExpand} className="flex-1 flex items-center gap-3 text-left min-w-0">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold text-white truncate">{kw.keyword}</span>
          {kw.target_domain && (
            <span className="text-[9px] text-slate-500 font-mono truncate">{kw.target_domain}</span>
          )}
        </div>
      </button>
      <div className="flex items-center gap-3 shrink-0">
        {kw.latest_position != null && (
          <span className={`text-[10px] font-mono font-bold ${
            kw.latest_position <= 10 ? 'text-emerald-400' :
            kw.latest_position <= 20 ? 'text-amber-400' : 'text-[#D00000]'
          }`}>
            #{kw.latest_position}
          </span>
        )}
        {kw.latest_scraped_at && (
          <span className="text-[9px] text-slate-600 font-mono">
            {new Date(kw.latest_scraped_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
          </span>
        )}
        <button onClick={() => onToggle(!kw.is_active)}
          className="p-1 text-slate-500 hover:text-white transition-colors"
          title={kw.is_active ? 'Desactivar' : 'Activar'}>
          {kw.is_active ? <Power size={11} /> : <PowerOff size={11} />}
        </button>
        <button onClick={onDelete}
          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
          title="Eliminar">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
    {isExpanded && (
      <div className="px-1 py-2">
        <KeywordChart keywordId={kw.id} keywordName={kw.keyword} />
      </div>
    )}
  </>
);

const AddKeywordForm = ({ clienteId, defaultDomain, onSubmit, onCancel, isSubmitting }) => {
  const [keyword, setKeyword] = useState('');
  const [domain, setDomain] = useState(defaultDomain);

  const submit = (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    onSubmit({ cliente_id: clienteId, keyword: keyword.trim(), target_domain: domain.trim() || null });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 p-3 bg-slate-950 border border-slate-800 rounded-sm">
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="Keyword (ej: dentista valencia)"
        className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-xs text-white font-mono outline-none focus:border-blue-500"
        autoFocus
      />
      <input
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="Dominio target (opcional)"
        className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-[10px] text-slate-300 font-mono outline-none focus:border-blue-500"
      />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-3 py-1 text-[10px] text-slate-400 uppercase tracking-widest">Cancelar</button>
        <button type="submit" disabled={isSubmitting || !keyword.trim()}
          className="px-3 py-1 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-500 rounded-sm uppercase tracking-widest disabled:opacity-50">
          {isSubmitting ? '...' : 'Agregar'}
        </button>
      </div>
    </form>
  );
};

KeywordsPanel.propTypes = {
  clienteId: PropTypes.number.isRequired,
  bybusinessUrl: PropTypes.string,
};

KeywordRow.propTypes = {
  kw: PropTypes.object.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggleExpand: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

AddKeywordForm.propTypes = {
  clienteId: PropTypes.number.isRequired,
  defaultDomain: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
};

export default KeywordsPanel;
