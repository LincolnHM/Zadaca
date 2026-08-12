# Maison Zadaca Importaciones — Tienda Web

Sitio web completo (frontend + backend + base de datos) para la perfumería de importación **Maison Zadaca**. Incluye catálogo de perfumes, compras directas en tienda y un sistema de **consolidados** (compras grupales para importar a precio preferencial).

## Estructura del proyecto

```
TIO ZADAKA/
├── bd.sql              # Esquema de la base de datos (PostgreSQL)
├── seed.sql             # Datos de ejemplo (catálogo, consolidados, usuarios demo)
├── backend/              # API REST (Node.js + Express + PostgreSQL)
│   ├── server.js
│   ├── .env              # Configuración local (ya incluida para desarrollo)
│   └── src/
└── frontend/              # Sitio estático (HTML/CSS/JS, sin build)
    ├── index.html, catalogo.html, producto.html, consolidados.html, ...
    └── assets/
```

El backend sirve automáticamente los archivos del `frontend/`, así que solo necesitas correr **un servidor**.

## 1. Requisitos

- [Node.js](https://nodejs.org) 18 o superior
- [PostgreSQL](https://www.postgresql.org) 14 o superior corriendo localmente

## 2. Crear y poblar la base de datos

Abre una terminal en la carpeta del proyecto y ejecuta (ajusta el usuario si no usas `postgres`):

```bash
psql -U postgres -c "CREATE DATABASE zadaca_db;"
psql -U postgres -d zadaca_db -f bd.sql
psql -U postgres -d zadaca_db -f seed.sql
```

Esto crea todas las tablas, los triggers de integridad (evitan sobreventa en consolidados) y carga 24 perfumes de ejemplo, 3 consolidados y usuarios de prueba.

## 3. Configurar y correr el backend

```bash
cd backend
npm install
```

Revisa el archivo `.env` (ya viene configurado para desarrollo local):

```
PORT=3000
DATABASE_URL=postgresql://postgres@localhost:5432/zadaca_db
JWT_SECRET=zadaca-dev-secret-cambiar-en-produccion
```

Si tu PostgreSQL tiene contraseña o un usuario distinto, actualiza `DATABASE_URL`.

```bash
npm start
```

Abre **http://localhost:3000** — ahí verás el sitio completo.

## 4. Usuarios de prueba

| Rol      | Correo                    | Contraseña     |
|----------|----------------------------|----------------|
| Cliente  | cliente@demo.com           | Cliente123!    |
| Admin    | admin@maisonzadaca.com     | Zadaca2026!    |

## 5. Panel de administración

Con una cuenta de rol Admin, entra a **http://localhost:3000/admin-login.html** (usa las credenciales de la tabla de arriba). El login reutiliza el mismo `POST /api/auth/login` del sitio — no hay un sistema de autenticación aparte — así que si la cuenta no tiene rol Admin, el panel rechaza el acceso aunque la contraseña sea correcta.

Todas las rutas de la API del panel viven bajo `/api/admin/*` (`backend/src/routes/admin.routes.js`) y están protegidas con el middleware `requireAdmin`, así que devuelven 401/403 si no hay sesión de administrador.

El panel tiene 6 secciones, cada una con su propia página (`frontend/admin-*.html`) pero todo el JavaScript vive en un único `frontend/assets/js/admin.js` y los estilos en `frontend/assets/css/admin.css`:

- **Resumen** (`admin-dashboard.html`): ingresos del mes, pagos pendientes, reseñas y cotizaciones por atender, consolidados abiertos con su progreso y productos con stock bajo.
- **Productos** (`admin-productos.html`): crear, editar y eliminar perfumes del catálogo, incluyendo precios, stock físico y stock mínimo de alerta. Si un producto tiene pedidos, reservas de consolidado o cotizaciones asociadas, el borrado se bloquea (409) y sugiere marcarlo como Agotado en su lugar.
- **Pedidos** (`admin-pedidos.html`): lista todos los pedidos de todos los clientes, con filtro por estado de pago y tipo. Desde el detalle se registran pagos (actualiza automáticamente el saldo y el estado de pago) y se actualiza el estado del envío / número de guía.
- **Consolidados** (`admin-consolidados.html`): crear campañas, editar fechas y mínimo de unidades, cambiar de estado (Borrador → Abierto → … → Finalizado/Cancelado, dejando registro en el historial público) y ver el detalle de reservas por cliente.
- **Reseñas** (`admin-resenas.html`): aprobar, ocultar o eliminar reseñas pendientes.
- **Cotizaciones** (`admin-cotizaciones.html`): fijar precio de tienda/consolidado y cambiar el estado de una solicitud de cotización.

### Cómo promover un usuario existente a Admin

No hay una pantalla para esto todavía — se hace directamente en la base de datos:

```sql
UPDATE clientes SET id_rol = (SELECT id FROM roles WHERE nombre = 'Admin') WHERE correo = 'correo@ejemplo.com';
```

Si esa persona ya tenía una sesión iniciada en el sitio, debe cerrar sesión y volver a entrar: el rol viaja dentro del token JWT, así que un token emitido antes del cambio sigue "viendo" el rol anterior hasta que se vuelve a iniciar sesión.

## Qué se mejoró en `bd.sql`

Al revisar tu base de datos original encontré y corregí lo siguiente:

- **Faltaba `detalle_pedido`**: los pedidos de tienda directa (`Directo_Tienda`) no tenían dónde guardar qué productos y cantidades incluían. Sin esa tabla era imposible saber qué compró un cliente. Se agregó.
- **Catálogo incompleto para una tienda real**: se agregaron `genero`, `familia_olfativa`, `notas_olfativas`, `descripcion`, `slug` (URLs limpias), `es_nuevo` / `es_bestseller` (para las secciones de la home) y `fecha_creacion`.
- **Una sola imagen por producto**: se agregó `imagenes_perfume` para soportar galerías.
- **Sin reseñas ni favoritos**: se agregaron `resenas` (con moderación) y `favoritos`.
- **Sin carrito persistente**: se agregó `carrito_items`.
- **Sin newsletter**: se agregó `newsletter_suscriptores`.
- **Autenticación incompleta**: se agregó `correo_verificado` y `tokens_recuperacion` (para recuperar contraseña).
- **Riesgo de sobreventa en consolidados**: `consolidados.total_unidades_acumuladas` e `inventario.stock_reservado_consolidados` se llenaban manualmente y podían desincronizarse de las reservas reales. Se agregaron **triggers** que los recalculan automáticamente en cada reserva, cambio o cancelación.
- **Inconsistencias de datos**: `detalle_consolidado.estado_item` no tenía `CHECK` (podía tener cualquier texto), `pedidos` no validaba que un pedido `Consolidado` tuviera su consolidado asociado, y `perfumes.precio_consolidado_fijo` no estaba garantizado a ser menor o igual al precio de tienda. Todo esto ahora se valida a nivel de base de datos.
- **Índices** en las columnas más consultadas (marca, género, cliente, pedido, etc.) para que el catálogo y las búsquedas respondan rápido a medida que crece el catálogo.

No se tocó el diseño general de tus tablas (ubigeo, consolidados, pedidos) porque ya reflejaba bien tu modelo de negocio real — solo se completó lo que faltaba para poder construir la tienda encima.

## Qué incluye el sitio

- **Home**: hero, categorías, nuevos ingresos, best sellers, consolidados activos, testimonios, newsletter.
- **Catálogo**: filtros por género, marca, familia olfativa, búsqueda y orden, con paginación.
- **Producto**: detalle completo, reseñas, productos relacionados, agregar al carrito / favoritos.
- **Consolidados**: lista de campañas con barra de progreso, detalle con línea de tiempo de estados y formulario de reserva.
- **Carrito y checkout**: gestión de cantidades, selección de dirección de entrega y creación de pedido (con verificación de stock).
- **Mi cuenta**: login / registro, mis pedidos (con detalle), mis reservas en consolidados, direcciones, favoritos y cotizaciones.
- **Contacto**: información de contacto + formulario para solicitar cotización de un perfume fuera de catálogo.
- **Panel de administración**: dashboard con métricas, gestión de productos, pedidos, consolidados, reseñas y cotizaciones (ver sección [Panel de administración](#5-panel-de-administración)).

## Nota sobre imágenes

No se contaba con fotografías reales de los productos ni el archivo del logo, así que el sitio usa una identidad visual propia (ícono de frasco en línea dorada + wordmark "Maison Zadaca") como marcador de posición elegante. Cuando tengas fotos reales de los perfumes y el logo definitivo, se reemplazan fácilmente: las imágenes de producto van en `perfumes.imagen_url` / tabla `imagenes_perfume`, y el logo en `frontend/assets/img/`.

## Próximos pasos sugeridos

- Conversión automática de reservas de consolidado en pedidos reales al finalizar una campaña (hoy el admin gestiona el ciclo de vida del consolidado y ve las reservas, pero pasar esas reservas a la tabla `pedidos` para cobro y envío es manual).
- Integración de pasarela de pago real (actualmente los pagos se registran manualmente en la tabla `pagos`, incluso desde el panel admin).
- Fotografías reales de producto y logo definitivo.
- Despliegue a un servidor / dominio propio (actualmente corre en local).
