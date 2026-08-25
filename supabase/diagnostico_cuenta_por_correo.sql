-- Solo lectura -- no modifica nada. Cambia el correo del "where" si necesitas revisar otra cuenta.

-- 1) Perfil (para obtener el id de cliente)
select id, nombres, apellidos, correo, rol, fecha_registro
from perfiles
where correo = 'lincolnmiguel5@gmail.com';

-- 2) Lo que tiene ahora mismo en el carrito
select ci.id as id_item_carrito, ci.cantidad, ci.fecha_agregado, p.id as id_producto, p.nombre, p.marca, p.mililitros
from carrito_items ci
join perfumes p on p.id = ci.id_producto
join perfiles pf on pf.id = ci.id_cliente
where pf.correo = 'lincolnmiguel5@gmail.com';

-- 3) Pedidos ya generados (Directo_Tienda o de un consolidado) con esa cuenta
select pe.id as id_pedido, pe.tipo_pedido, pe.monto_total, pe.estado_pago, pe.fecha_creacion
from pedidos pe
join perfiles pf on pf.id = pe.id_cliente
where pf.correo = 'lincolnmiguel5@gmail.com'
order by pe.fecha_creacion desc;
