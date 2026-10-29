# ConectaJAC — Plataforma SaaS Multi-Tenant Comunal (Ley 2166 de 2021)

Plataforma integral diseñada para la digitalización, transparencia y articulación de las **Juntas de Acción Comunal (JAC)** a nivel municipal, coordinada por **Asojuntas** y conectada con los habitantes y campesinos de veredas y barrios de Colombia.

---

## 🏛️ 1. Arquitectura y Estilo de Diseño

- **Monolito Modular con Clean Architecture / Hexagonal (`apps/api`):**
  - **Dominio**: Entidades puras, reglas de negocio estatutarias y puertos (`ports`).
  - **Aplicación**: Casos de uso y orquestación de servicios (Certificados, Tesorería, Asambleas, Mingas, Mercado).
  - **Infraestructura**: Adaptadores de persistencia (Prisma con PostgreSQL RLS), pasarelas (Wompi PSE/Nequi/Bancolombia) y notificaciones (WhatsApp Business Cloud API, Expo Push).
  - **Presentación**: Controladores REST Fastify de alto rendimiento documentados con Swagger OpenAPI en `/docs`.
- **Estrategia Multi-Tenant y Seguridad:**
  - Base de datos compartida con discriminador `tenant_id` (`jac_id`).
  - Aislamiento reforzado por **Row-Level Security (RLS)** en PostgreSQL a nivel de motor de base de datos (`SET LOCAL app.current_tenant_id`).
  - Excepciones controladas: Directorio público de JACs, **Mercado Campesino** (visible para todo el municipio) y vista de auditoría/consolidación de **Super Admin (Asojuntas)**.
- **Enfoque Offline-First para la Ruralidad (`apps/mobile-citizen`):**
  - Aplicación móvil construida en React Native (Expo) con persistencia local en `AsyncStorage` y TanStack Query (`networkMode: "offlineFirst"` con 7 días de retención de caché) para lectura de convocatorias, carnet digital y cosechas sin cobertura celular.

---

## 📁 2. Estructura del Monorepo (Turborepo + pnpm)

```text
conectajac/
├── apps/
│   ├── api/                    # Backend NestJS 11 + Fastify (Clean Architecture)
│   │   ├── src/
│   │   │   ├── core/           # Guards (Tenant, RolesGuard), Pipes (Zod), Interceptors
│   │   │   ├── database/       # PrismaService con RLS transaction wrapper
│   │   │   └── modules/        # Auth, Jacs, Affiliates, Certificates, Payments,
│   │   │                       # Treasury, Assemblies, Mingas, Marketplace, Pqrsd, Posts
│   ├── web-admin/              # Panel Web Next.js 15 (App Router, Tailwind, TanStack Query)
│   │   └── src/                # Vistas para Asojuntas (Super Admin) y Directivos de JAC
│   └── mobile-citizen/         # App Móvil Expo (React Native + NativeWind) + QR
│       └── src/                # Carnet Digital, Mercado Campesino, Pagos PSE, Mingas
├── packages/
│   ├── database/               # Esquema Prisma, cliente tipado, políticas RLS y seed
│   │   └── prisma/
│   │       ├── schema.prisma   # Modelo de datos exhaustivo
│   │       ├── rls_policies.sql# Políticas de Row-Level Security en PostgreSQL
│   │       └── seed.ts         # Datos de prueba reales de veredas de Colombia
│   ├── shared/                 # Zod schemas, tipos TypeScript y enums compartidos
│   ├── typescript-config/      # Configuraciones base de TypeScript
│   └── eslint-config/          # Reglas estrictas de linting
├── docker-compose.yml          # PostgreSQL 16 + Redis 7
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 🚀 3. Guía de Puesta en Marcha Rápida

### Prerrequisitos
- Node.js >= 20.0.0
- pnpm >= 9.0.0 (`npm i -g pnpm`)
- Docker & Docker Compose

### 1. Clonar e Instalar Dependencias
```bash
git clone https://github.com/Juan8085/ASOJUNTAS.git
cd ASOJUNTAS
pnpm install
```

### 2. Iniciar Servicios Base (PostgreSQL & Redis)
```bash
docker compose up -d
```

### 3. Configurar Variables de Entorno
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web-admin/.env.example apps/web-admin/.env
cp apps/mobile-citizen/.env.example apps/mobile-citizen/.env
```

