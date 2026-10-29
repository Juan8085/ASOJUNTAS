# ConectaJAC — Plataforma SaaS Multi-Tenant Comunal

Plataforma integral diseñada para la administración y articulación de las **Juntas de Acción Comunal (JAC)** a nivel municipal, coordinada por **Asojuntas** y conectada con los habitantes de veredas y barrios.

---

## 🏛️ 1. Arquitectura y Estilo de Diseño

- **Monolito Modular con Clean Architecture / Hexagonal:**
  - `domain`: Entidades puras, reglas de negocio y puertos (interfaces).
  - `application`: Casos de uso y orquestación de servicios.
  - `infrastructure`: Adaptadores de persistencia (Prisma/PostgreSQL), pasarelas (Wompi, MercadoPago), colas (BullMQ) y notificaciones (WhatsApp Cloud API, Expo Push).
  - `presentation`: Controladores REST Fastify con DTOs validados mediante Zod.
- **Estrategia Multi-Tenant y Seguridad:**
  - Base de datos compartida con discriminador `tenant_id` (`jac_id`).
  - Aislamiento reforzado por **Row-Level Security (RLS)** en PostgreSQL a nivel de motor de base de datos.
  - Excepciones controladas: Módulo público de **Mercado Campesino** (visible para todo el municipio) y vista de auditoría/consolidación de **Super Admin (Asojuntas)**.
- **Enfoque Offline-First (Crítico para Veredas):**
  - Aplicación móvil construida en React Native (Expo) con persistencia local en `AsyncStorage`/`MMKV` y TanStack Query para lectura offline de convocatorias, certificados y productos.

---

## 📁 2. Estructura del Monorepo (Turborepo + pnpm)

```text
conectajac/
├── apps/
│   ├── api/                    # Backend NestJS + Fastify (Clean Architecture)
│   │   ├── src/
│   │   │   ├── core/           # Guards (Tenant, RBAC), Pipes (Zod), Interceptors
│   │   │   └── modules/        # Módulos de dominio (Auth, Tenants, Affiliates, Treasury, Market, etc.)
│   ├── web-admin/              # Panel Web Next.js (App Router, Tailwind, shadcn/ui)
│   │   └── src/                # Vistas para Asojuntas (Super Admin) y Directivos de JAC
│   └── mobile-citizen/         # App Móvil Expo (React Native + NativeWind) + PWA
│       └── src/                # Interfaz del habitante (Pagos, Mercado, Mingas, PQRSD)
├── packages/
│   ├── database/               # Esquema Prisma, cliente tipado y políticas RLS
│   │   └── prisma/
│   │       ├── schema.prisma   # Modelo de datos exhaustivo
│   │       └── rls_policies.sql# Políticas de Row-Level Security en PostgreSQL
│   ├── shared/                 # Zod schemas, tipos TypeScript y enums compartidos
│   ├── typescript-config/      # Configuraciones base de TypeScript
│   └── eslint-config/          # Reglas estrictas de linting
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 💳 3. Pasarelas de Pago y Adapter Pattern

Soporte desacoplado para pasarelas nacionales (`Wompi`, `MercadoPago`, `ePayco`):
- Transacciones idempotentes con `idempotency_key`.
- Validación de firmas criptográficas en Webhooks.
- Registro en doble partida en el módulo de Tesorería (`treasury_transactions`).

---

## 📲 4. Notificaciones Multicanal

- Notificaciones Push para smartphones con conectividad mediante Expo Push.
- Adaptador para **WhatsApp Business Cloud API** para envío de alertas comunitarias urgentes, paz y salvos y citaciones de asamblea a residentes veredales sin conexión regular de datos.
