# 📋 AI Image Generator — Архитектура проекта

**Дата согласования:** 12 октября 2025  
**Версия:** 1.0

---

## 🎯 Общее описание

**SaaS-платформа для генерации изображений с помощью AI** (Gemini 2.5 Flash Image через BotHub API).

### Основные возможности:
- Загрузка изображения пользователем
- Текстовый промпт для трансформации
- Генерация через OpenAI-compatible API
- Real-time прогресс генерации через SSE
- Система кредитов и биллинг
- История генераций

---

## 🏗️ Tech Stack

### Frontend
```yaml
Framework: Next.js 14 (App Router)
Language: TypeScript
Styling: Tailwind CSS
State: React hooks (возможно Zustand)
Real-time: EventSource (SSE)
```

### Backend
```yaml
Framework: NestJS 11
Language: TypeScript
Runtime: Node.js 20
API Style: RESTful
```

### Инфраструктура
```yaml
Database: PostgreSQL 15
ORM: Prisma
Cache & Queue: Redis 7
Queue Library: BullMQ
File Storage: MinIO (S3-compatible)
Auth: NextAuth.js / Passport JWT
Payments: Stripe
Containerization: Docker + Docker Compose
```

### AI Integration
```yaml
Provider: BotHub (OpenAI-compatible API)
Model: gemini-2.5-flash-image-preview
SDK: openai (official Node.js)
```

---

## 🎨 Ключевые архитектурные решения

### 1. **Файловое хранилище через абстракцию (предложение пользователя)**

> "картинки должны выгружаться/загружаться через отдельный хэндл (gallery например) и на бэке им должен присваиваться id сопоставляемый с minIO, это более масштабируемое решение"

**Реализация:**
- ✅ Все файлы загружаются через `/api/gallery/upload`
- ✅ В БД создаётся запись `File` с уникальным ID
- ✅ Связь: `File.path` → путь к объекту в MinIO
- ✅ Генерации ссылаются на `File.id`, а не на прямые URL
- ✅ Возможность дедупликации через SHA256 hash

**Преимущества:**
- Абстракция storage (можно сменить MinIO на S3/R2)
- Контроль доступа через API
- Аналитика использования файлов
- Soft delete без физического удаления
- Миграция данных без изменения ID

---

### 2. **MinIO как production storage**

> "мне нравится minIO на проде. будем считать что у меня уже есть minIO в каком-то контейнере"

**Конфигурация:**
- MinIO запущен в отдельном контейнере
- S3-compatible API через `@aws-sdk/client-s3`
- Buckets: `generations` (unified bucket для всех файлов)
- Структура путей: `uploads/{uuid}.png`, `generations/{uuid}.png`

**Интеграция:**
```typescript
StorageService → MinIO (prod) / Local MinIO (dev)
```

---

### 3. **Асинхронная генерация с очередями**

**Flow:**
```
POST /api/generate
  → Upload input to MinIO
  → Create DB record (status: PENDING)
  → Add job to Redis Queue (BullMQ)
  → Return { jobId, streamUrl }

GET /api/generate/stream/:jobId (SSE)
  → Subscribe to Redis Pub/Sub
  → Stream progress events

Worker Process
  → Pull job from queue
  → Download input from MinIO
  → Call OpenAI API
  → Upload result to MinIO
  → Update DB (status: COMPLETED)
  → Publish progress via Redis Pub/Sub
```

**Компоненты:**
- **BullMQ** — управление очередью задач
- **Redis Pub/Sub** — доставка событий прогресса
- **SSE (Server-Sent Events)** — real-time обновления на фронтенде
- **Worker процессы** — масштабируемая обработка (можно запустить несколько)

---

### 4. **Разделение API и Worker процессов**

```
┌─────────────────┐
│  NestJS API     │  (обрабатывает HTTP запросы)
│  - Auth         │
│  - Gallery      │
│  - Generate     │
│  - Tools        │
│  - SSE Gateway  │
└────────┬────────┘
         │
    ┌────▼─────┐
    │  Redis   │
    │  Queue   │
    └────┬─────┘
         │
┌────────▼────────┐
│ NestJS Worker   │  (обрабатывает очередь)
│ - Processor     │
│ - OpenAI calls  │
│ - File upload   │
└─────────────────┘
```

**Масштабирование:**
- API: горизонтальное (несколько инстансов за load balancer)
- Worker: горизонтальное (BullMQ автоматически распределяет задачи)

---

## 🗄️ Database Schema (Prisma)

### Ключевые таблицы

