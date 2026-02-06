# NeuroPhoto - Quick Install and Run

## Prerequisites

- Docker Desktop installed and running
- Node.js 20+ installed (for local development)
- PowerShell (bundled with Windows)

## Quick Start (Docker Compose - Recommended)

### 1. Environment Variables

```powershell
# Create .env in repo root
# Copy the following content:
```

**Root `.env`:**
```env
# OpenAI API Key (BotHub)
OPENAI_API_KEY=your-bothub-api-key-here

# Auth Secrets
JWT_SECRET=your-jwt-secret-change-in-production
NEXTAUTH_SECRET=your-nextauth-secret-change-in-production
```

**`back/nest-back/.env`:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/imageai
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
MINIO_BUCKET=generations
OPENAI_API_KEY=your-bothub-api-key-here
JWT_SECRET=your-jwt-secret-change-in-production
```

### 2. Start All Services

```powershell
# Ensure Docker Desktop is running
docker ps

# Start all services (PostgreSQL, Redis, MinIO, API, Worker, Frontend)
docker-compose up -d

# Check status
docker-compose ps

# Tail logs
docker-compose logs -f
```

### 3. Initialize Database

```powershell
# Migrations are applied automatically on API start
# To create demo users:
docker compose exec api npm run prisma:seed:prod
```

### 4. Verify

Open in browser:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Nginx (reverse proxy): http://localhost:8080
- MinIO Console: http://localhost:9001 (minioadmin / minioadmin123)

## Manual Setup (for Development)

### 1. Environment Variables

Create `.env` files as described in Quick Start above.

### 2. Start Infrastructure Only

```powershell
# Ensure Docker Desktop is running
docker ps

# Start infra services only
docker-compose up -d postgres redis minio minio-init

# Check status
docker-compose ps
```

### 3. Backend Setup

```powershell
cd back/nest-back

# Install dependencies
npm install

# Create .env file (see above)

# Generate Prisma Client
npm run prisma:generate

# Apply migrations
npm run prisma:migrate

# Seed demo users
npm run prisma:seed
```

### 4. Frontend Setup

```powershell
cd neurophoto-front

# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
echo "NEXTAUTH_URL=http://localhost:3000" >> .env.local
echo "NEXTAUTH_SECRET=your-nextauth-secret" >> .env.local
```

## Run the App

### Option 1: Local Development (3 terminals)

**Terminal 1 - Backend API:**
```powershell
cd back/nest-back
npm run start:dev
```

**Terminal 2 - Worker:**
```powershell
cd back/nest-back
npm run start:dev -- --entryFile worker
```

**Terminal 3 - Frontend:**
```powershell
cd neurophoto-front
npm run dev
```

### Option 2: Docker Compose (full stack)

```powershell
# Build and start all services
docker-compose up --build

# In background
docker-compose up -d --build

# Stop all services
docker-compose down

# Stop and remove volumes (DB will be reset)
docker-compose down -v
```

## URLs

After successful startup:

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Nginx (reverse proxy): http://localhost:8080
- MinIO Console: http://localhost:9001
  - Login: `minioadmin`
  - Password: `minioadmin123`

## Demo Users

After running `npm run prisma:seed` or `docker compose exec api npm run prisma:seed:prod`:

**Regular user:**
- Email: `demo@neurophoto.com`
- Password: `demo123`
- Credits: 100

**Admin:**
- Email: `admin@neurophoto.com`
- Password: `admin123`
- Credits: 1000

## Verification Checklist

### 1. Infrastructure

```powershell
# Check Docker containers
docker-compose ps

# All should be "Up" or "running"
```

### 2. Database

```powershell
# Option 1: Prisma Studio (local dev)
cd back/nest-back
npx prisma studio
# Opens http://localhost:5555

# Option 2: psql in Docker
docker compose exec postgres psql -U postgres -d imageai -c 'SELECT * FROM "User";'

# Check access codes (if used)
docker compose exec postgres psql -U postgres -d imageai -c 'SELECT * FROM "AccessCode";'
```

### 3. API

```powershell
# Health endpoint
curl http://localhost:3001

