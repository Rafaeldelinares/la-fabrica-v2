
import React from 'react';

const Teleprompter = ({ lead, product }) => {
  const scoring = lead?.scoring || 'X';
  const price = product?.precio_base || '---';
  const productName = product?.nombre || 'este producto';

  const script = `Hola, le llamamos porque vemos que su valoración actual en Google es de ${scoring} estrellas. Nuestro objetivo es ayudarle a mejorar esa visibilidad. Actualmente el pack de ${productName} tiene un precio de ${price}€, lo que le permitiría consolidar su presencia industrial en la red.`;

  return (
    <div className="bg-slate-900/80 border-t-2 border-slate-700 p-6 font-mono text-xl leading-relaxed text-emerald-400 shadow-inner relative overflow-hidden h-full flex flex-col justify-center">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent animate-pulse"></div>
      <div className="relative z-10 whitespace-pre-wrap italic">
        "{script}"
      </div>
      <div className="mt-6 flex justify-between items-center opacity-30">
        <span className="text-xs uppercase tracking-widest text-slate-500">Auto-Prompt Active</span>
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></div>
          <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping delay-75"></div>
          <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping delay-150"></div>
        </div>
      </div>
    </div>
  );
};

export default Teleprompter;
