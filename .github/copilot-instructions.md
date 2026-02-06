# AI Image Generator — Project Architecture

**Approved Date:** October 12, 2025
**Version:** 1.0

---

## Overview

SaaS platform for AI image generation and editing (Gemini 2.5 Flash Image Preview via BotHub API).

### Core Capabilities

- User image upload
- Text prompt for transformations
- OpenAI-compatible API generation
- Real-time progress via SSE
- Credits and billing system
- Generation history

---

## Tech Stack

### Frontend
```yaml
Framework: Next.js 14 (App Router)
Language: TypeScript
Styling: Tailwind CSS
State: React hooks (optional Zustand)
Real-time: EventSource (SSE)
```

### Backend
```yaml
Framework: NestJS 11
Language: TypeScript
Runtime: Node.js 20
API Style: RESTful
```

### Infrastructure
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

## Key Architecture Decisions

### 1. File Storage Abstraction

> Images are uploaded/downloaded via a dedicated handler (e.g., gallery), and the backend assigns an ID mapped to MinIO for scalability.

**Implementation:**
- Files are uploaded via `/api/gallery/upload`
- DB creates a `File` record with unique ID
- `File.path` maps to MinIO object path
- Generations reference `File.id`, not direct URLs
- Optional deduplication via SHA256 hash

**Benefits:**
- Storage abstraction (MinIO can be swapped with S3/R2)
- Access control through API
- File usage analytics
- Soft delete without physical removal
- Data migration without ID changes

---

### 2. MinIO as Production Storage

**Configuration:**
- MinIO runs in a separate container
- S3-compatible API via `@aws-sdk/client-s3`
- Buckets: `generations` (unified bucket)
- Path structure: `uploads/{uuid}.png`, `generations/{uuid}.png`

**Integration:**
```typescript
StorageService -> MinIO (prod) / Local MinIO (dev)
```

---

### 3. Asynchronous Generation with Queues

**Flow:**
```
POST /api/generate
  -> Upload input to MinIO
  -> Create DB record (status: PENDING)
  -> Add job to Redis Queue (BullMQ)
  -> Return { jobId, streamUrl }

GET /api/generate/stream/:jobId (SSE)
  -> Subscribe to Redis Pub/Sub
  -> Stream progress events

Worker Process
  -> Pull job from queue
  -> Download input from MinIO
  -> Call OpenAI API
  -> Upload result to MinIO
  -> Update DB (status: COMPLETED)
  -> Publish progress via Redis Pub/Sub
```

**Components:**
- BullMQ for job queue management
- Redis Pub/Sub for progress events
- SSE for real-time updates
- Worker processes for scalable processing

---

### 4. Separate API and Worker Processes

```
+-------------------+     +--------------------+
|  NestJS API       |     |  NestJS Worker      |
|  - Auth           |     |  - Queue Processor  |
|  - Gallery        |     |  - OpenAI calls     |
|  - Generate       |     |  - File uploads     |
|  - SSE Gateway    |     +--------------------+
+---------+---------+
          |
          v
+-------------------+
| Redis Queue       |
+-------------------+
```

**Scaling:**
- API scales horizontally behind a load balancer
- Worker scales horizontally; BullMQ distributes jobs

---

## Database Schema (Prisma)

### Core Tables

