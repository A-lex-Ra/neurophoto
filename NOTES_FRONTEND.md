# 📝 Frontend Implementation Notes

## 🔐 Authentication (NextAuth.js)

The frontend uses **NextAuth.js** for authentication with a custom **Credentials Provider**.

### Key Nuances:
1.  **JWT Strategy**: We use a 2-token system (Access Token + Refresh Token).
    *   **Access Token**: Short-lived (15 mins). Used for API calls.
    *   **Refresh Token**: Long-lived. Used to rotate the access token automatically.
    *   **Rotation Logic**: Implemented in `authOptions` callbacks (`jwt` callback checks expiration and calls `refreshAccessToken`).
2.  **Configuration Location**:
    *   `authOptions` are defined in `app/lib/auth.ts`, NOT in the route handler.
    *   **Why?**: To avoid Next.js App Router build errors (`Route does not match the required types`) which happen if you export non-route objects from `route.ts`.
3.  **Custom Sign Out**:
    *   We use a custom page at `/signout` (`app/(auth)/signout/page.tsx`).
    *   **Why?**: The default NextAuth sign-out page is unstyled. Our custom page automatically executes `signOut()` and redirects to home, providing a seamless experience.
4.  **Middleware**:
    *   `middleware.ts` protects routes like `/generations` and `/gallery`.
    *   It uses `withAuth` from NextAuth to ensure only authenticated users access these paths.

## 🌐 API Integration & Environment Support

The frontend is designed to work in **two distinct environments**:
1.  **Local Development** (`npm run dev`): Frontend on port 3000, Backend on 8080 (via Nginx) or 3001.
2.  **Docker Production** (`docker-compose up`): Frontend and Backend behind Nginx on port 8080.

### Key Nuances:
1.  **Nginx Routing**:
    *   `/api/auth/*` (except login/register/refresh) -> **Frontend** (NextAuth).
    *   `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh` -> **Backend** (NestJS).
    *   `/api/*` -> **Backend**.
    *   **Critical**: This split routing is defined in `nginx.conf`.
2.  **API Client (`api.ts`)**:
    *   **Base URL**: Determined by `NEXT_PUBLIC_API_URL`.
        *   **Local**: Set to `http://localhost:8080/api` in `.env.local`.
        *   **Docker**: Defaults to `/api` (relative path).
    *   **Token Injection**: Automatically injects `Authorization: Bearer ...` header if a session exists.
    *   **Auto-Refresh**: Intercepts 401 responses, attempts to refresh the token using `signIn` (which triggers the NextAuth refresh logic), and retries the request.
3.  **SSE (Server-Sent Events) & Stream URLs**:
    *   The backend returns a **relative** stream URL (e.g., `/api/generations/stream/123`).
    *   **The Problem**: In local dev, `EventSource('/api/...')` hits `localhost:3000`, but the stream is on `localhost:8080`.
    *   **The Fix**: In `page.tsx`, we detect if we are running locally (by checking if `api.baseUrl` is absolute). If so, we **prepend the origin** to the stream URL (e.g., `http://localhost:8080/api/...`).
    *   **Docker**: In Docker, `api.baseUrl` is relative (`/api`), so the stream URL remains relative, and Nginx handles the routing correctly.

## 🎨 UI/UX

1.  **Glassmorphism**: The design relies heavily on transparency, blurs (`backdrop-blur`), and gradients.
2.  **Error Handling**: Error messages support rich text (JSX), allowing us to embed links (e.g., "Log in" link in error messages).
3.  **Dynamic Header**: The `Header` component accepts `children` to allow pages to inject context-specific controls (like the "Download" button in the canvas view).
