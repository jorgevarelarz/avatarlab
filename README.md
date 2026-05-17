# AvatarLab

Genera vídeos con cara animada a partir de una foto + audio. Motor: SadTalker en RunPod. Almacenamiento: Cloudflare R2.

---

## Configurar Cloudflare R2

### 1. Crear el bucket

1. Entra en [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object Storage**
2. Haz clic en **Create bucket**
3. Nombre: `avatarlab` — Región: **Automatic**
4. Confirma la creación

### 2. Activar acceso público

1. Dentro del bucket → pestaña **Settings**
2. En **Public access** → **Allow Access**
3. Cloudflare te da una URL del tipo `https://pub-<hash>.r2.dev` — cópiala, es tu `R2_PUBLIC_BASE_URL`

> Alternativa: conecta un dominio propio en **Custom Domains** (ej: `assets.avatarlab.ai`)

### 3. Crear API token (claves de acceso)

1. En la página principal de R2 → **Manage R2 API Tokens** → **Create API Token**
2. Nombre: `avatarlab-server`
3. Permisos: **Object Read & Write**
4. Scope: **Specific bucket → avatarlab**
5. Haz clic en **Create API Token**
6. Copia:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`

> Estas claves solo se muestran una vez.

### 4. Obtener el Account ID

En el dashboard de Cloudflare → barra lateral derecha → **Account ID** → cópialo → `R2_ACCOUNT_ID`

### 5. Configurar CORS (necesario para subidas desde el navegador)

1. En el bucket → **Settings** → **CORS Policy** → **Add CORS policy**
2. Pega este JSON:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://avatarlab.ai"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

3. Guarda.

### 6. Añadir variables al .env

Copia `.env.example` a `.env.local` y rellena:

```bash
cp .env.example .env.local
```

```env
R2_ACCOUNT_ID=abc123def456...
R2_BUCKET=avatarlab
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_PUBLIC_BASE_URL=https://pub-<hash>.r2.dev
MOCK_RENDER=true
```

---

## Probar la conexión con R2

Con el servidor en marcha (`npm run dev`):

```bash
# Test completo: conexión + subida + lectura
curl http://localhost:3000/api/r2-test

# Test completo + borrar el archivo de prueba
curl "http://localhost:3000/api/r2-test?delete=true"
```

Respuesta esperada:
```json
{
  "connection": { "ok": true },
  "upload": { "ok": true, "key": "_test/avatarlab-r2-test-....txt", "url": "https://pub-..." },
  "read": { "ok": true, "content": "AvatarLab R2 connection test OK" },
  "delete": { "skipped": true },
  "summary": "R2 is working correctly"
}
```

---

## Probar subida de imagen y audio

```bash
# Obtener presigned URL para imagen
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d '{"filename":"foto.jpg","contentType":"image/jpeg"}'

# Respuesta: { "uploadUrl": "https://...", "publicUrl": "https://...", "key": "inputs/images/..." }

# Subir el archivo con la uploadUrl recibida
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/ruta/a/foto.jpg

# Obtener presigned URL para audio
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d '{"filename":"audio.mp3","contentType":"audio/mpeg"}'
```

Los archivos quedan guardados en:
- Imágenes → `inputs/images/<uuid>.jpg`
- Audio → `inputs/audio/<uuid>.mp3`

---

## Probar render mock (sin RunPod)

Con `MOCK_RENDER=true` en `.env.local`:

```bash
# 1. Lanzar job mock
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"photo_url":"https://example.com/foto.jpg","audio_url":"https://example.com/audio.mp3"}'

# Respuesta: { "jobId": "mock_1716123456789", "mock": true }

# 2. Consultar estado (antes de 8s → IN_PROGRESS)
curl "http://localhost:3000/api/status?jobId=mock_1716123456789"
# { "status": "IN_PROGRESS", "progress": 45, "mock": true }

# 3. Consultar estado (después de 8s → COMPLETED)
curl "http://localhost:3000/api/status?jobId=mock_1716123456789"
# { "status": "COMPLETED", "video_url": "https://...BigBuckBunny.mp4", "mock": true }
```

También puedes probarlo desde la UI en `http://localhost:3000` — sube cualquier imagen y audio, el flujo completo funciona en modo mock.

---

## Qué falta antes de activar RunPod

- [x] R2 bucket creado y variables configuradas
- [x] `GET /api/r2-test` devuelve `"summary": "R2 is working correctly"`
- [x] Subida de imagen y audio desde la UI funciona
- [x] Mock render completo funciona de principio a fin
- [ ] Cuenta RunPod creada y saldo añadido
- [ ] Imagen Docker construida y subida a Docker Hub
- [ ] Endpoint serverless creado en RunPod con la imagen
- [ ] Variables `RUNPOD_API_KEY` y `RUNPOD_ENDPOINT_ID` añadidas al `.env.local`
- [ ] Variables R2 añadidas al entorno del endpoint en RunPod
- [ ] `MOCK_RENDER=false` y primer render real probado

