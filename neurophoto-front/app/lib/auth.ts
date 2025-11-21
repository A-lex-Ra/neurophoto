import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Determine backend URL for server-side calls
// In Docker, this should be http://api:3001
// Locally, http://localhost:3001
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function refreshAccessToken(token: any) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.refreshToken}`,
            }
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            accessToken: refreshedTokens.accessToken,
            accessTokenExpires: Date.now() + 15 * 60 * 1000, // 15 minutes
            refreshToken: refreshedTokens.refreshToken ?? token.refreshToken, // Fallback to old refresh token
        };
    } catch (error) {
        console.error("RefreshAccessTokenError", error);
        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
                        method: 'POST',
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                        headers: { "Content-Type": "application/json" }
                    });

                    const data = await res.json();

                    if (res.ok && data.user) {
                        return {
                            id: data.user.id,
                            email: data.user.email,
                            name: data.user.name,
                            role: data.user.role,
                            credits: data.user.credits,
                            accessToken: data.accessToken,
                            refreshToken: data.refreshToken,
                        };
                    }
                    return null;
                } catch (e) {
                    console.error("Login failed:", e);
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                return {
                    ...token,
                    id: user.id,
                    role: user.role,
                    credits: user.credits, // Add credits here
                    accessToken: user.accessToken,
                    refreshToken: user.refreshToken,
                    accessTokenExpires: Date.now() + 15 * 60 * 1000,
                };
            }

            // Handle manual update from client
            if (trigger === "update" && session?.credits !== undefined) {
                token.credits = session.credits;
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < (token.accessTokenExpires as number)) {
                return token;
            }

            // Access token has expired, try to update it
            return refreshAccessToken(token);
        },
        async session({ session, token }) {
            session.user.id = token.id as string;
            session.user.role = token.role as string;
            session.user.credits = token.credits as number; // Add credits here
            session.accessToken = token.accessToken as string;
            session.refreshToken = token.refreshToken as string;
            session.error = token.error as string;
            return session;
        }
    },
    pages: {
        signIn: '/login',
        signOut: '/signout',
    },
    session: {
        strategy: "jwt",
    }
};