#### **File** — центральная таблица для файлов
```prisma
model File {
  id            String   @id @default(cuid())
  originalName  String   // Оригинальное имя
  filename      String   @unique // UUID в MinIO
  path          String   // Полный path: uploads/xxx.png
  bucket        String   @default("generations")
  
  hash          String   @unique // SHA256 для дедупликации
  mimeType      String
  size          Int
  width         Int?
  height        Int?
  
  userId        String
  isPublic      Boolean  @default(false)
  downloadCount Int      @default(0)
  
  createdAt     DateTime @default(now())
  deletedAt     DateTime? // Soft delete
  
  user                User         @relation(...)
  inputGenerations    Generation[] @relation("InputFiles")
  outputGenerations   Generation[] @relation("OutputFiles")
}
```

#### **Generation** — задачи генерации
```prisma
model Generation {
  id              String           @id @default(cuid())
  jobId           String           @unique // BullMQ job ID
  
  userId          String
  inputFileId     String?          // Ссылка на File.id
  outputFileId    String?          // Ссылка на File.id
  
  prompt          String           @db.Text
  model           String
  status          GenerationStatus // PENDING, GENERATING, COMPLETED, FAILED
  progress        Int              @default(0)
  
  textResponse    String?          @db.Text
  error           String?          @db.Text
  creditsUsed     Int              @default(1)
  durationMs      Int?
  
  createdAt       DateTime         @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  
  user            User
  inputFile       File?            @relation("InputFiles")
  outputFile      File?            @relation("OutputFiles")
}
```

#### **User** — пользователи
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  credits       Int       @default(10)
  role          UserRole  @default(USER)
  
  createdAt     DateTime  @default(now())
  deletedAt     DateTime?
  
  files         File[]
  generations   Generation[]
  transactions  Transaction[]
}
```

#### **Transaction** — финансовые операции
```prisma
model Transaction {
  id          String            @id @default(cuid())
  userId      String
  type        TransactionType   // PURCHASE, USAGE, REFUND, BONUS
  amount      Int               // +100 / -1
  stripeId    String?           @unique
  status      PaymentStatus
  createdAt   DateTime          @default(now())
}
```

---

## 🔄 API Endpoints

### Gallery Service
```
POST   /api/gallery/upload          # Загрузить файл
GET    /api/gallery/:fileId         # Скачать файл
GET    /api/gallery/user/:userId    # Список файлов пользователя
DELETE /api/gallery/:fileId         # Удалить файл (soft delete)
```

### Generation Service
```
POST   /api/generations/create      # Создать задачу генерации
GET    /api/generations/stream/:jobId # SSE stream прогресса
GET    /api/generations/:id         # Получить результат
GET    /api/generations/list        # История генераций
DELETE /api/generations/:id         # Отменить/удалить
```

### Tools Service
```
GET    /api/tools/list              # Список инструментов
POST   /api/tools/:toolName/call    # Вызвать инструмент
```

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout
```

### User
```
GET    /api/user/credits            # Баланс кредитов
GET    /api/user/transactions       # История транзакций
```

### Payments (Stripe)
```
POST   /api/payments/create-checkout # Создать сессию оплаты
POST   /api/payments/webhook         # Stripe webhook
```

---

## 📊 Data Flow диаграмма

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Upload image
     ▼
┌──────────────────┐
│ POST /gallery    │
│   /upload        │
└────┬─────────────┘
     │ 2. Save to MinIO
     ▼
┌──────────────────┐
│  MinIO           │
│  uploads/xxx.png │
└────┬─────────────┘
     │ 3. Create File record
     ▼
┌──────────────────┐
│  PostgreSQL      │
│  File table      │
└────┬─────────────┘
     │ 4. Return fileId
     ▼
┌──────────────────┐
│  Frontend        │
│  Got fileId      │
└────┬─────────────┘
     │ 5. Submit prompt + fileId
     ▼
┌──────────────────┐
│ POST /generations│
│   /create        │
└────┬─────────────┘
     │ 6. Create Generation (PENDING)
     ▼
┌──────────────────┐
│  PostgreSQL      │
│  Generation      │
└────┬─────────────┘
     │ 7. Add to Redis Queue
     ▼
┌──────────────────┐
│  BullMQ Queue    │
└────┬─────────────┘
     │ 8. Open SSE stream
     ▼
┌──────────────────┐
│ GET /generations │
│   /stream/:jobId │
└────┬─────────────┘
     │ 9. Subscribe Redis Pub/Sub
     ▼
┌──────────────────┐
│ Redis Pub/Sub    │
│ job:{jobId}      │
└────┬─────────────┘
     │
     │ 10. Worker pulls job
     ▼
