// app/api/moodify/route.ts
import { NextResponse } from "next/server";
// If using NextAuth:
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const MOODIFY_URL = process.env.MOODIFY_URL; // e.g. "http://127.0.0.1:8000/analyze"

export async function POST(req: Request) {
    // Check if MOODIFY_URL is configured
    if (!MOODIFY_URL) {
        console.error("MOODIFY_URL environment variable is not set");
        return NextResponse.json(
            { error: "MOODIFY_URL not configured" },
            { status: 500 }
        );
    }

    // 1) get Spotify access token from session
    const session = await getServerSession(authOptions);
    const accessToken = (session?.user as any)?.accessToken; // accessToken is stored on session.user
    if (!accessToken) {
        return NextResponse.json({ error: "No Spotify access token" }, { status: 401 });
    }

    // 2) read body (use_playlist, playlist_id, limit)
    const body = await req.json();

    // 3) call Python service
    try {
        const res = await fetch(MOODIFY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify(body),
            // prevent caching
            cache: "no-store",
        });

        const data = await res.json();
        
        // If FastAPI returns 404, provide more helpful error
        if (res.status === 404) {
            console.error(`FastAPI endpoint not found. URL: ${MOODIFY_URL}`);
            return NextResponse.json(
                { 
                    error: "Moodify service endpoint not found",
                    details: `Check that MOODIFY_URL (${MOODIFY_URL}) includes the /analyze path and your Python service is running`
                },
                { status: 404 }
            );
        }

        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        console.error("Error calling Moodify service:", error);
        return NextResponse.json(
            { 
                error: "Failed to connect to Moodify service",
                details: error.message,
                url: MOODIFY_URL
            },
            { status: 500 }
        );
    }
}
