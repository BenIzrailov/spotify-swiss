import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Link from "next/link";
import Image from "next/image";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Spotify Swiss",
    description: "Authenticate with Spotify",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
        >
        <Providers>
            {/* 🔝 Navbar */}
            <nav className="bg-black text-white px-6 py-3 flex items-center justify-between shadow-md">
                {/* Left side: logo + name */}
                <div className="flex items-center space-x-3">
                    <Image
                        src="/spotify-icon.svg" // place your logo inside /public
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
                </div>
            </nav>

            {/* Page Content */}
            <main className="max-w-5xl mx-auto p-6">{children}</main>
        </Providers>
        </body>
        </html>
    );
}
