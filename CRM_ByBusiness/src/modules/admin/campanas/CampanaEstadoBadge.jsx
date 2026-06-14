import PropTypes from 'prop-types';
import Badge from '../../../shared/ui/Badge';

/**
 * Badge de estado de campaña
 */
const CampanaEstadoBadge = ({ estado, activo }) => {
  const config = {
    activa: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Activa' },
    inactiva: { bg: 'bg-slate-700/30', text: 'text-slate-500', border: 'border-slate-600/30', label: 'Inactiva' },
    pausada: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Pausada' },
    completada: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'Completada' },
  };

  const conf = config[estado] || config.inactiva;

  if (!activo) {
    return (
      <Badge className="bg-slate-800 text-slate-500 border-slate-700 line-through">
        {conf.label}
      </Badge>
    );
  }

  return (
    <Badge className={`${conf.bg} ${conf.text} ${conf.border}`}>
      {conf.label}
    </Badge>
  );
};

CampanaEstadoBadge.propTypes = {
  estado: PropTypes.string.isRequired,
  activo: PropTypes.bool,
};

export default CampanaEstadoBadge;
