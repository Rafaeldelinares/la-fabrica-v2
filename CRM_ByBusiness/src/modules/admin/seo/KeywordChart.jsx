import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { n8nGet } from '../../../shared/hooks/useN8n';
import { Loader } from 'lucide-react';

/**
 * KeywordChart — Position trend over time with range dropdown.
 * Y-axis inverted (position 1 at top).
 * @param {{ keywordId: number, keywordName: string }} props
 */
const KeywordChart = ({ keywordId, keywordName }) => {
  const [daysBack, setDaysBack] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['serp-positions', keywordId, daysBack],
    queryFn: () => n8nGet('crm-seo-keyword-positions', { keyword_id: keywordId, days_back: daysBack }),
    enabled: !!keywordId,
    staleTime: 5 * 60_000,
  });

  const positions = data?.positions || [];

  const chartData = positions
    .filter(p => p.position != null)
    .map(p => ({
      date: new Date(p.scraped_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
      position: p.position,
      fullDate: p.scraped_at,
    }));

  if (isLoading) {
    return (
      <div className="h-32 flex items-center justify-center text-slate-500">
        <Loader size={14} className="animate-spin" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <p className="text-[10px] text-slate-600 font-mono text-center py-4">
        Sin datos aún. El primer scrape corre en el próximo ciclo del cron.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
          {keywordName} — tendencia
        </p>
        <select value={daysBack} onChange={(e) => setDaysBack(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 rounded-sm px-2 py-0.5 text-[10px] text-slate-300 font-mono outline-none">
          <option value={7}>7 días</option>
          <option value={30}>30 días</option>
          <option value={90}>90 días</option>
          <option value={180}>180 días</option>
          <option value={365}>365 días</option>
        </select>
      </div>
      <div className="h-32 bg-slate-950 border border-slate-800 rounded-sm p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} interval="preserveStartEnd" />
            <YAxis reversed tick={{ fontSize: 9, fill: '#64748b' }} domain={[1, 'dataMax + 2']} width={28} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '10px', fontFamily: 'monospace' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value) => [`#${value}`, 'Posición']}
            />
            <ReferenceLine y={10} stroke="#10b981" strokeDasharray="2 2"
              label={{ value: 'Top 10', fontSize: 8, fill: '#10b981', position: 'right' }} />
            <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="2 2"
              label={{ value: 'Top 20', fontSize: 8, fill: '#f59e0b', position: 'right' }} />
            <Line type="monotone" dataKey="position" stroke="#D00000" strokeWidth={2} dot={{ r: 3, fill: '#D00000' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

KeywordChart.propTypes = {
  keywordId: PropTypes.number.isRequired,
  keywordName: PropTypes.string,
};

export default KeywordChart;
