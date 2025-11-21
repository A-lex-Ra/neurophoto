'use client';

import { SessionProvider } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { api } from "./services/api";

function AuthSync() {
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.accessToken) {
            api.setTokens({
                accessToken: session.accessToken,
                refreshToken: session.refreshToken
            });
        } else {
            api.clearTokens();
        }
    }, [session]);

    return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AuthSync />
            {children}
        </SessionProvider>
    );
}
