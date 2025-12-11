"use client";

import {useEffect, useState} from "react";
import { useSession, signIn } from "next-auth/react";
import SectionBlock from "./SectionBlock";
import Editor from "./Editor";

interface Section {
    name: string;
    duration?: number;
    intensity: string;
}

type Workout = {
    _id?: string;
    name?: string;
    type?: string;
    sections?: Section[];
};

export default function Viewer({ workout }: { workout: Workout }) {
    const { data: session, status } = useSession();
    const [editing, setEditing] = useState(false);
    const [currentWorkout, setCurrentWorkout] = useState(workout);
    const [loading, setLoading] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
    const [authError, setAuthError] = useState(false);

    useEffect(() => {
        console.log("Current workout:", currentWorkout);
    }, [currentWorkout]);

    if (!workout) return <p>Workout not found</p>;

    const generate = async () => {
        try {
            setLoading(true);
            setPlaylistUrl(null);
            setAuthError(false);
            const res = await fetch("/api/playlist/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ workoutId: workout._id }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.error === "Not authenticated" || data.error?.includes("authenticated")) {
                    setAuthError(true);
                }
                throw new Error(data.error || "Failed to generate playlist");
            }
            setPlaylistUrl(data.playlistUrl);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {!editing ? (
                <>
                    <h1 className="text-2xl font-bold">{workout.name}</h1>
                    <p className="text-gray-600 mb-4">Type: {workout.type}</p>

                    {currentWorkout.sections?.length ? (
                        currentWorkout.sections.map((section: Section, idx: number) => (
                            <SectionBlock
                                key={idx}
                                section={section}
                                onChange={() => {}}
                                disabled={true}
                            />
                        ))
                    ) : (
                        <p>No sections yet.</p>
                    )}
                    <div className='flex gap-4 mt-4'>
                        <button
                            onClick={() => setEditing(true)}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer"
                        >
                            Edit
                        </button>
                        {authError || status === "unauthenticated" ? (
                            <button
                                onClick={() => signIn("spotify")}
                                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer"
                            >
                                Re-authenticate with Spotify
                            </button>
                        ) : (
                            <button
                                onClick={generate}
                                disabled={loading || status === "loading"}
                                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer disabled:opacity-60"
                            >
                                {loading ? "Generating…" : "Generate Playlist"}
                            </button>
                        )}
                        {playlistUrl && (
                            <p className="mt-3">
                                Playlist created:{" "}
                                <a href={playlistUrl} target="_blank" className="text-green-700 underline">
                                    open in Spotify
                                </a>
                            </p>
                        )}
                    </div>
                </>
            ) : (
                <Editor
                    workout={workout}
                    onSave={(updatedWorkout) => {
                        console.log("Saving workout", updatedWorkout);
                        setCurrentWorkout(updatedWorkout);
                        setEditing(false);
                    }}
                />
            )}
        </div>
    );
}
