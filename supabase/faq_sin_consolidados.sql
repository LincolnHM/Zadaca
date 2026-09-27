-- ==========================================================
-- PREGUNTAS FRECUENTES SIN CONSOLIDADOS (septiembre 2026)
--
-- Las preguntas frecuentes de Contacto viven en la base de datos, no en el código: apagar
-- CONSOLIDADOS_ACTIVOS no las toca. Este script oculta la que es solo de consolidados y
-- reescribe las que lo mencionan de pasada. Cada update solo corre si el texto todavía
-- menciona consolidado (no pisa algo que ya hayas editado desde el panel).
--
-- Para volver a mostrar consolidados: más abajo están los textos originales.
-- ==========================================================

-- 5) "¿Cuánto tarda en llegar un consolidado?" → oculta (no se borra).
update preguntas_frecuentes set activo = false
where id = 5 and pregunta ilike '%consolidado%';

-- 1) Envíos
update preguntas_frecuentes
set respuesta = 'Sí, vía Shalom u Olva Courier a cualquier departamento. También puedes comprar o recoger tu pedido en nuestra tienda física de Chiclayo.'
where id = 1 and respuesta ilike '%consolidado%';

-- 2) Tienda física
update preguntas_frecuentes
set respuesta = 'Sí, en Av. Los Incas 1090, La Victoria, Chiclayo. Ahí puedes comprar en persona, probar los perfumes y recoger tus pedidos.'
where id = 2 and respuesta ilike '%consolidado%';

-- 3) Diferencia entre modalidades
update preguntas_frecuentes
set pregunta = '¿Cuál es la diferencia entre Catálogo, Decants y Liquidaciones?',
    respuesta = '<strong>Catálogo</strong> es stock físico real: perfumes originales en frasco completo que compras y recibes de inmediato. <strong>Decants</strong> son fracciones de 3, 5 o 10 ml del perfume original, ideales para probarlo antes de comprar el frasco. <strong>Liquidaciones</strong> es mercadería que cae directo a stock a precio rebajado, por mayor o por unidad según el producto.'
where id = 3 and (pregunta ilike '%consolidado%' or respuesta ilike '%consolidado%');

-- 6) Por mayor
update preguntas_frecuentes
set respuesta = 'Sí. En Liquidaciones cada producto tiene su propia cantidad mínima (desde 1 unidad hasta packs de 2 o 6). Para pedidos grandes de otros perfumes, escríbenos por WhatsApp y te cotizamos.'
where id = 6 and respuesta ilike '%consolidado%';

select id, orden, activo, pregunta from preguntas_frecuentes order by orden;

-- ==========================================================
-- TEXTOS ORIGINALES (para restaurar si se vuelven a activar los consolidados):
--
-- update preguntas_frecuentes set activo = true where id = 5;
-- update preguntas_frecuentes set respuesta = 'Sí, vía Shalom u Olva Courier a cualquier departamento. También puedes recoger tu pedido en nuestro almacén de Lima (solo pedidos de consolidado) o comprar directo en la tienda física de Chiclayo.' where id = 1;
-- update preguntas_frecuentes set respuesta = 'Sí, en Av. Los Incas 1090, La Victoria, Chiclayo. El almacén de Lima es solo un punto de recojo de pedidos de consolidado — ahí no atendemos venta en persona.' where id = 2;
-- update preguntas_frecuentes set pregunta = '¿Cuál es la diferencia entre Catálogo, Consolidado y Liquidaciones?', respuesta = '<strong>Catálogo</strong> es stock físico real: lo compras y lo recibes de inmediato. <strong>Consolidado</strong> es una campaña de importación grupal a precio preferencial (mínimo {{minimo_unidades}} unidades, cierra los {{dia_cierre}}). <strong>Liquidaciones</strong> es mercadería que cae directo a stock a precio rebajado, por mayor o por unidad según el producto.' where id = 3;
-- update preguntas_frecuentes set respuesta = 'Sí. En Liquidaciones cada producto tiene su propia cantidad mínima (desde 1 unidad hasta packs de 2 o 6), y en Consolidado puedes reservar más unidades para acceder a mejores precios por volumen.' where id = 6;
-- ==========================================================
