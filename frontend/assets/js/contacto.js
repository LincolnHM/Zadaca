document.addEventListener('DOMContentLoaded', () => {
  iniciarLayout('contacto.html');
  document.getElementById('icon-mail').innerHTML = ICONS.mail;
  document.getElementById('icon-whatsapp').innerHTML = ICONS.bag;
  document.getElementById('icon-envios').innerHTML = ICONS.truck;
  renderFormularioCotizacion();
});

function renderFormularioCotizacion() {
  const mount = document.getElementById('cotizacion-mount');
  if (!estaLogueado()) {
    mount.innerHTML = `<p style="font-size:0.85rem; color:var(--color-text-faint);"><a href="cuenta.html?retorno=contacto.html" class="link-arrow">Inicia sesión</a> para solicitar una cotización.</p>`;
    return;
  }
  mount.innerHTML = `
    <form id="cotizacion-form">
      <div class="form-row">
        <div class="form-group"><label>Nombre del Perfume</label><input type="text" name="nombre_perfume_solicitado" required /></div>
        <div class="form-group"><label>Marca</label><input type="text" name="marca_solicitada" required /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Concentración</label><input type="text" name="concentracion" placeholder="Eau de Parfum..." /></div>
        <div class="form-group"><label>Mililitros</label><input type="number" name="mililitros" placeholder="100" /></div>
      </div>
      <div class="form-group"><label>Notas adicionales</label><textarea name="notas_cliente" rows="3" placeholder="Presentación, referencia, dónde lo viste..."></textarea></div>
      <button type="submit" class="btn btn-primary btn-block">Enviar Solicitud</button>
    </form>
  `;
  document.getElementById('cotizacion-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (data.mililitros) data.mililitros = Number(data.mililitros);
    try {
      await apiFetch('/cotizaciones', { method: 'POST', body: JSON.stringify(data) });
      mostrarToast('¡Solicitud enviada! Te contactaremos pronto.');
      e.target.reset();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
}
