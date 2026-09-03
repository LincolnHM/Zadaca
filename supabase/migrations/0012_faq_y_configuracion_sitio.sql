-- ==========================================================
-- MIGRACIÓN 0012 — Preguntas frecuentes y configuración del sitio, editables
-- desde el panel admin en vez de texto fijo repartido en varios archivos.
--
-- Antes de esto: el FAQ de contacto/index.html eran 8 <details> escritos a
-- mano en el HTML (solo un desarrollador podía cambiarlos), y datos como las
-- direcciones de Chiclayo/Lima, el mínimo de unidades por consolidado ("4"),
-- los días de envío ("7 a 14") y el día de cierre ("domingos") estaban
-- repetidos tal cual en index.html, contacto/index.html,
-- terminos-condiciones/index.html, main.js (footer) y cuenta.js -- 4 a 5
-- copias del mismo dato sin ninguna fuente única, fáciles de desincronizar
-- si el negocio cambia de local o de política.
--
-- Ejecutar una sola vez en el SQL Editor de Supabase (producción). Si ya hay
-- pedidos/clientes reales, hacer un backup antes (ver supabase/OPERACIONES.md
-- sección 1) -- es el mismo criterio que las migraciones anteriores.
-- ==========================================================

/* ---------- Preguntas frecuentes (Contacto → Preguntas Frecuentes) ---------- */

create table preguntas_frecuentes (
    id bigint generated always as identity primary key,
    pregunta text not null,
    -- Admite HTML simple (<strong>, <a>) porque el FAQ original ya usaba negritas y un link a
    -- Cambios y Devoluciones -- solo el Admin puede escribir acá (ver policy abajo), así que no
    -- es una superficie de XSS de un visitante anónimo.
    respuesta text not null,
    orden int not null default 0,
    activo boolean not null default true,
    fecha_creacion timestamp default now()
);

alter table preguntas_frecuentes enable row level security;

create policy "faq publico" on preguntas_frecuentes for select using (activo = true or is_admin());
create policy "faq admin escribe" on preguntas_frecuentes for all using (is_admin()) with check (is_admin());

-- Contenido real que ya estaba publicado en contacto/index.html -- se migra tal cual para que
-- la página no quede en blanco apenas se corre esta migración. {{minimo_unidades}},
-- {{envio_dias}} y {{dia_cierre}} se reemplazan en el navegador con los valores de
-- configuracion_sitio (ver assets/js/contacto.js) -- así esos tres números solo viven en un
-- lugar aunque aparezcan en varias preguntas.
insert into preguntas_frecuentes (pregunta, respuesta, orden) values
('¿Hacen envíos a todo el Perú?', 'Sí, vía Shalom u Olva Courier a cualquier departamento. También puedes recoger tu pedido en nuestro almacén de Lima (solo pedidos de consolidado) o comprar directo en la tienda física de Chiclayo.', 1),
('¿Tienen tienda física?', 'Sí, en Av. Los Incas 1090, La Victoria, Chiclayo. El almacén de Lima es solo un punto de recojo de pedidos de consolidado — ahí no atendemos venta en persona.', 2),
('¿Cuál es la diferencia entre Catálogo, Consolidado y Liquidaciones?', '<strong>Catálogo</strong> es stock físico real: lo compras y lo recibes de inmediato. <strong>Consolidado</strong> es una campaña de importación grupal a precio preferencial (mínimo {{minimo_unidades}} unidades, cierra los {{dia_cierre}}). <strong>Liquidaciones</strong> es mercadería que cae directo a stock a precio rebajado, por mayor o por unidad según el producto.', 3),
('¿Cómo pago mi pedido?', 'Aceptamos Yape, Plin, transferencia o tarjeta. El pago se coordina por WhatsApp: nos envías la captura del comprobante y confirmamos tu pedido.', 4),
('¿Cuánto tarda en llegar un consolidado?', 'De {{envio_dias}} días después de que la campaña cierra (los cierres son todos los {{dia_cierre}}). Puedes seguir el estado de tu reserva desde "Mi cuenta".', 5),
('¿Puedo comprar por mayor?', 'Sí. En Liquidaciones cada producto tiene su propia cantidad mínima (desde 1 unidad hasta packs de 2 o 6), y en Consolidado puedes reservar más unidades para acceder a mejores precios por volumen.', 6),
('¿Los perfumes son 100% originales?', 'Sí, todo nuestro catálogo es original importado — no vendemos réplicas ni clones.', 7),
('¿Puedo cambiar o devolver mi pedido?', 'Los decants no admiten cambio ni devolución por tratarse de fracciones ya manipuladas (razones de higiene). Para perfumes sellados con defecto de fábrica, tienes 48 horas desde la entrega para reportarlo. Revisa el detalle completo en <a href="https://madisonzadaca.com/cambios-y-devoluciones/">Cambios y Devoluciones</a>.', 8);

/* ---------- Configuración del sitio (una sola fila, editable desde admin) ---------- */

create table configuracion_sitio (
    id smallint primary key default 1,
    correo_contacto text not null default 'contacto@maisonzadaca.com',
    direccion_chiclayo text not null default 'Av. Los Incas 1090, La Victoria, Chiclayo',
    direccion_chiclayo_maps_url text not null default 'https://www.google.com/maps/search/?api=1&query=Av.+Los+Incas+1090,+La+Victoria,+Chiclayo,+Peru',
    direccion_lima text not null default 'Jr. Ávila Godoy 664, San Martín de Porres, Lima',
    direccion_lima_maps_url text not null default 'https://www.google.com/maps/search/?api=1&query=Jr.+Avila+Godoy+664,+San+Martin+de+Porres,+Lima,+Peru',
    consolidado_minimo_unidades int not null default 4,
    consolidado_dia_cierre text not null default 'domingos',
    envio_dias_texto text not null default '7 a 14',
    envio_transportistas text not null default 'Shalom / Olva',
    metodos_pago_texto text not null default 'Yape, Plin, transferencia y tarjeta',
    -- Nulos a propósito: el footer solo muestra el ícono de una red social si su URL está
    -- cargada acá (antes Instagram/TikTok apuntaban a "#", un link muerto). Complétalos desde
    -- el panel admin → Configuración del Sitio cuando tengas las cuentas reales.
    instagram_url text,
    tiktok_url text,
    facebook_url text,
    actualizado_en timestamp default now(),
    constraint chk_configuracion_una_fila check (id = 1)
);

alter table configuracion_sitio enable row level security;

create policy "configuracion publico" on configuracion_sitio for select using (true);
create policy "configuracion admin escribe" on configuracion_sitio for update using (is_admin()) with check (is_admin());

insert into configuracion_sitio (id) values (1);
