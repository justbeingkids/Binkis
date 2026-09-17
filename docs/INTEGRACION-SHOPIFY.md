# Integración Shopify — hologramas y Binkicoins

Para el equipo de la tienda (MIMIC) y para quien administre Shopify.
Reemplazar `APP` por el dominio de la app (Vercel), por ejemplo
`https://binkis-b4ee.vercel.app`.

---

## 1. Los hologramas ganadores

El QR impreso apunta a:

```
https://binkis.xyz/claim?code=BNK-XXXX-XXXX
```

`binkis.xyz` es la tienda Shopify, no la app, así que hoy ese escaneo termina
en la página de contraseña de la tienda y el cliente nunca llega a la
validación. El código impreso ya no se puede cambiar, de modo que la tienda
tiene que reenviar esa ruta:

1. Shopify Admin → **Online Store → Navigation → URL Redirects**
2. Redirigir `/claim` → `APP/claim`
3. Verificar con un escaneo real que el parámetro `?code=` llega completo:
   `https://binkis.xyz/claim?code=BNK-4LYU-7ZRL` debe mostrar la validación.

Mientras la tienda esté protegida con contraseña, la página de contraseña se
antepone a todo el tráfico de la tienda. Hay que probar el escaneo con la
tienda abierta antes de repartir la primera caja.

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
  "eligibility": { "freeClassicFigure": true, "displayCaseAt49": false, "founderReserve": false }
}
```

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

Regla de puntos: **1 punto por pieza** comprada; **colección completa = 13**
(8 + 5 de bonus). Ganar una Limited Edition **no** da puntos.

- `LOYALTY_COLLECTION_SKUS` — SKUs del paquete de colección completa (13 puntos)
- `LOYALTY_PIECE_SKU_PREFIXES` — opcional. Si se define, solo esos SKUs suman.
  Hace falta en cuanto la tienda venda algo que no sea una pieza (display case,
  ropa), o esos productos también sumarían puntos.

Devoluciones y cancelaciones todavía no restan puntos. Si se necesita, es el
webhook `refunds/create` con la misma mecánica.

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

`SESSION_SECRET` es obligatoria y tiene que ser distinta de la service role
key: antes las sesiones de admin se firmaban con esa llave, de modo que
cualquiera que la tuviera podía emitirse una cookie de administrador.

Después de desplegar, correr `supabase/schema.sql` completo en el SQL Editor de
Supabase. Es idempotente y agrega lo nuevo (`loyalty_order_events`,
`award_order_points`).
