# 📝 Backend Implementation Notes

## 🛡️ Authentication & Authorization

The backend uses **NestJS Passport** with **JWT** strategies.

### Key Nuances:
1.  **Dual Token System**:
    *   **Access Token**: Standard JWT, signed with `JWT_SECRET`.
    *   **Refresh Token**: Signed with `JWT_REFRESH_SECRET`.
    *   **Security**: The *hashed* refresh token is stored in the database (`User.hashedRefreshToken`). This prevents token theft usage if the DB is compromised.
2.  **Guards**:
    *   `JwtAuthGuard`: Validates Access Token. Used globally or on specific endpoints.
    *   `JwtRefreshGuard`: Validates Refresh Token. Used only on `/auth/refresh`.
    *   `RolesGuard`: Checks user roles (`ADMIN`, `USER`) using the `@Roles()` decorator.
3.  **Strategy Implementation**:
    *   `JwtStrategy` extracts the token from the `Authorization: Bearer` header.
    *   `JwtRefreshStrategy` also extracts the token but validates it against the refresh secret and checks the DB.
    *   **Important**: `JwtRefreshStrategy` handles the case where the header might be missing gracefully (or throws explicit error) to prevent crashes.

## 💰 Billing & Credits

1.  **Credit Logic**:
    *   Credits are stored on the `User` model.
    *   **Deduction**: Occurs *after* a successful generation (or is reserved). Currently implemented to deduct upon completion in the frontend/backend flow.
    *   **Refunds**: If a generation fails, credits should be refunded (logic implemented in `GenerationService`, but not used yet).
2.  **Transactions**:
    *   Every credit change is recorded in the `Transaction` table for audit trails.

## 🛠️ Tools & Generation

1.  **Generation Service**:
    *   **Stream URL**: The service returns a `streamUrl` which is **relative** (`/api/generations/stream/:id`). The frontend is responsible for resolving this to an absolute URL if necessary (see Frontend Notes).
    *   **Queue**: Uses BullMQ for background processing.
2.  **Tools Service**:
    *   **Mapping**: Maps string identifiers (e.g., `background_removal`) to specific tool implementations.
    *   **Extensibility**: New tools should be added to the `toolsToImplementationMap` in `ToolsService`.

## 🐳 Docker & Infrastructure

1.  **Internal Ports**:
    *   Backend listens on port **3001** inside the container.
    *   Frontend listens on port **3000**.
2.  **Nginx Proxy**:
    *   Exposes the entire application on port **8080**.
    *   **Routing**:
        *   `/api` -> Backend (3001).
        *   `/` -> Frontend (3000).
    *   **Nuance**: Nginx handles the routing for `/api/auth` specifically to split traffic between NextAuth (frontend) and NestJS Auth (backend).

## 🏗️ Infrastructure & Architecture

### Docker Services
1.  **PostgreSQL 15**:
    *   Database for users, files, generations.
    *   Includes healthcheck and volume persistence.
2.  **Redis 7**:
    *   Used for BullMQ queues and Pub/Sub (real-time updates).
    *   Includes healthcheck.
3.  **MinIO**:
    *   S3-compatible object storage.
    *   Web console on port 9001 (Credentials: `minioadmin` / `minioadmin123`).
    *   Automatically creates `generations` bucket via `minio-init` service.
4.  **Services**:
    *   `api`: NestJS backend (HTTP requests).
    *   `worker`: NestJS worker (processes background jobs).
    *   `web`: Next.js frontend.
    *   `nginx`: Reverse proxy.

### Backend Architecture (NestJS)
*   **PrismaModule**: ORM for PostgreSQL.
*   **StorageModule**: MinIO integration (S3 SDK).
*   **QueueModule**: BullMQ for async jobs.
*   **OpenAIModule**: OpenAI client (configured for Gemini/BotHub).
*   **GenerationModule**: Core logic for image generation.
*   **GalleryModule**: File management and deduplication.
*   **ToolsModule**: Image processing tools (background removal, upscale).

### Database Schema (Prisma)
*   **Models**:
    *   `User`: email, credits, role (USER, ADMIN).
    *   `File`: SHA256 hash for deduplication, path in MinIO.
    *   `Generation`: Status tracking (PENDING, GENERATING, COMPLETED, FAILED).
    *   `Transaction`: Financial audit trail (PURCHASE, USAGE, REFUND, BONUS).
*   **Relations**:
    *   User -> Files, Generations, Transactions.
    *   Generation -> InputFile, OutputFile.

### Key Workflows
1.  **File Upload**:
    *   Uploaded via `/api/gallery/upload`.
    *   SHA256 hash calculated for deduplication.
    *   Stored in MinIO, metadata in DB.
2.  **Async Generation**:
    *   POST `/api/generations/create` -> Create DB entry -> Add to Queue -> Return `jobId`.
    *   **Worker**: Process job -> Call AI API -> Save result to MinIO/DB -> Update progress.
    *   **Frontend**: Connects to `/api/generations/stream/:jobId` (SSE) for real-time updates.
3.  **Tools**:
    *   Tools (like background removal) are implemented as specialized generations.
    *   `ToolsService` maps tool names to implementations.

## 🧪 Testing & Verification
*   **Health Check**: `curl http://localhost:3001`
*   **MinIO Console**: `http://localhost:9001`
*   **Worker Logs**: `docker-compose logs -f worker`

