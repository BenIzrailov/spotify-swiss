"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
    const { data: session, status } = useSession();

    return (
        <nav className="bg-black text-white px-6 py-3 flex items-center justify-between shadow-md">
            {/* Left side: logo + name */}
            <div className="flex items-center space-x-3">
                <Image
                    src="/spotify-icon.svg"
                    alt="Spotify Logo"
                    width={32}
                    height={32}
                />
                <span className="text-lg font-bold">Spotify Swiss</span>
                <Link
                    href="/workouts"
                    className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition"
                >
                    Workout Playlist Generator
                </Link>
                <Link
                    href="/moodify"
                    className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition"
                >
                    Moodify
                </Link>
            </div>

            {/* Right side: auth buttons */}
            <div className="flex items-center space-x-4">
                {status === "loading" ? (
                    <span className="text-sm text-gray-400">Loading...</span>
                ) : session ? (
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-300">
                            {session.user?.name || session.user?.email}
                        </span>
                        <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => signIn("spotify")}
                        className="px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition"
                    >
                        Sign In with Spotify
                    </button>
                )}
            </div>
        </nav>
    );
}


