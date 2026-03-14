import React from 'react';

const Card = ({ children, className = '', noPadding = false }) => {
    return (
        <div className={`bg-slate-900/80 border border-slate-800 rounded-lg shadow-xl backdrop-blur-sm overflow-hidden ${noPadding ? '' : 'p-6'} ${className}`}>
            {children}
        </div>
    );
};

export default Card;