---

## Conectar RunPod

### 1. Crear cuenta y añadir saldo

1. Regístrate en [runpod.io](https://runpod.io)
2. Ve a **Billing** → añade mínimo **$10** de crédito (suficiente para ~50 renders de prueba)

### 2. Construir la imagen Docker

Desde la carpeta `worker/`:

```bash
cd avatarlab/worker

# Build (tarda ~15-20 min, descarga ~5GB de modelos)
docker build -t tuusuario/avatarlab-worker:latest .

# Verificar que arranca
docker run --rm tuusuario/avatarlab-worker:latest python -c "import runpod; print('OK')"
```

### 3. Subir a Docker Hub

```bash
docker login
docker push tuusuario/avatarlab-worker:latest
```

> Alternativa: usa [GitHub Container Registry](https://ghcr.io) (`ghcr.io/tuusuario/avatarlab-worker:latest`)

### 4. Crear endpoint serverless en RunPod

1. RunPod dashboard → **Serverless** → **New Endpoint**
2. Rellena:
   - **Name:** `avatarlab`
   - **Container Image:** `tuusuario/avatarlab-worker:latest`
   - **GPU:** RTX 3090 o A4000 (24GB VRAM recomendado)
   - **Max Workers:** 3
   - **Idle Timeout:** 5s (se apaga rápido para ahorrar)
3. En **Environment Variables** añade:
   ```
   R2_ACCOUNT_ID=33eed8851d737a072c2327ccd1a63dba
   R2_BUCKET=avatarlab
   R2_ACCESS_KEY_ID=25ccca024685eb64ead6d3de933c32f2
   R2_SECRET_ACCESS_KEY=705ca3ef0249fd899a97e8a5091e69f084ab288fd3e4ed648a49ead31ab5bb71
   R2_PUBLIC_BASE_URL=https://pub-3497ee275c334614a72876c8cf4a9c70.r2.dev
   ```
4. Clic en **Deploy** → copia el **Endpoint ID** de la URL

### 5. Añadir claves al .env.local

```bash
# RunPod dashboard → Settings → API Keys → Create
RUNPOD_API_KEY=rpa_...
RUNPOD_ENDPOINT_ID=abc123xyz
MOCK_RENDER=false
```

### 6. Probar un job real

```bash
# 1. Sube foto y audio a R2 (igual que en mock)
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d '{"filename":"lucas.png","contentType":"image/png"}'

# 2. Lanza job real
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"photo_url":"https://pub-....r2.dev/inputs/images/....png","audio_url":"https://pub-....r2.dev/inputs/audio/....mp3"}'
# Respuesta: { "jobId": "abc-123-xyz" }  ← sin "mock:true"

# 3. Polling (RunPod tarda 5-15 min en cold start la primera vez)
curl "http://localhost:3000/api/status?jobId=abc-123-xyz"
# { "status": "queued" }   → esperando GPU
# { "status": "processing" } → SadTalker corriendo
# { "status": "completed", "video_url": "https://pub-....r2.dev/outputs/....mp4" }
```

### 7. Errores comunes a vigilar

| Error | Causa | Solución |
|---|---|---|
| `RUNPOD_API_KEY is not set` | Variable no cargada | Reinicia el servidor tras editar `.env.local` |
| `status: "failed"` inmediato | Error en el worker | Revisa los logs en RunPod → Endpoint → Jobs |
| Cold start lento (>5 min) | Primera vez que arranca la imagen | Normal en serverless; el segundo job es ~30s |
| `R2 upload failed` en el worker | Variables R2 no seteadas en RunPod | Añade las variables de entorno en el endpoint |
| `No output video generated` | SadTalker no detectó cara | Usa foto con cara frontal, bien iluminada |
| `Download failed` | URL de R2 privada | Asegura que el bucket tiene **public access** activado |

---

## Estructura del proyecto

```
avatarlab/
├── worker/                  # Docker para RunPod (SadTalker)
│   ├── Dockerfile
│   └── handler.py
└── web/                     # Next.js app
    ├── app/
    │   ├── page.tsx          # UI principal (upload + resultado)
    │   ├── pricing/          # Página de planes
    │   └── api/
    │       ├── upload/       # Presigned URLs para R2
    │       ├── generate/     # Lanza job (mock o RunPod)
    │       ├── status/       # Estado del job
    │       ├── r2-test/      # Test de conexión R2
    │       └── stripe/       # Checkout y webhook
    ├── lib/
    │   ├── r2.ts             # Cliente S3/R2
    │   └── runpod.ts         # Cliente RunPod API
    └── .env.example
```
