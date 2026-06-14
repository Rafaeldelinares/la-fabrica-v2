import PropTypes from 'prop-types';

/**
 * Barra de progreso para objetivos
 */
const ProgresoBar = ({ label, porcentaje, color }) => {
  const colorClasses = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    red: 'bg-[#D00000]',
    amber: 'bg-amber-500',
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{label}</span>
        <span>{porcentaje}%</span>
      </div>
      <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${Math.min(100, porcentaje)}%` }}
        />
      </div>
    </div>
  );
};

ProgresoBar.propTypes = {
  label: PropTypes.string.isRequired,
  porcentaje: PropTypes.number.isRequired,
  color: PropTypes.oneOf(['emerald', 'blue', 'red', 'amber']).isRequired,
};

export default ProgresoBar;