# Should return "Hello World!" or similar
```

### 4. MinIO

Open http://localhost:9001 in a browser:
- Login: minioadmin / minioadmin123
- Verify bucket `generations`

## Troubleshooting

### Docker Does Not Start

```powershell
# Check Docker status
docker ps

# If there is an error, start Docker Desktop
```

### npm install Errors

```powershell
# Clear cache and reinstall
npm cache clean --force
npm install

# If dependency problems persist
rm -rf node_modules package-lock.json
npm install
```

### Prisma Errors

```powershell
# Recreate DB
docker-compose down -v
docker-compose up -d postgres

# Wait 10 seconds
Start-Sleep -Seconds 10

# Re-apply migrations
cd back/nest-back
npm run prisma:migrate
npm run prisma:seed
```

### Ports in Use

If ports 3000, 3001, 5432, 6379, 8080, 9000 or 9001 are in use:

1. Find the processes:
```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :8080
```

2. Change ports in `docker-compose.yml` and `.env` files.

### MinIO Bucket Missing

```powershell
# Recreate minio-init
docker-compose rm -f minio-init
docker-compose up -d minio-init

# Check logs
docker-compose logs minio-init
```

### Image Generation Errors

```powershell
# Check worker logs
docker-compose logs -f worker

# Verify OPENAI_API_KEY is set
docker compose exec api printenv | findstr OPENAI_API_KEY
```

## Useful Commands

### Docker

```powershell
# Stop all services
docker-compose down

# Stop and remove volumes (DB will be reset)
docker-compose down -v

# Tail logs for all services
docker-compose logs -f

# Logs for a specific service
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f web

# Restart a specific service
docker-compose restart api

# Run a command in a container
docker compose exec api npm run prisma:seed:prod
docker compose exec postgres psql -U postgres -d imageai
```

### Backend

```powershell
cd back/nest-back

# Development
npm run start:dev                # Start API in dev mode
npm run start:dev -- --entryFile worker  # Start Worker in dev mode

# Production
npm run build                    # Build
npm run start:prod               # Start API in prod mode
npm run start:worker             # Start Worker in prod mode

# Tests
npm run test                     # Unit tests
npm run test:watch               # Watch mode
npm run test:cov                 # Coverage
npm run test:e2e                 # E2E tests

# Prisma
npm run prisma:generate          # Generate Prisma Client
npm run prisma:migrate           # Create a new migration
npm run prisma:deploy            # Apply migrations (production)
npm run prisma:seed              # Seed data (dev)
npm run prisma:seed:prod         # Seed data (prod)
npx prisma studio                # Prisma Studio (GUI)

# Formatting
npm run format                   # Prettier
npm run lint                     # ESLint
```

### Frontend

```powershell
cd neurophoto-front

# Development
npm run dev                      # Start in dev mode

# Production
npm run build                    # Build for production
npm run start                    # Start production build

# Linting
npm run lint                     # Next.js lint
```

## Additional Docs

- Full documentation: [README.md](./README.md)
- API documentation: [API.md](./API.md)
- Implemented features: [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- Architecture: [.github/copilot-instructions.md](./.github/copilot-instructions.md)
- Prisma schema: [back/nest-back/prisma/schema.prisma](./back/nest-back/prisma/schema.prisma)

## AI Model

This project uses **Gemini 2.5 Flash Image Preview** via BotHub (OpenAI-compatible endpoint).

To get an API key:
1. Register at BotHub
2. Create an API key
3. Add it to `.env` as `OPENAI_API_KEY`

## Support

If you run into issues:

1. Check logs: `docker-compose logs -f`
2. Ensure Docker is running: `docker ps`
3. Ensure ports are free: see the Troubleshooting section
4. Ensure `.env` files exist and have correct values
5. Check service status: `docker-compose ps`
6. Verify your API key: ensure `OPENAI_API_KEY` is set correctly

### Common Problems

- "Cannot connect to Docker daemon" → Start Docker Desktop
- "Port already in use" → Stop the process or change ports in docker-compose
- "Prisma Client not generated" → Run `npm run prisma:generate`
- "MinIO bucket not found" → Recreate minio-init: `docker-compose up -d minio-init`
- "OpenAI API error" → Verify your BotHub API key

---

Ready to ship.
