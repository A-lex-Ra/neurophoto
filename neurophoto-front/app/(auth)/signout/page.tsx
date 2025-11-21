'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignOutPage() {
    const router = useRouter();

    useEffect(() => {
        // Automatically sign out and redirect to home
        signOut({ callbackUrl: '/' });
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary text-white">
            <div className="w-full max-w-md p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl flex flex-col items-center">
                <div className="animate-spin mb-4">
                    <svg className="w-10 h-10 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-violet-500">
                    Выход из системы...
                </h2>
                <p className="text-gray-400 mt-2">Пожалуйста, подождите</p>
            </div>
        </div>
    );
}
