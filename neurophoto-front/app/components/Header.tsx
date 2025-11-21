'use client';

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function Header({ children }: { children?: React.ReactNode }) {
    const { data: session } = useSession();

    return (
        <header className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center pointer-events-none">
            <div className="flex items-center gap-4 pointer-events-auto">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-500">
                    VisualGenerator
                </h1>
            </div>

            {children}

            <div className="flex items-center gap-4 pointer-events-auto">
                {session ? (
                    <>
                        <div className="bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20 flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-200">
                                {session.user?.name || session.user?.email}
                            </span>
                            <div className="h-4 w-px bg-white/20" />
                            <span className="text-sm font-bold text-violet-400">
                                {session.user?.credits ?? 0} ⚡
                            </span>
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Выйти
                        </button>
                    </>
                ) : (
                    <Link
                        href="/login"
                        className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                    >
                        Войти
                    </Link>
                )}
            </div>
        </header>
    );
}
