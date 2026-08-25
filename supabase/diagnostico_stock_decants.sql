-- Solo lectura -- no modifica nada. Sirve para ver por qué decants/ no muestra los 44
-- productos que ya confirmaste que existen en Admin -> Productos -> filtro "Solo Decants".
select
  p.id,
  p.nombre,
  p.mililitros,
  p.es_decant,
  p.id_decant_grupo,
  p.activo,
  i.stock_fisico,
  i.stock_disponible
from perfumes p
left join inventario i on i.id_producto = p.id
where p.es_decant = true
order by p.nombre, p.mililitros
limit 10;
