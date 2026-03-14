import React from 'react';

const Skeleton = ({ className = '', type = 'rect' }) => {
    const typeClasses = {
        rect: 'rounded-lg',
        circle: 'rounded-full',
        text: 'rounded-sm h-4 w-full',
    };

    return (
        <div className={`animate-pulse bg-slate-800/50 ${typeClasses[type] || typeClasses.rect} ${className}`}></div>
    );
};

export default Skeleton;