### 4. Sincronizar Base de Datos y Sembrar Datos de Prueba
```bash
# Generar cliente de Prisma
pnpm --filter @conectajac/database db:generate

# Crear tablas en PostgreSQL
pnpm --filter @conectajac/database db:push

# Aplicar políticas RLS (opcional en PostgreSQL)
# psql -U conectajac_admin -d conectajac_db -f packages/database/prisma/rls_policies.sql

# Poblar municipios, JACs, directivos, afiliados, tesorería y mercado campesino
pnpm --filter @conectajac/database db:seed
```

### 5. Iniciar Servidores en Desarrollo
```bash
# Iniciar todo el ecosistema en paralelo
pnpm dev

# O iniciar componentes individuales:
pnpm --filter @conectajac/api dev          # API: http://localhost:4000 (Swagger: /docs)
pnpm --filter @conectajac/web-admin dev    # Web Admin: http://localhost:3000
pnpm --filter @conectajac/mobile-citizen start # App Móvil Expo
```

---

## 👥 4. Cuentas y Credenciales de Prueba (Semilla)

Todas las cuentas de prueba tienen la contraseña: `Password123!`

| Rol / Institución | Correo Electrónico | Documento | Alcance y Permisos |
| :--- | :--- | :--- | :--- |
| **Super Admin (Asojuntas)** | `admin@asojuntas.org` | CC `1098000001` | Consolidación municipal, onboarding de nuevas JACs, censo comunal. |
| **Presidente JAC El Salado** | `presidente.salado@conectajac.org` | CC `1098777001` | Firma de certificados, convocatorias a asamblea y mingas, administración. |
| **Secretaria JAC El Salado** | `secretaria.salado@conectajac.org` | CC `1098777002` | Custodia y registro del Libro Digital de Afiliados (Folios Ley 2166). |
| **Tesorero JAC El Salado** | `tesorero.salado@conectajac.org` | CC `1098777003` | Recaudo de cuotas, libro de caja menor, bancos y reportes de paz y salvo. |
| **Campesino / Productor** | `campesino.salado@conectajac.org` | CC `1098777004` | Folio #4, carnet digital, catálogo de cosechas en Mercado Campesino. |
| **Ciudadana Afiliada** | `ciudadana.salado@conectajac.org` | CC `1098777005` | Folio #5, trámite de certificado de residencia con QR, pagos PSE. |

---

## ⚖️ 5. Cumplimiento Normativo (Ley 2166 de 2021)

1. **Libro Digital de Afiliados (Art. 18-25)**:
   - Numeración consecutiva e inalterable de folios por tomo/libro.
   - Registro de datos veredales (predio, finca, ocupación, cédula de ciudadanía).
2. **Certificados con Autenticidad Criptográfica**:
   - Residencia, Afiliación y Paz y Salvo con token SHA-256 inmutable y código QR.
   - Verificación pública instantánea en endpoint `/certificates/verify/:code`.
   - Validación automática de no adeudar cuotas antes de expedir Paz y Salvo.
3. **Tesorería y Rendición de Cuentas (Art. 45-52)**:
   - Registro de cuotas ordinarias, extraordinarias y multas reglamentarias por inasistencia a mingas.
   - Libro de caja menor en efectivo y cuentas bancarias (Banco Agrario / Daviplata / Nequi).
4. **Asambleas Generales y Voto Secreto (Art. 30-36)**:
   - Convocatorias con control de quórum reglamentario (50% + 1).
   - Votaciones secretas encriptadas con AES-256 y hash HMAC para prevenir suplantación o doble voto.
5. **Mercado Campesino Veredal**:
   - Promoción de la soberanía alimentaria y circuitos cortos de comercialización campesina sin intermediarios.

---

## 🛠️ 6. Scripts y Verificación de Calidad

```bash
# Validar tipos TypeScript en todo el monorepo (7 paquetes)
pnpm turbo run check-types

# Compilar para producción (Next.js + NestJS + Shared)
pnpm turbo run build

# Formatear código fuente
pnpm format
```
