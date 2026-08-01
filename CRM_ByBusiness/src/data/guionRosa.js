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
 *
 * Placeholder dinámico {{diagnostico_detalle}} (no aparece en el texto
 * del template; se reemplaza por `interpolarGuionRosa` con un bloque
 * construido a partir de `rating`, `num_reseñas` y `reputacion_at`
 * para reflejar la frescura del dato y dar una imagen profesional).
 */

export const GUION_ROSA = {
  nombre: 'Rosa (By Business)',
  version: '2026-07-31',

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
        'Una vez verificada la ficha de su empresa — {{nombre_comercial}} — vemos que {{diagnostico_detalle}} ' +
        'y, en este caso, es necesario generar un flujo de valoraciones positivas ' +
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
        'Todo por un ÚNICO pago de 319 € + IVA = 385,99 €, para estar durante 18 MESES en la primera página ' +
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
 * Construye el bloque dinámico del paso "Diagnóstico" a partir del rating,
 * el número de reseñas y la última fecha de actualización. El objetivo es
 * darle al operador un mensaje creíble y profesional: si el dato está
 * fresco, mostramos estrellas + reseñas + fecha; si está desactualizado o
 * ausente, reconocemos el caso con un mensaje que no rompe el flujo.
 *
 * Devuelve un fragmento listo para insertir dentro de la frase
 * "...vemos que {{diagnostico_detalle}} y, en este caso...".
 *
 * @param {Object} lead Lead activo. Puede traer `rating`, `num_reseñas`,
 *                       `reputacion_at`, `data_freshness`.
 * @returns {string} Bloque de diagnóstico.
 */
function construirDiagnosticoDetalle(lead = {}) {
  const ratingNum = parseFloat(lead?.rating ?? lead?.scoring);
  const reseñas = parseInt(lead?.num_reseñas ?? lead?.num_resenas, 10);
  const freshness = lead?.data_freshness;

  const ratingTexto = Number.isFinite(ratingNum) && ratingNum > 0
    ? ratingNum.toFixed(1).replace(/\.0$/, '')
    : null;
  const reseñasTexto = Number.isFinite(reseñas) && reseñas > 0
    ? reseñas.toLocaleString('es-ES')
    : null;

  const fecha = lead?.reputacion_at ? new Date(lead.reputacion_at) : null;
  const fechaTexto = fecha && !Number.isNaN(fecha.getTime())
    ? fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
    : null;

  if (freshness === 'fresco' && ratingTexto && reseñasTexto && fechaTexto) {
    return `su valoración actual es de ${ratingTexto} estrellas (${reseñasTexto} reseñas, actualizado el ${fechaTexto})`;
  }
  if (ratingTexto && reseñasTexto) {
    return `su valoración actual es de ${ratingTexto} estrellas (${reseñasTexto} reseñas)`;
  }
  if (ratingTexto) {
    return `su valoración actual es de ${ratingTexto} estrellas`;
  }
  if (freshness === 'sin_dato' || freshness === 'stale') {
    return 'estamos actualizando la información de su ficha para darle una valoración precisa';
  }
  return 'su valoración actual es de — estrellas';
}

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
  const diagnosticoDetalle = construirDiagnosticoDetalle(lead);

  return GUION_ROSA.pasos.map(paso => {
    let texto = paso.texto;
    texto = lugar(texto, 'nombre_operador', operatorName);
    texto = lugar(texto, 'nombre_responsable', responsable);
    texto = lugar(texto, 'scoring', scoring);
    texto = lugar(texto, 'nombre_comercial', nombreComercial);
    texto = lugar(texto, 'diagnostico_detalle', diagnosticoDetalle);
    return { ...paso, texto };
  });
}