┌──────────────────┐
│  Worker          │
│  Processor       │
└────┬─────────────┘
     │ 11. Download from MinIO
     │ 12. Call OpenAI API
     │ 13. Upload result to MinIO
     │ 14. Update DB (COMPLETED)
     │ 15. Publish progress
     ▼
┌──────────────────┐
│  Frontend        │
│  Receives SSE    │
│  Shows result    │
└──────────────────┘
```

---

## 🐳 Docker Compose структура

```yaml
services:
  postgres:      # PostgreSQL база
  redis:         # Очереди + Pub/Sub
  minio:         # Существующий контейнер (не создаём)
  api:           # NestJS API процесс
  worker:        # NestJS Worker процесс (scale: 2+)
  web:           # Next.js frontend (опционально в dev)
```

---

## 📁 Структура проекта

```
neurophoto/
├── back/
│   └── nest-back/          # NestJS Backend
│       ├── src/
│       │   ├── prisma/     # Prisma client
│       │   ├── storage/    # MinIO интеграция
│       │   ├── queue/      # BullMQ
│       │   ├── openai/     # OpenAI client
│       │   ├── generation/ # Генерация изображений
│       │   ├── tools/      # Инструменты
│       │   ├── utils/      # Утилиты
│       │   └── gallery/    # Управление файлами
│       └── prisma/
│           └── schema.prisma
│
├── neurophoto-front/       # Next.js Frontend
│   └── app/
│       └── components/
│
└── docker-compose.yml
```

---

## 🔐 Environment Variables

### Backend (NestJS)
```env
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/imageai

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=your-minio-host
MINIO_PORT=9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_USE_SSL=false

# AI
OPENAI_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_BASE_URL=https://bothub.chat/api/v2/openai/v1
MODEL_NAME=gemini-2.5-flash-image-preview

# Auth
JWT_SECRET=your-secret
NEXTAUTH_SECRET=your-nextauth-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Frontend (Next.js)
```env
NEXT_PUBLIC_API_URL=/api
```

---

## 🚀 Следующие шаги реализации

### Phase 1: Базовая инфраструктура
- [x] Спроектирована архитектура
- [x] Согласована Prisma schema
- [x] Настроить NestJS проект
- [x] Настроить Prisma + миграции
- [x] Настроить Redis + BullMQ
- [x] Настроить MinIO client

### Phase 2: Core Services
- [x] StorageService (MinIO интеграция)
- [x] QueueService (BullMQ)
- [x] OpenAIService (AI вызовы)

### Phase 3: Gallery API
- [x] POST /gallery/upload
- [x] GET /gallery/:fileId
- [x] File дедупликация (hash)
- [x] Soft delete (implemented)

### Phase 4: Generation API
- [x] POST /generations/create (создание задачи)
- [x] GET /generations/stream/:jobId (SSE)
- [x] GenerationProcessor (worker)
- [x] Обработка прогресса

### Phase 4.5: Tools API
- [x] GET /tools/list
- [x] POST /tools/:toolName/call

### Phase 5: Frontend
- [x] Upload компонент
- [x] Форма генерации
- [x] SSE клиент
- [x] Отображение результата

### Phase 6: Auth & Billing
- [ ] Auth (backend + frontend)
- [ ] Система кредитов (backend + frontend)
- [ ] Billing (платёжные транзакции, backend + frontend)
- [not now] СБП checkout (например CLoudKassir+TBank)
- [not now] Webhooks

---

## 📝 Важные заметки

1. **Файлы через ID** — генерации ссылаются на `File.id`, не на URL
2.
3. **Дедупликация через hash** — один файл в MinIO, несколько записей в БД
4. **SSE для real-time** — не WebSocket, проще для статуса задач
5. **Worker'ы масштабируются** — можно запустить несколько процессов (по умолчанию 2 + 1 (api container))
6. **Soft delete** — файлы не удаляются сразу физически

---

## 🔧 Конвенции и паттерны

### Frontend
- React hooks для state management
- Tailwind CSS для стилизации
- Строгая типизация TypeScript
- SSE для real-time обновлений

### Backend
- NestJS — DI (Dependency Injection)
- Контроллеры, сервисы, модули
- DTO для валидации входных данных
- Prisma для работы с БД
- BullMQ для очередей
- CORS настроен для фронтенда

### Тестирование
- Backend: Jest (unit и e2e тесты)
- Линтинг: ESLint + Prettier

---

**Конец документа** — всё согласовано и готово к реализации 🚀
