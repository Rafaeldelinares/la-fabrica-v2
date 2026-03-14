import React from 'react';

const StatusCard = ({ title, value, icon: Icon, status, subtext }) => (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-5 flex items-center justify-between relative overflow-hidden group rounded-xl hover:bg-slate-800/50 transition-all shadow-lg">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <Icon className={`w-16 h-16 ${status === 'success' ? 'text-white' : 'text-red-500'}`} />
        </div>
        <div className="relative z-10">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mb-1">{title}</p>
            <h4 className={`text-2xl font-bold font-mono tracking-tight ${status === 'success' ? 'text-white' : 'text-orange-500'}`}>{value}</h4>
             <p className="text-slate-600 text-[10px] font-mono mt-1">{subtext}</p>
        </div>
    </div>
);

export default StatusCard;
