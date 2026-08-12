/**
 * GbpSidebarItems — Hook que devuelve los items del sidebar con iconos y badges.
 *
 * @param {{ cliente, auditData, snapshotCount, sectorCount, automationHealth }} props
 *
 * @since gbp-ficha-redesign 2026-08-12
 */
import {
  FileText,
  BarChart3,
  Activity,
  Map,
  Settings,
  MapPin,
} from 'lucide-react';

const GbpSidebarItems = ({ snapshotCount = 0, sectorCount = 0 }) => [
  {
    id: 'resumen',
    label: 'Resumen',
    icon: FileText,
  },
  {
    id: 'auditoria',
    label: 'Auditoría',
    icon: BarChart3,
    badge: snapshotCount > 0 ? snapshotCount : null,
    badgeColor: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    id: 'actividad',
    label: 'Actividad',
    icon: Activity,
  },
  {
    id: 'sector',
    label: 'Sector',
    icon: Map,
    badge: sectorCount > 0 ? sectorCount : null,
    badgeColor: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'config',
    label: 'Config',
    icon: Settings,
  },
  {
    id: 'placeid',
    label: 'Place ID',
    icon: MapPin,
  },
];

export default GbpSidebarItems;
