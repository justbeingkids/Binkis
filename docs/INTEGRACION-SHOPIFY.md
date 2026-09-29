# Integración Shopify — hologramas y Binkicoins

Para el equipo de la tienda (MIMIC) y para quien administre Shopify.
Reemplazar `APP` por el dominio de la app (Vercel), por ejemplo
`https://binkis.vercel.app`.

---

## 1. Los hologramas ganadores

El QR impreso apunta a:

```
https://binkis.xyz/claim?code=BNK-XXXX-XXXX
```

`binkis.xyz` es la tienda Shopify, no la app. El código impreso ya no se
puede cambiar, así que la tienda reenvía esa ruta. Configurado y verificado
el 22 de septiembre de 2026: `binkis.xyz/claim?code=…` responde 301 hacia
`https://binkis.vercel.app/claim?code=…` conservando el código.

1. Shopify Admin → **Online Store → Navigation → URL Redirects**
2. Redirigir `/claim` → `APP/claim`
3. Verificar con un escaneo real que el parámetro `?code=` llega completo:
   `https://binkis.xyz/claim?code=BNK-4LYU-7ZRL` debe mostrar la validación.

Si la tienda vuelve a protegerse con contraseña, la página de contraseña se
antepone a todo, incluido `/claim`, y el escaneo deja de llegar a la app.

Flujo que ve el cliente: escanea → la página dice si es ganador → llena sus
datos → `POST APP/api/codes/claim` registra el envío y **ahí** se asigna el
personaje, que viene en la respuesta:

```json
{ "ok": true, "character": { "id": "…", "name": "…" } }
```

Antes el premio se asignaba al cargar la página. WhatsApp, iMessage y los
antivirus piden la URL para armar la vista previa del enlace, así que el
inventario se podía consumir sin que nadie tocara nada. Ya no.

---

## 2. Puntos desde el tema (sin API key en el navegador)

Una API key dentro del tema queda expuesta en el navegador. Se usa el
**App Proxy** de Shopify: el tema llama a una ruta del propio dominio de la
tienda, Shopify la firma y agrega `logged_in_customer_id` ya verificado.

Configuración en el app de la tienda → **App proxy**:

| Campo | Valor |
|---|---|
| Subpath prefix | `apps` |
| Subpath | `binkis` |
| Proxy URL | `APP/api/loyalty/proxy` |

El tema entonces hace:

```js
const r = await fetch("/apps/binkis", { credentials: "same-origin" });
const data = await r.json();
```

Respuesta:

```json
{
  "loggedIn": true,
  "points": 22,
  "tier": { "key": "collector", "name": "Collector" },
  "unlocked": [{ "key": "collector", "name": "Collector", "benefit": "Figura clasica BINKIS gratis" }],
  "next": { "key": "elite", "name": "Elite Collector", "points": 30 },
  "pointsToNext": 8,
  "eligibility": { "freeClassicFigure": true, "limitedSaleAccess": false, "vipEarlyAccess": false }
}
```

Niveles (septiembre 2026):

| Puntos | Nivel | `eligibility` | Beneficio |
|---|---|---|---|
| 20 | Collector | `freeClassicFigure` | Figura clásica gratis |
| 30 | Elite Collector | `limitedSaleAccess` | Acceso a la venta de las 77 piezas Limited |
| 40 | Founder Reserve | `vipEarlyAccess` | Acceso VIP 24 horas antes a la venta progresiva |

Los beneficios son acumulativos: quien tiene 40 tiene los tres.

Importante sobre los accesos a la venta: ocultar el botón de compra en el
tema no basta, porque un producto se puede agregar al carrito con una URL
directa. Para que el acceso sea real hay que validarlo también del lado de
Shopify, con etiquetas de cliente o con una validación de carrito, usando
este mismo campo como fuente.

Sin sesión iniciada devuelve `{ "loggedIn": false }`. La app verifica la firma
de Shopify y rechaza cualquier petición de más de cinco minutos.

Solo datos de lealtad: nunca nombre, teléfono ni dirección.

---

## 3. Consulta servidor a servidor

Para procesos del lado de la tienda (no para el tema):

```
GET APP/api/loyalty/status?email=cliente@correo.com
Authorization: Bearer <LOYALTY_API_KEY>
```

Misma respuesta que arriba, sin `loggedIn`.

---

## 4. Sumar puntos por compra

Shopify Admin → **Settings → Notifications → Webhooks**:

| Campo | Valor |
|---|---|
| Evento | `Order payment` (`orders/paid`) |
| URL | `APP/api/webhooks/shopify-order` |
| Formato | JSON |

Shopify muestra un secreto al crear el webhook; ese valor va en la variable
`SHOPIFY_WEBHOOK_SECRET` de la app. La app valida la firma HMAC, calcula los
puntos a partir del pedido firmado (nunca de un número que le manden) y guarda
el id del pedido en la misma transacción, así que un reintento de Shopify no
suma dos veces.

