// Libro de Reclamaciones virtual: el cliente registra su hoja (registrar_reclamo en la base
// asigna el número correlativo) y recibe en pantalla la constancia para imprimir o guardar.
let CONFIG_LIBRO = null;

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarLayout('libro-de-reclamaciones/');
  const form = document.getElementById('libro-form');
  if (!form) return;
  if (!SUPABASE_CONFIGURADO) {
    document.getElementById('libro-alerta').innerHTML = '<div class="alert alert-error">El libro no está disponible en este momento. Escríbenos por WhatsApp.</div>';
    return;
  }
  obtenerConfiguracionSitio().then((cfg) => { CONFIG_LIBRO = cfg; }).catch(() => {});

  document.getElementById('libro-es-menor').addEventListener('change', (e) => {
    const grupo = document.getElementById('libro-apoderado');
    grupo.hidden = !e.target.checked;
    grupo.querySelector('input').required = e.target.checked;
  });
  form.addEventListener('submit', enviarReclamo);
});

async function enviarReclamo(e) {
  e.preventDefault();
  const form = e.target;
  const alerta = document.getElementById('libro-alerta');
  alerta.innerHTML = '';
  // Campo trampa: un humano no lo ve ni lo llena; un bot de spam sí.
  if (form.sitio_web.value) return;
  if (!form.checkValidity() || !document.getElementById('libro-acepto').checked) {
    form.reportValidity();
    alerta.innerHTML = '<div class="alert alert-error">Completa los campos obligatorios (*) y acepta la declaración.</div>';
    return;
  }
  const datos = Object.fromEntries(new FormData(form));
  delete datos.sitio_web;
  datos.es_menor = document.getElementById('libro-es-menor').checked;
  datos.monto_reclamado = datos.monto_reclamado || null;

  const boton = document.getElementById('libro-enviar');
  boton.disabled = true;
  boton.textContent = 'Registrando…';
  try {
    const { numero, fecha_registro: fechaRegistro } = await registrarReclamo(datos);
    const hoja = { ...datos, numero, fecha_registro: fechaRegistro, monto_reclamado: datos.monto_reclamado ? Number(datos.monto_reclamado) : null };
    const cfg = CONFIG_LIBRO || {};
    document.getElementById('libro-mount').innerHTML = `
      <div class="libro-constancia">
        <div class="alert alert-success">Tu ${escapeHtml(hoja.tipo.toLowerCase())} quedó registrado con el N° <strong>${escapeHtml(numero)}</strong>. Guarda o imprime esta hoja como constancia: te responderemos en un plazo máximo de 15 días hábiles ${hoja.respuesta_por === 'Domicilio' ? 'por carta a tu domicilio' : `al correo ${escapeHtml(hoja.consumidor_correo)}`}.</div>
        ${htmlHojaReclamacion(hoja, cfg)}
        <div class="hero-actions" style="justify-content:flex-start; margin-top:18px;">
          <button type="button" class="btn btn-primary" id="libro-imprimir">Imprimir / guardar en PDF</button>
          <a class="btn btn-whatsapp" href="https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(`Hola, registré la hoja de reclamación N° ${numero} en su Libro de Reclamaciones.`)}" target="_blank" rel="noopener">Avisar por WhatsApp</a>
        </div>
      </div>`;
    document.getElementById('libro-imprimir').addEventListener('click', () => imprimirHojaReclamacion(hoja, cfg));
    document.getElementById('libro-mount').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    alerta.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    boton.disabled = false;
    boton.textContent = 'Registrar hoja de reclamación';
  }
}
