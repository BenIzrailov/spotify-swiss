"use client";

import { useState } from "react";
import SectionBlock from "./SectionBlock";
import Editor from "./Editor";

interface Section {
    name: string;
    duration?: number;
    intensity: string;
}

export default function Viewer({ workout }: { workout: any }) {
    const [editing, setEditing] = useState(false);

    if (!workout) return <p>Workout not found</p>;

    return (
        <div>
            {!editing ? (
                <>
                    <h1 className="text-2xl font-bold">{workout.name}</h1>
                    <p className="text-gray-600 mb-4">Type: {workout.type}</p>

                    {workout.sections?.length ? (
                        workout.sections.map((section: Section, idx: number) => (
                            <SectionBlock
                                key={idx}
                                section={section}
                                onChange={() => {}} // No editing here
                            />
                        ))
                    ) : (
                        <p>No sections yet.</p>
                    )}

                    <button
                        onClick={() => setEditing(true)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
                    >
                        Edit
                    </button>
                </>
            ) : (
                <Editor workout={workout} />
            )}
        </div>
    );
}
