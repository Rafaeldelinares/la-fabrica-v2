import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { MapPin, Tag, BarChart3, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import { useTrainingScope } from '../../../shared/hooks/useTrainingScope';

const N8N = import.meta.env.VITE_N8N_URL;

/**
 * Panel de Análisis de Campañas - Análisis detallado por localidad, categoría y dashboard.
 * @param {Object} props
 * @param {Function} props.onCerrar - Callback al cerrar el panel
 * @param {Function} props.onCrearCampana - Callback al crear una campaña
 */

const TABS = [
  { id: 'localidad', label: 'Por Localidad', icon: MapPin },
  { id: 'categoria', label: 'Por Categoría', icon: Tag },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
];

const COMUNIDADES_AUTONOMAS = {
  'Madrid': ['Madrid'],
  'Cataluña': ['Barcelona', 'Gerona', 'Lérida', 'Tarragona'],
  'Andalucía': ['Sevilla', 'Málaga', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Almería'],
  'Comunidad Valenciana': ['Valencia', 'Alicante', 'Castellón'],
  'Galicia': ['La Coruña', 'Lugo', 'Orense', 'Pontevedra'],
  'País Vasco': ['Álava', 'Guipúzcoa', 'Vizcaya'],
  'Castilla y León': ['Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'],
  'Castilla-La Mancha': ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'],
  'Canarias': ['Las Palmas', 'Santa Cruz de Tenerife'],
  'Murcia': ['Murcia'],
  'Aragón': ['Huesca', 'Teruel', 'Zaragoza'],
  'Extremadura': ['Badajoz', 'Cáceres'],
  'Baleares': ['Baleares'],
  'Asturias': ['Asturias'],
  'Navarra': ['Navarra'],
  'Cantabria': ['Cantabria'],
  'La Rioja': ['La Rioja'],
};

const FAMILIAS_CATEGORIAS = {
  'Hostelería y Restauración': [
    'Restaurante', 'Bar restaurante', 'Bar de tapas', 'Cafetería', 'Bar', 'Taberna', 'Coctelería',
    'Restaurante mediterráneo', 'Restaurante de cocina española', 'Restaurante gallego', 'Restaurante vasco',
    'Restaurante argentino', 'Restaurante indio', 'Restaurante venezolano', 'Restaurante de brunch',
    'Restaurante de comida saludable', 'Restaurante de desayunos', 'Restaurante familiar', 'Restaurante vegano',
    'Hamburguesería', 'Panadería', 'Pastelería', 'Tienda de café', 'Tienda de té', 'Pub', 'Pub irlandés',
    'Marisquería', 'Cervecería', 'Bar musical', 'Restaurante especializado en tapas'
  ],
  'Belleza y Bienestar': [
    'Centro de estética', 'Peluquería', 'Salón de manicura y pedicura', 'Spa', 'Spa terapéutico',
    'Masajista', 'Masajista deportivo', 'Masajista tailandés', 'Centro de depilación láser',
    'Esteticista', 'Esteticista facial', 'Centro de salud y bienestar', 'Tienda de belleza y salud'
  ],
  'Educación y Formación': [
    'Academia de idiomas', 'Academia de inglés', 'Academia de alemán', 'Academia de informática',
    'Centro de formación', 'Centro de formación profesional', 'Centro de refuerzo escolar',
    'Centro de estudios', 'Centro educativo', 'Escuela', 'Escuela de educación para adultos',
    'Institución educativa', 'Universidad', 'Servicio de clases particulares', 'Planificador financiero',
    'Programa de actividades extraescolares', 'Curs de cuina'
  ],
  'Automoción': [
    'Taller de reparación de automóviles', 'Taller de automóviles', 'Taller mecánico',
    'Tienda de repuestos para automóviles', 'Tienda de neumáticos', 'Tienda de baterías para automóvil',
    'Tienda de piezas de automóvil', 'Tienda de accesorios para automóviles', 'Tienda de automovilismo',
    'Concesionario de automóviles', 'Concesionario Ford', 'Taller de reparación de vehículos todoterreno',
    'Tienda de repuestos para coches de carreras'
  ],
  'Servicios Profesionales': [
    'Consultora de administración empresarial', 'Consultoría de recursos humanos', 'Consultora financiera',
    'Asesor fiscal', 'Asesor', 'Asesoría laboral', 'Gestoría', 'Empresa de contabilidad', 'Auditor/a',
    'Consultor/a econòmic/a', 'Abogado', 'Servicios legales',
    'Empresa de trabajo temporal', 'Asesor educativo', 'Investigador de mercado', 'Editorial'
  ],
  'Inmobiliaria y Espacios': [
    'Espacio de coworking', 'Centro de negocios', 'Agencia de alquiler de espacios para oficinas',
    'Oficinas de empresa', 'Inmobiliaria', 'Edificio de apartamentos amueblados', 'Recinto para eventos',
    'Salón para eventos', 'Organizador de eventos', 'Empresa de organización de eventos'
  ],
  'Limpieza y Mantenimiento': [
    'Servicios de limpieza', 'Servicio de limpieza', 'Servicio de limpieza doméstica',
    'Servicio de limpieza de tapicería', 'Fontanero', 'Servicio de saneamiento',
    'Servicio de sistemas sépticos', 'Servicio de gestión de aguas residuales',
    'Servicio de limpieza de canalones', 'Reformas', 'Electricista', 'Pintor',
    'Empresa de climatización', 'Contratista de aire acondicionado', 'Persona de mantenimiento',
    'Manteniment de propietats', 'Contratista general', 'Constructor', 'Empresa constructora'
  ],
  'Comercio': [
    'Tienda de ropa', 'Tienda de ropa de segunda mano', 'Tienda de ropa vintage', 'Tienda de ropa de mujer',
    'Tienda de ropa de tallas grandes', 'Tienda de segunda mano', 'Tienda de artículos de segunda mano',
    'Tienda de artículos de fontanería', 'Boutique', 'Outlet', 'Mayorista textil', 'Supermercado', 'Mercado',
    'Tienda de cosméticos', 'Centro comercial'
  ],
  'Otros': []
};

const CampanasAnalisisPanel = ({ onCrearCampana }) => {
  const { getFilterValue } = useTrainingScope();
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [segmentos, setSegmentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [resumen, setResumen] = useState(null);

  const [nivelLocalidad, setNivelLocalidad] = useState(null);
  const [nivelCategoria, setNivelCategoria] = useState(null);

  const [paginaLocalidad, setPaginaLocalidad] = useState(0);
  const [paginaCategoria, setPaginaCategoria] = useState(0);

  const [selectedItems, setSelectedItems] = useState([]);
  
  const ITEMS_POR_PAGINA = 10;

  const toggleSelection = (item, type) => {
    setSelectedItems(prev => {
      const key = `${type}-${item.nombre || item.provincia || item.categoria}`;
      const exists = prev.find(s => s.key === key);
      if (exists) {
        return prev.filter(s => s.key !== key);
      }
      return [...prev, { key, type, ...item }];
    });
  };

  const isSelected = (item, type) => {
    const key = `${type}-${item.nombre || item.provincia || item.categoria}`;
    return selectedItems.some(s => s.key === key);
  };

  const getTotalesSeleccion = () => {
    return selectedItems.reduce((acc, item) => ({
      total: acc.total + (item.total || item.total_leads || 0),
      libres: acc.libres + (item.disponibles || item.total_disponibles || 0),
      ocupados: acc.ocupados + (item.asignados || item.total_asignados || 0)
    }), { total: 0, libres: 0, ocupados: 0 });
  };

  const getCampanasEnConflicto = () => {
    const campanasMap = new Map();
    selectedItems.forEach(item => {
      const campanas = item.campanas_con_leads || [];
      campanas.forEach(c => {
        if (!campanasMap.has(c.campana_id)) {
          campanasMap.set(c.campana_id, c);
        }
      });
    });
    return Array.from(campanasMap.values());
  };

  const clearSelection = () => setSelectedItems([]);

  const handleCrearCampana = () => {
    if (selectedItems.length === 0) {
      alert('Selecciona al menos un elemento para crear una campaña');
      return;
    }

    const totales = getTotalesSeleccion();
    const campanasConflicto = getCampanasEnConflicto();

    if (onCrearCampana) {
      onCrearCampana({
        items: selectedItems,
        totales,
        campanasConflicto,
        filtros: {
          provincias: selectedItems.filter(i => i.type === 'provincia' || i.type === 'comunidad').map(i => i.provincia || i.nombre),
          categorias: selectedItems.filter(i => i.type === 'categoria' || i.type === 'familia').map(i => i.categoria || i.nombre)
        }
      });
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      // Nuevo endpoint unificado con modo analisis
      const analisisRes = await fetch(`${N8N}/webhook/crm-analisis-campanas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'analisis',
          es_simulacion: getFilterValue()
        })
      });

      if (!analisisRes.ok) throw new Error(`HTTP ${analisisRes.status}`);

      const analisisData = await analisisRes.json();

      if (analisisData.ok && analisisData.modo === 'analisis') {
        setSegmentos(analisisData.segmentos || []);
        setResumen(analisisData.resumen || null);

        // Convertir segmentos al formato esperado por el componente
        const provs = {};
        const cats = {};

        analisisData.segmentos?.forEach(seg => {
          // Agrupar por provincia
          if (!provs[seg.nombre]) {
            provs[seg.nombre] = {
              provincia: seg.nombre,
              total_leads: 0,
              total_disponibles: 0,
              total_asignados: 0,
              localidades: [],
              campanas_con_leads: []
            };
          }
          provs[seg.nombre].total_leads += seg.total_leads || 0;
          provs[seg.nombre].total_disponibles += seg.libres || 0;
          provs[seg.nombre].total_asignados += seg.ocupados || 0;

          // Agregar categoría como localidad para mantener compatibilidad
          if (seg.subtipo) {
            provs[seg.nombre].localidades.push({
              localidad: seg.subtipo,
              total_leads: seg.total_leads || 0,
              total_disponibles: seg.libres || 0,
              total_asignados: seg.ocupados || 0,
              campanas_con_leads: seg.campanas_con_leads || []
            });
          }

          // Agregar campanas en conflicto
          if (seg.campanas_con_leads?.length > 0) {
            seg.campanas_con_leads.forEach(c => {
              if (!provs[seg.nombre].campanas_con_leads.find(existing => existing.campana_id === c.campana_id)) {
                provs[seg.nombre].campanas_con_leads.push(c);
              }
            });
          }

          // Agrupar por categoría
          if (seg.subtipo) {
            if (!cats[seg.subtipo]) {
              cats[seg.subtipo] = {
                categoria: seg.subtipo,
                total_leads: 0,
                total_disponibles: 0,
                total_asignados: 0,
                provincias: [],
                campanas_con_leads: []
              };
            }
            cats[seg.subtipo].total_leads += seg.total_leads || 0;
            cats[seg.subtipo].total_disponibles += seg.libres || 0;
            cats[seg.subtipo].total_asignados += seg.ocupados || 0;
            cats[seg.subtipo].provincias.push({
              provincia: seg.nombre,
              total: seg.total_leads || 0,
              disponibles: seg.libres || 0,
              asignados: seg.ocupados || 0
            });
          }
        });

        setProvincias(Object.values(provs));
        setCategorias(Object.values(cats));

        // Dashboard
        setDashboard({
          total_leads: analisisData.resumen?.total_leads || 0,
          leads_sin_campana: analisisData.resumen?.total_libres || 0,
          leads_asignados: analisisData.resumen?.total_ocupados || 0,
          provincias_distintas: Object.keys(provs).length,
          categorias_distintas: Object.keys(cats).length,
          campanas_activas: 0 // Se calculará desde segmentos
        });
      } else {
        setError('Error al cargar datos de análisis');
      }
    } catch (err) {
      setError(`Error de conexión: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtiene las clases de badge según el conteo.
   * Usa clases completas estáticas para evitar problemas con Tailwind JIT.
   * @param {number} count - Cantidad para determinar el color
   * @returns {string} - Clases CSS completas para el Badge
   */
  const getBadgeClasses = (count) => {
    if (count >= 300) return 'bg-emerald-900/30 text-emerald-400 border-emerald-800';
    if (count >= 100) return 'bg-amber-900/30 text-amber-400 border-amber-800';
    return 'bg-red-900/30 text-red-400 border-red-800';
  };

  const getComunidadForProvincia = (provinciaNombre) => {
    for (const [comunidad, provinciasList] of Object.entries(COMUNIDADES_AUTONOMAS)) {
      if (provinciasList.some(p => provinciaNombre.toLowerCase().includes(p.toLowerCase()))) {
        return comunidad;
      }
    }
    return 'Otras';
  };

  const getFamiliaForCategoria = (categoriaNombre) => {
    if (!categoriaNombre) return 'Otros';
    for (const [familia, categoriasList] of Object.entries(FAMILIAS_CATEGORIAS)) {
      if (categoriasList.some(c => categoriaNombre.toLowerCase().includes(c.toLowerCase()))) {
        return familia;
      }
    }
    return 'Otros';
  };

  const agruparPorComunidad = () => {
    const grupos = {};
    provincias.forEach(prov => {
      const comunidad = getComunidadForProvincia(prov.provincia);
      if (!grupos[comunidad]) {
        grupos[comunidad] = { nombre: comunidad, provincias: [], total: 0, disponibles: 0, asignados: 0, campanas_con_leads: [] };
      }
      grupos[comunidad].provincias.push(prov);
      grupos[comunidad].total += prov.total_leads || 0;
      grupos[comunidad].disponibles += prov.total_disponibles || 0;
      grupos[comunidad].asignados += prov.total_asignados || 0;

      // Agregar campanas en conflicto
      if (prov.campanas_con_leads?.length > 0) {
        prov.campanas_con_leads.forEach(c => {
          if (!grupos[comunidad].campanas_con_leads.find(existing => existing.campana_id === c.campana_id)) {
            grupos[comunidad].campanas_con_leads.push(c);
          }
        });
      }
    });
    return Object.values(grupos).sort((a, b) => b.total - a.total);
  };

  const agruparPorFamilia = () => {
    const grupos = {};
    categorias.forEach(cat => {
      const familia = getFamiliaForCategoria(cat.categoria);
      if (!grupos[familia]) {
        grupos[familia] = { nombre: familia, categorias: [], total: 0, disponibles: 0, asignados: 0, campanas_con_leads: [] };
      }
      grupos[familia].categorias.push(cat);
      grupos[familia].total += cat.total_leads || 0;
      grupos[familia].disponibles += cat.total_disponibles || 0;
      grupos[familia].asignados += cat.total_asignados || 0;

      // Agregar campanas en conflicto
      if (cat.campanas_con_leads?.length > 0) {
        cat.campanas_con_leads.forEach(c => {
          if (!grupos[familia].campanas_con_leads.find(existing => existing.campana_id === c.campana_id)) {
            grupos[familia].campanas_con_leads.push(c);
          }
        });
      }
    });
    return Object.values(grupos).sort((a, b) => b.total - a.total);
  };

  const renderDashboard = () => {
    if (!dashboard) return null;
    const m = dashboard;
    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-3xl font-black text-white">{m.total_leads?.toLocaleString('es-ES') || 0}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Total Leads</div>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-3xl font-black text-emerald-400">{m.campanas_activas || 0}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Campañas Activas</div>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-3xl font-black text-blue-400">{m.categorias_distintas || 0}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Categorías</div>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-3xl font-black text-amber-400">{m.leads_sin_campana?.toLocaleString('es-ES') || 0}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Sin Campaña</div>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-3xl font-black text-slate-300">{m.leads_asignados?.toLocaleString('es-ES') || 0}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Asignados</div>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-3xl font-black text-slate-300">{m.provincias_distintas || 0}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Provincias</div>
        </Card>
      </div>
    );
  };

  const renderLocalidad = () => {
    if (nivelLocalidad?.provincia) {
      const prov = provincias.find(p => p.provincia === nivelLocalidad.provincia);
      if (!prov) return null;
      const maxLocal = Math.max(...(prov.localidades?.map(l => l.total_leads || 0) || [1]));
      return (
        <>
          <button
            onClick={() => setNivelLocalidad(null)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium uppercase tracking-wider"
          >
            <ChevronLeft size={14} />
            Volver a Comunidades
          </button>
          <div className="grid grid-cols-5 gap-4">
            {prov.localidades?.sort((a, b) => (b.total_leads || 0) - (a.total_leads || 0)).slice(0, 10).map(loc => {
              const porcentaje = maxLocal > 0 ? ((loc.total_leads || 0) / maxLocal) * 100 : 0;
              return (
                <Card key={loc.localidad} className="bg-slate-900 border-slate-800">
                  <div className="bg-slate-800/50 px-3 py-2 border-b border-slate-700">
                    <div className="text-xs font-bold text-white truncate">{loc.localidad}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1">
                      {loc.total_leads?.toLocaleString('es-ES') || 0} leads • {loc.total_asignados || 0} asig.
                    </div>
                  </div>
                  <div className="px-3 py-2 max-h-48 overflow-y-auto">
                    {loc.categorias?.slice(0, 10).map(cat => {
                      const pct = (loc.total_leads || 0) > 0 ? ((cat.total || 0) / loc.total_leads) * 100 : 0;
                      return (
                        <div key={cat.categoria || 'sin-cat'} className="mb-2 last:mb-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[9px] text-slate-300 truncate flex-1">{cat.categoria || 'Sin categoría'}</div>
                            <div className="text-[8px] text-slate-500 font-mono">{cat.total}</div>
                          </div>
                          {/* CSS custom property: Tailwind no soporta anchos dinámicos de runtime */}
                          <div className="h-1 bg-slate-800 rounded-sm overflow-hidden">
                            <div style={{ '--pct': `${pct}%` }} className="h-full bg-emerald-500/60 [width:var(--pct)]" />
                          </div>
                        </div>
                      );
                    })}
                    {loc.categorias?.length > 10 && (
                      <div className="text-[8px] text-slate-500 text-center mt-2">
                        +{loc.categorias.length - 10} más
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      );
    }

    if (nivelLocalidad?.comunidad) {
      const comunidades = agruparPorComunidad();
      const comunidad = comunidades.find(c => c.nombre === nivelLocalidad.comunidad);
      if (!comunidad) return null;
      const maxProv = Math.max(...comunidad.provincias.map(p => p.total_leads || 0), 1);
      const totalPaginas = Math.ceil(comunidad.provincias.length / ITEMS_POR_PAGINA);
      const inicio = 0;
      const fin = ITEMS_POR_PAGINA;
      const provinciasVisibles = comunidad.provincias.sort((a, b) => (b.total_leads || 0) - (a.total_leads || 0)).slice(inicio, fin);
      
      return (
        <>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setNivelLocalidad(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium uppercase tracking-wider"
            >
              <ChevronLeft size={14} />
              Volver a Comunidades
            </button>
            <div className="text-[10px] text-slate-500 font-mono">
              Mostrando {provinciasVisibles.length} de {comunidad.provincias.length} provincias
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {provinciasVisibles.map(prov => {
              const porcentaje = ((prov.total_leads || 0) / maxProv) * 100;
              const isProvSelected = isSelected(prov, 'provincia');
              return (
                <Card 
                  key={prov.provincia} 
                  className="bg-slate-900 border-slate-800 transition-colors relative"
                >
                  <div className="bg-slate-800/50 px-3 py-2 border-b border-slate-700">
                    <div className="flex items-center justify-between">
                      <input
                        type="checkbox"
                        checked={isProvSelected}
                        onChange={() => toggleSelection(prov, 'provincia')}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3 h-3 rounded border-slate-600 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <h3
                        className="text-xs font-bold text-white truncate cursor-pointer hover:text-emerald-400 transition-colors flex-1 ml-2"
                        onClick={() => setNivelLocalidad({ provincia: prov.provincia })}
                      >
                        {prov.provincia}
                      </h3>
                    </div>
                    <div className="text-[9px] font-mono mt-1">
                      <span className="text-slate-500">{prov.total_leads?.toLocaleString('es-ES') || 0} leads</span>
                      <span className="text-emerald-400 ml-2">• {prov.total_disponibles?.toLocaleString('es-ES') || 0} libres</span>
                      {prov.total_asignados > 0 && (
                        <span className="text-slate-400 ml-2">• {prov.total_asignados.toLocaleString('es-ES')} ocup.</span>
                      )}
                      <span className="text-slate-500 ml-2">• {prov.localidades?.length || 0} cat.</span>
                    </div>
                  </div>
                  <div className="px-3 py-3">
                    {/* CSS custom property: Tailwind no soporta anchos dinámicos de runtime */}
                    <div className="h-2 bg-slate-800 rounded-sm overflow-hidden mb-2">
                      <div style={{ '--w': `${porcentaje}%` }} className="h-full bg-emerald-500/60 [width:var(--w)]" />
                    </div>
                    <div className="text-[8px] text-slate-500 cursor-pointer hover:text-emerald-400" onClick={() => setNivelLocalidad({ provincia: prov.provincia })}>
                      Click para ver localidades →
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      );
    }

    const grupos = agruparPorComunidad();
    const totalPaginas = Math.ceil(grupos.length / ITEMS_POR_PAGINA);
    const inicio = paginaLocalidad * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    const gruposVisibles = grupos.slice(inicio, fin);
    
    return (
      <>
        <div className="grid grid-cols-5 gap-4">
          {gruposVisibles.map(grupo => {
            const maxProv = Math.max(...grupo.provincias.map(p => p.total_leads || 0), 1);
            const isItemSelected = isSelected(grupo, 'comunidad');
            return (
              <Card 
                key={grupo.nombre} 
                className="bg-slate-900 border-slate-800 transition-colors relative"
              >
                <div className="bg-slate-800/50 px-3 py-2 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <input
                      type="checkbox"
                      checked={isItemSelected}
                      onChange={() => toggleSelection(grupo, 'comunidad')}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3 h-3 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <h3
                      className="text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:text-blue-400 transition-colors flex-1 ml-2"
                      onClick={() => { setNivelLocalidad({ comunidad: grupo.nombre }); setPaginaLocalidad(0); }}
                    >
                      {grupo.nombre}
                    </h3>
                    <Badge className={getBadgeClasses(grupo.total)}>
                      {grupo.total.toLocaleString('es-ES')}
                    </Badge>
                  </div>
                  <div className="text-[9px] font-mono mt-1 flex items-center gap-2">
                    <span className="text-slate-500">{grupo.provincias.length} provincias</span>
                    <span className="text-emerald-400">• {grupo.disponibles.toLocaleString('es-ES')} libres</span>
                    {grupo.asignados > 0 && (
                      <span className="text-slate-400">• {grupo.asignados.toLocaleString('es-ES')} ocup.</span>
                    )}
                  </div>
                </div>
                <div className="px-3 py-2">
                  {grupo.provincias.slice(0, 5).map(prov => {
                    const porcentaje = ((prov.total_leads || 0) / maxProv) * 100;
                    return (
                      <div key={prov.provincia} className="mb-2 last:mb-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] text-slate-300 truncate flex-1">{prov.provincia}</div>
                          <div className="text-[9px] text-slate-500 font-mono">{prov.total_leads?.toLocaleString('es-ES') || 0}</div>
                        </div>
                        {/* CSS custom property: Tailwind no soporta anchos dinámicos de runtime */}
                        <div className="h-1.5 bg-slate-800 rounded-sm overflow-hidden">
                          <div style={{ '--w': `${porcentaje}%` }} className="h-full bg-emerald-500/60 [width:var(--w)]" />
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-[8px] text-slate-500 mt-2 text-center cursor-pointer hover:text-blue-400" onClick={() => { setNivelLocalidad({ comunidad: grupo.nombre }); setPaginaLocalidad(0); }}>
                    Click para ver detalle →
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        
        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setPaginaLocalidad(Math.max(0, paginaLocalidad - 1))}
              disabled={paginaLocalidad === 0}
              className="p-2 rounded-sm bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-xs text-slate-400 font-mono">
              Página {paginaLocalidad + 1} de {totalPaginas}
            </div>
            <button
              onClick={() => setPaginaLocalidad(Math.min(totalPaginas - 1, paginaLocalidad + 1))}
              disabled={paginaLocalidad >= totalPaginas - 1}
              className="p-2 rounded-sm bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </>
    );
  };

  const renderCategoria = () => {
    if (nivelCategoria?.categoria) {
      const cat = categorias.find(c => c.categoria === nivelCategoria.categoria);
      if (!cat) return null;
      const maxProv = Math.max(...(cat.provincias?.map(p => p.total || 0) || [1]));
      const totalPaginas = Math.ceil((cat.provincias?.length || 0) / ITEMS_POR_PAGINA);
      const provinciasVisibles = cat.provincias?.sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 10) || [];
      
      return (
        <>
          <button
            onClick={() => setNivelCategoria(null)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium uppercase tracking-wider"
          >
            <ChevronLeft size={14} />
            Volver a Familias
          </button>
          <div className="grid grid-cols-5 gap-4">
            {provinciasVisibles.map(p => {
              const porcentaje = maxProv > 0 ? ((p.total || 0) / maxProv) * 100 : 0;
              return (
                <Card key={p.provincia} className="bg-slate-900 border-slate-800">
                  <div className="bg-slate-800/50 px-3 py-2 border-b border-slate-700">
                    <div className="text-xs font-bold text-white truncate">{p.provincia}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1">
                      {p.total?.toLocaleString('es-ES') || 0} leads • {p.asignados || 0} asig.
                    </div>
                  </div>
                  <div className="px-3 py-3">
                    {/* CSS custom property: Tailwind no soporta anchos dinámicos de runtime */}
                    <div className="h-2 bg-slate-800 rounded-sm overflow-hidden">
                      <div style={{ '--w': `${porcentaje}%` }} className="h-full bg-amber-500/60 [width:var(--w)]" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      );
    }

    if (nivelCategoria?.familia) {
      const familias = agruparPorFamilia();
      const familia = familias.find(f => f.nombre === nivelCategoria.familia);
      if (!familia) return null;
      const maxCat = Math.max(...familia.categorias.map(c => c.total_leads || 0), 1);
      const totalPaginas = Math.ceil(familia.categorias.length / ITEMS_POR_PAGINA);
      const categoriasVisibles = familia.categorias.sort((a, b) => (b.total_leads || 0) - (a.total_leads || 0)).slice(0, 10);
      
      return (
        <>
          <button
            onClick={() => setNivelCategoria(null)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium uppercase tracking-wider"
          >
            <ChevronLeft size={14} />
            Volver a Familias
          </button>
          <div className="grid grid-cols-5 gap-4">
            {categoriasVisibles.map(cat => {
              const porcentaje = ((cat.total_leads || 0) / maxCat) * 100;
              const isCatSelected = isSelected(cat, 'categoria');
              return (
                <Card 
                  key={cat.categoria || 'sin-cat'} 
                  className="bg-slate-900 border-slate-800 transition-colors relative"
                >
                  <div className="bg-slate-800/50 px-3 py-2 border-b border-slate-700">
                    <div className="flex items-center justify-between">
                      <input
                        type="checkbox"
                        checked={isCatSelected}
                        onChange={() => toggleSelection(cat, 'categoria')}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3 h-3 rounded border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <h3
                        className="text-xs font-bold text-white truncate cursor-pointer hover:text-amber-400 transition-colors flex-1 ml-2"
                        onClick={() => setNivelCategoria({ categoria: cat.categoria })}
                      >
                        {cat.categoria || 'Sin categoría'}
                      </h3>
                    </div>
                    <div className="text-[9px] font-mono mt-1">
                      <span className="text-slate-500">{cat.total_leads?.toLocaleString('es-ES') || 0} leads</span>
                      <span className="text-emerald-400 ml-2">• {cat.total_disponibles?.toLocaleString('es-ES') || 0} libres</span>
                      {cat.total_asignados > 0 && (
                        <span className="text-slate-400 ml-2">• {cat.total_asignados.toLocaleString('es-ES')} ocup.</span>
                      )}
                      <span className="text-slate-500 ml-2">• {cat.provincias?.length || 0} prov.</span>
                    </div>
                  </div>
                  <div className="px-3 py-3">
                    {/* CSS custom property: Tailwind no soporta anchos dinámicos de runtime */}
                    <div className="h-2 bg-slate-800 rounded-sm overflow-hidden mb-2">
                      <div style={{ '--w': `${porcentaje}%` }} className="h-full bg-amber-500/60 [width:var(--w)]" />
                    </div>
                    <div className="text-[8px] text-slate-500 cursor-pointer hover:text-amber-400" onClick={() => setNivelCategoria({ categoria: cat.categoria })}>
                      Click para ver provincias →
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      );
    }

    const grupos = agruparPorFamilia();
    const totalPaginas = Math.ceil(grupos.length / ITEMS_POR_PAGINA);
    const inicio = paginaCategoria * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    const gruposVisibles = grupos.slice(inicio, fin);
    
    return (
      <>
        <div className="grid grid-cols-5 gap-4">
          {gruposVisibles.map(grupo => {
            const maxCat = Math.max(...grupo.categorias.map(c => c.total_leads || 0), 1);
            const isItemSelected = isSelected(grupo, 'familia');
            return (
              <Card 
                key={grupo.nombre} 
                className="bg-slate-900 border-slate-800 transition-colors relative"
              >
                <div className="bg-slate-800/50 px-3 py-2 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <input
                      type="checkbox"
                      checked={isItemSelected}
                      onChange={() => toggleSelection(grupo, 'familia')}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3 h-3 rounded border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <h3
                      className="text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:text-amber-400 transition-colors flex-1 ml-2"
                      onClick={() => { setNivelCategoria({ familia: grupo.nombre }); setPaginaCategoria(0); }}
                    >
                      {grupo.nombre}
                    </h3>
                    <Badge className={getBadgeClasses(grupo.total)}>
                      {grupo.total.toLocaleString('es-ES')}
                    </Badge>
                  </div>
                  <div className="text-[9px] font-mono mt-1 flex items-center gap-2">
                    <span className="text-slate-500">{grupo.categorias.length} categorías</span>
                    <span className="text-emerald-400">• {grupo.disponibles.toLocaleString('es-ES')} libres</span>
                    {grupo.asignados > 0 && (
                      <span className="text-slate-400">• {grupo.asignados.toLocaleString('es-ES')} ocup.</span>
                    )}
                  </div>
                </div>
                <div className="px-3 py-2">
                  {grupo.categorias.slice(0, 5).map(cat => {
                    const porcentaje = ((cat.total_leads || 0) / maxCat) * 100;
                    return (
                      <div key={cat.categoria || 'sin-cat'} className="mb-2 last:mb-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] text-slate-300 truncate flex-1">{cat.categoria || 'Sin categoría'}</div>
                          <div className="text-[9px] text-slate-500 font-mono">{cat.total_leads?.toLocaleString('es-ES') || 0}</div>
                        </div>
                        {/* CSS custom property: Tailwind no soporta anchos dinámicos de runtime */}
                        <div className="h-1.5 bg-slate-800 rounded-sm overflow-hidden">
                          <div style={{ '--w': `${porcentaje}%` }} className="h-full bg-amber-500/60 [width:var(--w)]" />
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-[8px] text-slate-500 mt-2 text-center cursor-pointer hover:text-amber-400" onClick={() => { setNivelCategoria({ familia: grupo.nombre }); setPaginaCategoria(0); }}>
                    Click para ver detalle →
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        
        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setPaginaCategoria(Math.max(0, paginaCategoria - 1))}
              disabled={paginaCategoria === 0}
              className="p-2 rounded-sm bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-xs text-slate-400 font-mono">
              Página {paginaCategoria + 1} de {totalPaginas}
            </div>
            <button
              onClick={() => setPaginaCategoria(Math.min(totalPaginas - 1, paginaCategoria + 1))}
              disabled={paginaCategoria >= totalPaginas - 1}
              className="p-2 rounded-sm bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto p-6 bg-slate-950 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">ANÁLISIS MULTIDIMENSIONAL</h2>
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-blue-900/30 border border-blue-800 rounded-sm text-[10px] text-blue-400 font-mono">
                {selectedItems.length} seleccionado{selectedItems.length > 1 ? 's' : ''}
              </div>
              {(() => {
                const totales = getTotalesSeleccion();
                return (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-400">{totales.total.toLocaleString('es-ES')} leads</span>
                    <span className="text-emerald-400">({totales.libres.toLocaleString('es-ES')} libres</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">{totales.ocupados.toLocaleString('es-ES')} en campañas)</span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-sm bg-slate-800 text-slate-300 text-xs font-medium uppercase tracking-wider hover:bg-slate-700 transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={handleCrearCampana}
                className="px-3 py-1.5 rounded-sm bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-xs font-bold uppercase tracking-wider hover:bg-emerald-900/50 transition-colors"
              >
                Crear Campaña
              </button>
            </>
          )}
          <button
            onClick={cargarDatos}
            disabled={loading}
            className="px-3 py-1.5 rounded-sm bg-slate-800 text-slate-300 text-xs font-medium uppercase tracking-wider hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setNivelLocalidad(null); setNivelCategoria(null); setPaginaLocalidad(0); setPaginaCategoria(0); }}
            className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 ${
              tab === t.id ? 'bg-[#D00000] text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && renderDashboard()}
      {tab === 'localidad' && renderLocalidad()}
      {tab === 'categoria' && renderCategoria()}
    </div>
  );
};

CampanasAnalisisPanel.propTypes = {
  onCrearCampana: PropTypes.func
};

export default CampanasAnalisisPanel;