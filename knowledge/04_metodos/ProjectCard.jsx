import React from 'react';

const ProjectCard = ({ title, description, status, loading }) => {
  return (
    <div className="bg-slate-900/90 backdrop-blur rounded-sm border border-slate-800 p-4">
      {loading ? (
        <div className="animate-pulse flex items-center justify-center h-full">
          <div className="w-full h-full bg-slate-700"></div>
        </div>
      ) : (
        <>
          <h3 className="text-white font-inter">{title}</h3>
          <p className="text-slate-400 text-sm">{description}</p>
          <div className="mt-4 flex gap-2">
            <span
              className={`px-2 py-1 ${
                status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : status === 'error'
                    ? 'bg-red-500/20 text-red-400'
                    : ''
              } rounded-sm text-xs`}
            >
              {status}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectCard;
