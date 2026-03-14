import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseClasses = 'inline-flex items-center justify-center font-bold tracking-wider rounded-lg transition-all uppercase text-xs px-4 py-2';

    const variants = {
        primary: 'bg-[#D00000] hover:bg-red-800 text-white shadow-md',
        secondary: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
        ghost: 'bg-transparent hover:bg-slate-900/50 text-slate-400 hover:text-white border border-transparent hover:border-slate-800'
    };

    const selectedVariant = variants[variant] || variants.primary;

    return (
        <button className={`${baseClasses} ${selectedVariant} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default Button;
