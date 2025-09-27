"use client";

import { useState } from "react";
import SectionBlock from "./SectionBlock";

interface Section {
    name: string;
    duration?: number;
    intensity: string;
}

export default function Editor({ workout }: { workout: any }) {
    const [sections, setSections] = useState<Section[]>(
        workout?.sections ?? [{ name: "", duration: undefined, intensity: "" }]
    );

    const updateSection = (index: number, updated: Section) => {
        const newSections = [...sections];
        newSections[index] = updated;
        setSections(newSections);
    };

    const removeSection = (index: number) => {
        setSections(sections.filter((_, i) => i !== index));
    };

    const addSection = () => {
        setSections([...sections, { name: "", duration: undefined, intensity: "" }]);
    };

    const handleSave = () => {
        console.log("Saving workout:", { ...workout, sections });
        // 🔗 Here you'd call your API route to save (insertOne or updateOne)
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">
                {workout ? `Editing: ${workout.name}` : "New Workout"}
            </h2>

            {sections.map((section, idx) => (
                <SectionBlock
                    key={idx}
                    section={section}
                    onChange={(updated) => updateSection(idx, updated)}
                    onRemove={() => removeSection(idx)}
                />
            ))}

            <button
                type="button"
                onClick={addSection}
                className="mt-2 px-4 py-2 bg-gray-200 rounded-lg"
            >
                + Add Section
            </button>

            <button
                onClick={handleSave}
                className="mt-4 ml-4 px-4 py-2 bg-green-600 text-white rounded-lg"
            >
                Save Workout
            </button>
        </div>
    );
}