Regla de puntos, confirmada por David el 19 de septiembre de 2026:

- 1 Classic (`BNK-C-…`) = 1 punto; 1 Limited (`BNK-L-…`) = 1 punto
- 8 Classic compradas por separado = 8 puntos, sin bono
- Collection Box (`BNK-CBOX`) = 13 puntos en total, no 8 + 13
- Caja acrílica y PET = 0 puntos
- Ganar una Limited con un holograma no da puntos

La Collection Box tiene que ser un solo producto con una sola línea en el
pedido. Si se arma como paquete que se descompone en 8 líneas de figuras,
sumaría 8 + 13.

- `LOYALTY_COLLECTION_SKUS` — SKUs del paquete de colección completa (13 puntos)
- `LOYALTY_PIECE_SKU_PREFIXES` — opcional. Si se define, solo esos SKUs suman.
  Hace falta en cuanto la tienda venda algo que no sea una pieza (display case,
  ropa), o esos productos también sumarían puntos.

Devoluciones y cancelaciones todavía no restan puntos. Si se necesita, es el
webhook `refunds/create` con la misma mecánica.

---

## 4b. Tags de nivel en el cliente de Shopify

El tema bloquea el botón de la Edición Limitada salvo que el cliente traiga
`elite-access` (30 puntos) o `vip-access` (40). Esos tags los escribe esta
aplicación al procesar cada pedido pagado, justo después de sumar los puntos.

Se usa `tagsAdd` de la Admin API, que solo agrega: nunca borra un tag que
haya puesto alguien más, y dos pedidos simultáneos no se pisan.

### Cómo se obtiene el permiso

Shopify quitó las apps personalizadas que entregaban un token fijo (`shpat_`),
así que la app se instala por OAuth, una sola vez:

1. En la app de Shopify, agregar a **Allowed redirection URLs**:
   `APP/api/shopify/callback`
2. Cargar en la aplicación `SHOPIFY_STORE_DOMAIN` (el dominio `.myshopify.com`),
   `SHOPIFY_OAUTH_CLIENT_ID` y `SHOPIFY_OAUTH_CLIENT_SECRET`.
3. Abrir en el navegador, con sesión de staff en la tienda:
   `APP/api/shopify/install`
4. Autorizar. Shopify manda el token al callback y queda guardado en la tabla
   `shopify_oauth_tokens`. No hay que copiar ni pegar nada.

Los permisos que pide son `write_customers` y `read_customers`, nada más.

Qué protege esa ruta: el callback verifica la firma de Shopify sobre la
consulta, verifica una firma propia en el `state`, y exige que la tienda sea
exactamente la de `SHOPIFY_STORE_DOMAIN`. Una llamada que no venga de Shopify,
o que venga por otra tienda, no guarda ningún token.

`SHOPIFY_ADMIN_TOKEN` se sigue aceptando y tiene prioridad, por si alguna
tienda todavía puede emitir uno a mano. Sin token, la aplicación funciona igual
y solo deja de escribir tags, avisándolo en el log.

Para los clientes que ya tienen puntos de antes:

```
POST APP/api/admin/loyalty/sync-tags     (con sesión de administrador)
```

Recorre las cuentas con puntos y les pone el tag que les toca. Es idempotente.

Un detalle de tiempos para el tema: el tag se escribe cuando llega el webhook
del pedido, unos segundos después del pago. Si alguien cruza los 30 puntos con
una compra y recarga de inmediato, puede ver el botón bloqueado un momento. La
consulta del App Proxy sí responde al instante, así que conviene que el tema
muestre el estado con esa y deje el tag como candado del checkout.

---

## 5. Variables de entorno

En Vercel → Project → Settings → Environment Variables (Production):

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (secreta) |
| `SESSION_SECRET` | generar: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `NEXT_PUBLIC_BASE_URL` | dominio público de la app |
| `SHOPIFY_WEBHOOK_SECRET` | Shopify, al crear el webhook |
| `SHOPIFY_API_SECRET` | client secret del app que tiene el App Proxy |
| `LOYALTY_API_KEY` | generar igual que `SESSION_SECRET` |
| `SHOPIFY_STORE_DOMAIN` | `tienda.myshopify.com` |
| `SHOPIFY_ADMIN_TOKEN` | Admin API access token de la app (`shpat_...`), scope `write_customers` |

`SESSION_SECRET` es obligatoria y tiene que ser distinta de la service role
key: antes las sesiones de admin se firmaban con esa llave, de modo que
cualquiera que la tuviera podía emitirse una cookie de administrador.

Después de desplegar, correr `supabase/schema.sql` completo en el SQL Editor de
Supabase. Es idempotente y agrega lo nuevo (`loyalty_order_events`,
`award_order_points`).
