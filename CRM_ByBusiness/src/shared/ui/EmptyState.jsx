import React from 'react';

const EmptyState = ({ icon: Icon, title, description, action }) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl">
            {Icon && (
                <div className="w-12 h-12 bg-slate-800/50 rounded-lg flex items-center justify-center text-slate-500 mb-4">
                    <Icon size={24} />
                </div>
            )}
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">{title}</h3>
            <p className="text-xs text-slate-500 max-w-sm font-mono mb-6">{description}</p>
            {action && <div>{action}</div>}
        </div>
    );
};

export default EmptyState;
