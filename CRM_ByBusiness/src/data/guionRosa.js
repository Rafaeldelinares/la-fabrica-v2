/**
 * Guion oficial de venta de Rosa — By Business
 *
 * Source of truth para el guion que se muestra en la pestaña GUIÓN
 * del OperatorDashboard. Cualquier cambio al guion debe replicarse en
 * la observación de engram `script-venta-rosa`.
 *
 * Placeholders soportados (interpolados en tiempo de render):
 *   {{nombre_operador}}    → nombre del operador logueado (fallback: "Rosa")
 *   {{nombre_responsable}} → capturado en vivo por el operador (fallback: "don/doña")
 *   {{scoring}}            → valoración Google del lead (fallback: "—")
 *   {{nombre_comercial}}   → nombre del negocio (fallback: "su empresa")
 */

export const GUION_ROSA = {
  nombre: 'Rosa (By Business)',
  version: '2026-06-13',

  pasos: [
    {
      id: 'apertura',
      titulo: 'Apertura',
      texto:
        'Hola! Mi nombre es {{nombre_operador}} y le llamo de By Business, especialistas en publicidad para Google. ' +
        '¿Hablo con el responsable?',
      color: 'emerald',
    },
    {
      id: 'nombre_responsable',
      titulo: 'Capturar nombre del responsable',
      texto:
        '¿Cuál es su nombre para dirigirme a Ud.? ' +
        'Encantada, {{nombre_responsable}}...',
      color: 'emerald',
    },
    {
      id: 'contexto_campana',
      titulo: 'Contexto de campaña',
      texto:
        'Le llamo porque estamos finalizando el año y, como bien sabe, Google actualiza todas sus fichas de empresa ' +
        'para saber cuáles son las que califican para seguir apareciendo con búsqueda en primera página.',
      color: 'sky',
    },
    {
      id: 'diagnostico',
      titulo: 'Diagnóstico',
      texto:
        'Una vez verificada la ficha de su empresa — {{nombre_comercial}} — vemos que su valoración actual ' +
        'es de {{scoring}} estrellas y, en este caso, es necesario generar un flujo de valoraciones positivas ' +
        'para conseguir la puntuación más alta y, además, optimizar el perfil para que sea visto por más clientes.',
      color: 'amber',
    },
    {
      id: 'propuesta',
      titulo: 'Promociones vigentes',
      texto:
        'Esto sería a través de las promociones vigentes, que incluyen:\n' +
        '• 3 formas de búsqueda diferentes y/o modificables\n' +
        '• Fotografías de los servicios que ofrecen\n' +
        '• Un publicista encargado de trabajar permanentemente en la ficha de su empresa\n' +
        '• Difusión en redes sociales\n' +
        '• Geolocalización del local',
      color: 'amber',
    },
    {
      id: 'precio',
      titulo: 'Precio y condiciones',
      texto:
        'Todo por un ÚNICO pago de 289 € + IVA = 349,69 €, para estar durante 18 MESES en la primera página ' +
        'de Google de forma fija y permanente (sin CPC).',
      color: 'amber',
    },
    {
      id: 'objeciones',
      titulo: 'Objeciones',
      texto:
        'No sé si tiene alguna pregunta o duda hasta aquí, {{nombre_responsable}}. ' +
        'Responder las preguntas y pasar directamente al cierre de la venta.',
      color: 'sky',
    },
    {
      id: 'cierre',
      titulo: 'Cierre',
      texto:
        'En caso de que le interese quedarse con el espacio, le explico cómo trabajamos: ' +
        'por seguridad no pedimos ni número de cuenta ni de tarjeta. Lo que hacemos es un contrato mediante ' +
        'grabación de voz y le enviamos su factura proforma con todo detallado para el abono respectivo.',
      color: 'red',
    },
    {
      id: 'facturacion',
      titulo: 'Datos de facturación',
      texto:
        'Entonces, ¿a nombre de quién le enviamos la factura: al suyo o al de la empresa?',
      color: 'red',
    },
  ],
};

/**
 * Interpola los placeholders del guion con los datos del lead + operador.
 * Si falta un dato, usa un fallback razonable para que el operador no vea
 * texto en blanco o placeholders crudos.
 *
 * @param {Object} lead   - Lead activo (debe traer scoring y nombre_comercial)
 * @param {Object} user   - Operador logueado (debe traer nombre)
 * @returns {Array<{id,titulo,texto,color}>} pasos del guion ya interpolados
 */
export function interpolarGuionRosa(lead = {}, user = {}) {
  const lugar = (texto, valor, fallback) =>
    (texto || '').replaceAll(`{{${valor}}}`, fallback);

  const operatorName = (user?.nombre || '').split(' ')[0] || 'Rosa';
  const responsable = lead?.nombre_contacto_real || 'don/doña';
  const scoring = lead?.scoring !== undefined && lead?.scoring !== null
    ? String(parseFloat(lead.scoring) || lead.scoring)
    : '—';
  const nombreComercial = lead?.nombre_comercial || 'su empresa';

  return GUION_ROSA.pasos.map(paso => {
    let texto = paso.texto;
    texto = lugar(texto, 'nombre_operador', operatorName);
    texto = lugar(texto, 'nombre_responsable', responsable);
    texto = lugar(texto, 'scoring', scoring);
    texto = lugar(texto, 'nombre_comercial', nombreComercial);
    return { ...paso, texto };
  });
}
