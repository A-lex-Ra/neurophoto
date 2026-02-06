# NeuroPhoto — AI Image Generator

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

NeuroPhoto is a SaaS platform for AI image generation and editing using Gemini 2.5 Flash Image Preview via BotHub (OpenAI-compatible API).

## Highlights

- Image upload and AI-powered transformation
- Real-time generation progress via SSE
- User accounts with JWT access/refresh tokens
- Credit-ready billing model with Stripe integration (in progress)
- MinIO-backed media storage with file abstraction

## Tech Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: NestJS 11, TypeScript, Node.js 20
- Database: PostgreSQL 15 + Prisma
- Queue/Cache: Redis 7 + BullMQ
- Storage: MinIO (S3-compatible)
- Auth: NextAuth.js + JWT (access/refresh)
- Payments: Stripe
- Infra: Docker + Docker Compose

## Quick Start

### 1. Start Infrastructure (PostgreSQL, Redis, MinIO)

```powershell
# Create .env in repo root
# OPENAI_API_KEY=your-api-key
# JWT_SECRET=your-secret
# NEXTAUTH_SECRET=your-nextauth-secret

docker-compose up -d postgres redis minio minio-init
```

### 2. Backend (NestJS)

```powershell
cd back/nest-back

# Copy env
cp .env.example .env

# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start API (dev)
npm run start:dev

# Generate access codes in Docker (optional)
docker compose exec api node dist/src/scripts/create-codes.js
```

Backend will be available at `http://localhost:3001`.

### 3. Worker (Queue Processing)

```powershell
cd back/nest-back
npm run start:dev -- --entryFile worker
```

### 4. Frontend (Next.js)

```powershell
cd neurophoto-front

npm install

echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm run dev
```

Frontend will be available at `http://localhost:3000`.

## Full Stack via Docker Compose

```powershell
# Create .env in repo root with required variables
# OPENAI_API_KEY=...
# JWT_SECRET=...
# NEXTAUTH_SECRET=...

# Start all services
docker-compose up -d

# Follow logs
docker-compose logs -f
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MinIO Console: http://localhost:9001 (minioadmin / minioadmin123)
- PostgreSQL: localhost:5432
- Redis: localhost:6379

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
│       │   └── gallery/    # File management
│       └── prisma/
│           └── schema.prisma
│
├── neurophoto-front/       # Next.js Frontend
│   ├── app/
│   └── components/
│
└── docker-compose.yml
```

## API Endpoints

### Gallery Service
- `POST /api/gallery/upload` - Upload file
- `GET /api/gallery/:fileId` - Download file
- `GET /api/gallery/user/:userId` - List user files
- `DELETE /api/gallery/:fileId` - Soft delete file

### Generation Service
- `POST /api/generations/create` - Create generation task
- `GET /api/generations/stream/:jobId` - SSE stream
- `GET /api/generations/:id` - Get result
- `GET /api/generations/list` - Generation history

### Tools Service
- `GET /api/tools/list` - Tool list
- `POST /api/tools/:toolName/call` - Call tool

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Database

Prisma manages the DB schema. Core models:
- `User`
- `File`
- `Generation`
- `Transaction`

### Migrations

```powershell
npm run prisma:migrate
npm run prisma:deploy
npx prisma studio
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/imageai
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
OPENAI_API_KEY=your-key
JWT_SECRET=your-secret
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
```

## Roadmap

- [ ] Credits UI and billing flows
- [ ] Stripe checkout + webhooks
- [ ] Rate limiting
- [ ] Monitoring and logging
- [ ] Expanded E2E coverage

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
