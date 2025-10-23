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
    const [currentWorkout, setCurrentWorkout] = useState(workout);

    if (!workout) return <p>Workout not found</p>;

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

                    <button
                        onClick={() => setEditing(true)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
                    >
                        Edit
                    </button>
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
