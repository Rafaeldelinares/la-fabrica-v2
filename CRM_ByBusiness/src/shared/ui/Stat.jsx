import React from 'react';

const Stat = ({ label, value, trend, icon: Icon, className = '' }) => {
    return (
        <div className={`bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col ${className}`}>
            <div className="flex justify-between items-start mb-4">
                <h4 className="uppercase tracking-wider text-[10px] font-bold text-slate-400">{label}</h4>
                {Icon && <div className="text-slate-500"><Icon size={16} /></div>}
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono text-white font-bold tracking-tight">{value}</span>
                {trend && (
                    <span className={`text-xs font-mono font-medium ${trend.startsWith('+') ? 'text-emerald-500' : trend.startsWith('-') ? 'text-rose-500' : 'text-slate-500'}`}>
                        {trend}
                    </span>
                )}
            </div>
        </div>
    );
};

export default Stat;
