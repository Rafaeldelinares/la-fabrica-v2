import React from 'react';

const Badge = ({ children, status = 'default', className = '' }) => {
    const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border';

    const statusConfig = {
        pendiente: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        activo: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        error: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        default: 'bg-slate-800 text-slate-300 border-slate-700'
    };

    const selectedStatus = statusConfig[status] || statusConfig.default;

    return (
        <span className={`${baseClasses} ${selectedStatus} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