#### **File** — central file storage table
```prisma
model File {
  id            String   @id @default(cuid())
  originalName  String   // Original name
  filename      String   @unique // UUID in MinIO
  path          String   // Full path: uploads/xxx.png
  bucket        String   @default("generations")

  hash          String   @unique // SHA256 for deduplication
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

#### **Generation** — generation tasks
```prisma
model Generation {
  id              String           @id @default(cuid())
  jobId           String           @unique // BullMQ job ID

  userId          String
  inputFileId     String?          // Reference to File.id
  outputFileId    String?          // Reference to File.id

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

#### **User** — users
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

#### **Transaction** — billing records
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

## API Endpoints

### Gallery Service
```
POST   /api/gallery/upload          # Upload file
GET    /api/gallery/:fileId         # Download file
GET    /api/gallery/user/:userId    # List user files
DELETE /api/gallery/:fileId         # Soft delete
```

### Generation Service
```
POST   /api/generations/create      # Create generation task
GET    /api/generations/stream/:jobId # SSE stream
GET    /api/generations/:id         # Get result
GET    /api/generations/list        # Generation history
DELETE /api/generations/:id         # Cancel/delete
```

### Tools Service
```
GET    /api/tools/list              # Tool list
POST   /api/tools/:toolName/call    # Call tool
```

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout
POST   /api/auth/refresh
```

### User
```
GET    /api/user/credits            # Credit balance
GET    /api/user/transactions       # Transaction history
```

### Payments (Stripe)
```
POST   /api/payments/create-checkout # Create checkout session
POST   /api/payments/webhook         # Stripe webhook
```

---

## Data Flow Diagram

```
+---------+
|  User   |
+----+----+
     | 1. Upload image
     v
+--------------------+
| POST /gallery/upload|
+---------+----------+
          | 2. Save to MinIO
          v
+--------------------+
|       MinIO        |
+---------+----------+
          | 3. Create File record
          v
+--------------------+
|    PostgreSQL      |
+---------+----------+
          | 4. Return fileId
          v
+--------------------+
|     Frontend       |
+---------+----------+
          | 5. Submit prompt + fileId
          v
+--------------------+
| POST /generations  |
+---------+----------+
          | 6. Create Generation (PENDING)
          v
+--------------------+
|    PostgreSQL      |
+---------+----------+
          | 7. Add to Redis Queue
          v
+--------------------+
|     BullMQ Queue   |
+---------+----------+
          | 8. Open SSE stream
          v
+--------------------+
| GET /generations   |
| /stream/:jobId     |
+---------+----------+
          | 9. Subscribe Redis Pub/Sub
          v
+--------------------+
|  Redis Pub/Sub     |
+---------+----------+
          | 10. Worker pulls job
          v
+--------------------+
|      Worker        |
+---------+----------+
          | 11. Download from MinIO
          | 12. Call OpenAI API
          | 13. Upload result to MinIO
          | 14. Update DB (COMPLETED)
          | 15. Publish progress
          v
+--------------------+
|     Frontend       |
|  Receives SSE      |
+--------------------+
```

---

## Docker Compose Structure

```yaml
services:
  postgres:      # PostgreSQL database
  redis:         # Queue + Pub/Sub
  minio:         # Existing MinIO container
  api:           # NestJS API process
  worker:        # NestJS Worker process (scale 2+)
  web:           # Next.js frontend (optional in dev)
```

---

## Project Structure

```
neurophoto/
├── back/
│   └── nest-back/          # NestJS Backend
│       ├── src/
│       │   ├── prisma/     # Prisma client
│       │   ├── storage/    # MinIO integration
│       │   ├── queue/      # BullMQ
│       │   ├── openai/     # OpenAI client
│       │   ├── generation/ # Image generation
│       │   ├── tools/      # Tools
│       │   ├── utils/      # Utilities
│       │   └── gallery/    # File management
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

## Environment Variables

### Backend (NestJS)
```env
DATABASE_URL=postgresql://user:pass@postgres:5432/imageai
REDIS_HOST=redis
REDIS_PORT=6379
MINIO_ENDPOINT=your-minio-host
MINIO_PORT=9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_USE_SSL=false
OPENAI_API_KEY=your-api-key
OPENAI_API_BASE_URL=https://bothub.chat/api/v2/openai/v1
MODEL_NAME=gemini-2.5-flash-image-preview
JWT_SECRET=your-secret
NEXTAUTH_SECRET=your-nextauth-secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Frontend (Next.js)
```env
NEXT_PUBLIC_API_URL=/api
```

---

## Implementation Status

### Phase 1: Core Infrastructure
- [x] Architecture drafted
- [x] Prisma schema approved
- [x] NestJS project setup
- [x] Prisma migrations
- [x] Redis + BullMQ
- [x] MinIO client

### Phase 2: Core Services
- [x] StorageService (MinIO integration)
- [x] QueueService (BullMQ)
- [x] OpenAIService (AI calls)

### Phase 3: Gallery API
- [x] POST /gallery/upload
- [x] GET /gallery/:fileId
- [x] File deduplication (hash)
- [x] Soft delete

### Phase 4: Generation API
- [x] POST /generations/create
- [x] GET /generations/stream/:jobId (SSE)
- [x] GenerationProcessor (worker)
- [x] Progress tracking

### Phase 4.5: Tools API
- [x] GET /tools/list
- [x] POST /tools/:toolName/call

### Phase 5: Frontend
- [x] Upload component
- [x] Generation form
- [x] SSE client
- [x] Result display

### Phase 6: Auth & Billing
- [x] Auth (backend + frontend)
- [ ] Credits system (backend + frontend)
- [ ] Billing (transactions, Stripe)
- [ ] Webhooks

---

## Notes

1. Files are referenced via `File.id` (not direct URLs)
2. Hash-based deduplication keeps a single object in MinIO with multiple DB rows
3. SSE is used instead of WebSocket for progress updates
4. Workers are horizontally scalable
5. Soft delete is used for files

---

End of document. Ready for implementation.
