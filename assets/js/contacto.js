document.addEventListener('DOMContentLoaded', async () => {
  await iniciarLayout('contacto.html');
  document.getElementById('icon-mail').innerHTML = ICONS.mail;
  document.getElementById('icon-whatsapp').innerHTML = ICONS.whatsapp;
  document.getElementById('icon-envios').innerHTML = ICONS.truck;
  document.getElementById('icon-tienda-lima').innerHTML = ICONS.pin;
  document.getElementById('icon-tienda-chiclayo').innerHTML = ICONS.pin;
  document.getElementById('texto-whatsapp').textContent = `+${WHATSAPP_NUMERO.slice(0, 2)} ${WHATSAPP_NUMERO.slice(2)}`;

  if (!SUPABASE_CONFIGURADO) {
    document.getElementById('cotizacion-mount').innerHTML = '<div class="empty-state">Configura Supabase en assets/js/supabase-config.js (ver README.md).</div>';
    return;
  }
  renderFormularioCotizacion();
});

const COTIZACION_REENVIO_MS = 60_000; // evita doble envío accidental / spam básico desde el mismo navegador

async function renderFormularioCotizacion() {
  const mount = document.getElementById('cotizacion-mount');
  const session = await obtenerSesion();
  mount.innerHTML = `
    <form id="cotizacion-form">
      ${!session ? `
      <div class="form-row">
        <div class="form-group"><label>Tu nombre *</label><input type="text" name="nombre_contacto" required /></div>
        <div class="form-group"><label>Tu WhatsApp *</label><input type="tel" name="telefono_contacto" placeholder="9XXXXXXXX" required /></div>
      </div>` : ''}
      <div class="form-row">
        <div class="form-group"><label>Nombre del Perfume *</label><input type="text" name="nombre_perfume_solicitado" required /></div>
        <div class="form-group"><label>Marca *</label><input type="text" name="marca_solicitada" required /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Concentración</label><input type="text" name="concentracion" placeholder="Eau de Parfum..." /></div>
        <div class="form-group"><label>Mililitros</label><input type="number" name="mililitros" placeholder="100" min="1" /></div>
      </div>
      <div class="form-group"><label>Notas adicionales</label><textarea name="notas_cliente" rows="3" placeholder="Presentación, referencia, dónde lo viste..."></textarea></div>
      <!-- honeypot anti-spam: invisible para personas, los bots suelen rellenar todos los campos -->
      <div style="position:absolute; left:-9999px;" aria-hidden="true"><label>No llenar</label><input type="text" name="sitio_web" tabindex="-1" autocomplete="off" /></div>
      <p style="font-size:0.78rem; color:var(--color-text-faint); margin-bottom:14px;">Al enviar se abrirá WhatsApp con tu solicitud lista para confirmar.</p>
      <button type="submit" class="btn btn-primary btn-block">Enviar Solicitud por WhatsApp</button>
    </form>
  `;
  document.getElementById('cotizacion-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));

    if (data.sitio_web) return; // honeypot: bot detectado, se ignora en silencio

    if (data.telefono_contacto) {
      const soloDigitos = data.telefono_contacto.replace(/\D/g, '').replace(/^51/, '');
      if (!/^9\d{8}$/.test(soloDigitos)) {
        mostrarToast('Ingresa un WhatsApp válido de Perú (9 dígitos, empieza con 9)', 'error');
        return;
      }
      data.telefono_contacto = soloDigitos;
    }
    delete data.sitio_web;
    if (data.mililitros) data.mililitros = Number(data.mililitros); else delete data.mililitros;

    const ultimoEnvio = Number(sessionStorage.getItem('ultima_cotizacion') || 0);
    if (Date.now() - ultimoEnvio < COTIZACION_REENVIO_MS) {
      mostrarToast('Ya enviaste una solicitud hace un momento. Espera un poco antes de enviar otra.', 'error');
      return;
    }

    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      await enviarCotizacion(data);
      sessionStorage.setItem('ultima_cotizacion', String(Date.now()));
      window.open(enlaceWhatsappCotizacion(data), '_blank', 'noopener');
      mostrarToast('¡Solicitud registrada! Confirma el mensaje en WhatsApp para que te atendamos.');
      e.target.reset();
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      boton.disabled = false;
    }
  });
}
