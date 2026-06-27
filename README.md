# BinKis - Demo del Sistema de Validacion

Demo del sistema de validacion de hologramas ganadores para la coleccion BinKis No.777.

## Funcionalidad

- **Panel admin** (`/`): metricas en vivo del sistema
- **Generar codigos** (`/generate`): batches de hasta 100 codigos. Cada batch se acumula en el Google Sheet
- **Lista de codigos** (`/codes`): tabla con todos los codigos generados
- **Ganadores** (`/winners`): solo los codigos ya reclamados, con datos del ganador
- **Vista de hologram** (`/card/[code]`): mockup de la pieza fisica con QR real escaneable
- **Validacion publica** (`/v/[code]`): lo que abre el QR al escanearlo. Tres estados:
  - Codigo valido y no reclamado: muestra formulario del ganador
  - Codigo valido pero ya reclamado: muestra fecha de reclamo
  - Codigo no existe: muestra mensaje de codigo invalido

## Stack

- Next.js 15 (app router) + TypeScript
- Tailwind CSS + Lexend (Google Fonts)
- Google Sheets como base de datos (via Sheets API + service account)
- Zod para validacion
- qrcode para generacion de QR escaneables

## Configuracion

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear un Google Cloud project y service account

1. Ir a https://console.cloud.google.com
2. Crear un nuevo proyecto (o usar uno existente)
3. Habilitar **Google Sheets API** en "APIs & Services > Library"
4. Crear una **Service Account** en "IAM & Admin > Service Accounts"
5. Generar una clave JSON para esa service account ("Keys > Add Key > JSON")
6. Guardar el archivo JSON descargado

### 3. Crear el Google Sheet

1. Crear un nuevo Google Sheet
2. Renombrar la primera hoja a `Codes` (o configurar `GOOGLE_SHEETS_TAB`)
3. Copiar el ID del sheet desde la URL: `https://docs.google.com/spreadsheets/d/<ID>/edit`
4. Compartir el sheet con el email de la service account, dandole permiso de **Editor**

### 4. Variables de entorno

Copiar el ejemplo y completar:

```bash
cp .env.local.example .env.local
```

Editar `.env.local`:

```env
GOOGLE_SHEETS_ID=el-id-del-sheet
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_TAB=Codes

NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_BRAND_NAME=BinKis
NEXT_PUBLIC_COLLECTION_NUMBER=777
```

La private key debe estar entre comillas y con los `\n` literales.

### 5. Correr en desarrollo

```bash
npm run dev
```

Abrir http://localhost:3000

La primera vez que se accede a cualquier ruta, el sistema escribe los headers en la hoja:

| code | generated_at | claimed | claimed_at | winner_name | winner_email | winner_phone | winner_address |

## Estructura del proyecto

```
demo/
├── app/
│   ├── (admin)/                  Grupo de rutas del admin (con sidebar)
│   │   ├── layout.tsx
│   │   ├── page.tsx              /          Resumen
│   │   ├── codes/page.tsx        /codes     Lista de codigos
│   │   ├── generate/page.tsx     /generate  Form para generar batch
│   │   └── winners/page.tsx      /winners   Solo reclamados
│   ├── card/[code]/page.tsx      /card/XYZ  Vista del hologram con QR
│   ├── v/[code]/page.tsx         /v/XYZ     Validacion publica (abre el QR)
│   ├── api/
│   │   └── codes/
│   │       ├── generate/route.ts POST
│   │       ├── validate/route.ts GET
│   │       └── claim/route.ts    POST
│   ├── layout.tsx                Font Lexend cargada aqui
│   └── globals.css
├── components/
│   ├── admin/                    Sidebar, Topbar, MetricCard, tablas, forms
│   ├── public/                   HologramCard, QrImage, WinnerForm
│   └── ui/                       Primitives: Button, Input, Badge, Table, Card
├── lib/
│   ├── codes/generator.ts        Generador de codigos unicos (BNK-XXXX-XXXX)
│   ├── sheets/
│   │   ├── client.ts             Google Sheets API + auth
│   │   ├── codes.ts              Queries: appendCodes, findCode, markClaimed
│   │   └── schema.ts             Headers y mapeo row<->record
│   ├── env.ts                    Validacion de env vars con zod
│   ├── format.ts                 Formateo de fechas/numeros (es-MX)
│   └── cn.ts                     Helper de clases
├── types/index.ts                CodeRecord, CodeMetrics, ValidationResult, etc
└── .env.local.example
```

## Formato del codigo

Cada codigo tiene la forma `BNK-XXXX-XXXX` (12 caracteres con prefijo) usando alfabeto de 32 simbolos sin ambiguedades (sin `0/O`, `1/I`, `L`). Eso da ~10^12 combinaciones, mas que suficiente para los 4000 codigos reales y future-proof.

## Flujo del demo para mostrar a David

1. Abrir `/generate`, presionar "Generar 50 codigos"
2. Repetir 2-3 veces para mostrar que el total acumula (ver el sheet en vivo)
3. Ir a `/codes`, copiar un codigo cualquiera
4. Ir a `/card/<codigo>` para ver el hologram fisico simulado
5. Escanear el QR con el celular (o presionar "Simular escaneo")
6. Llenar el formulario del ganador
7. Volver a `/winners` para ver el ganador registrado
8. Volver a escanear el mismo QR: ahora muestra "ya reclamado"
9. Probar `/v/BNK-XXXX-XXXX` con un codigo inventado: muestra "codigo no valido"

Todo se refleja en vivo en el Google Sheet compartido.

## Autenticacion del admin

El panel (`/`, `/codes`, `/generate`, `/winners`, `/verify`, `/lottery`) y las APIs
de administracion (`/api/codes/generate`, `/api/codes/export`, `/api/lottery/run`)
estan protegidos por login. Los usuarios autorizados viven en la tabla
`admin_users` de Supabase (email + password con hash scrypt). Al iniciar sesion se
emite una cookie de sesion firmada con HMAC (`SESSION_SECRET`); la cookie ya **no**
contiene el password.

- **Usuario inicial** (creado por `supabase/schema.sql`): `test@gmail.com` / `test`
- **Variable requerida**: `SESSION_SECRET` (string aleatorio, min 16 chars) — firma las cookies de sesion
- **Agregar / rotar usuarios**: `npm run seed-admin -- <email> <password>`
- **Cerrar sesion**: `DELETE /api/admin/login` (borra la cookie)

> Cambiar `SESSION_SECRET` invalida todas las sesiones activas. El password real
> nunca se guarda en texto plano: solo su hash scrypt en `admin_users`.

## Notas

- El password se guarda con hash scrypt; el admin va detras de login (email + password)
- El demo no incluye rate limiting (en produccion va con anti-fraude por IP + por codigo)
- El demo no incluye importacion CSV (en produccion habra para cargar los 4000 reales)
- El demo no incluye exportacion / reportes
- El demo no incluye envio de notificaciones al ganador (en produccion va por email)
