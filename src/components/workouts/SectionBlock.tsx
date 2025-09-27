"use client";

import { useState } from "react";

interface Section {
    name: string;
    duration?: number;
    intensity: string;
}

interface SectionBlockProps {
    section: Section;
    onChange: (updated: Section) => void;
    onRemove?: () => void;
}

export default function SectionBlock({ section, onChange, onRemove }: SectionBlockProps) {
    const [local, setLocal] = useState(section);

    const update = (field: keyof Section, value: any) => {
        const updated = { ...local, [field]: value };
        setLocal(updated);
        onChange(updated);
    };

    return (
        <div className="bg-white border rounded-2xl shadow-sm p-4 mb-4">
            <div className="space-y-3">
                {/* Section Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Section Name</label>
                    <input
                        type="text"
                        value={local.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="e.g., Warm-up"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                </div>

                {/* Duration */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (seconds)</label>
                    <input
                        type="number"
                        value={local.duration ?? ""}
                        onChange={(e) => update("duration", parseInt(e.target.value) || 0)}
                        placeholder="300"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                </div>

                {/* Intensity */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Intensity</label>
                    <select
                        value={local.intensity}
                        onChange={(e) => update("intensity", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">Select intensity</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>

                {onRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="text-red-600 hover:underline text-sm"
                    >
                        Remove Section
                    </button>
                )}
            </div>
        </div>
    );
}
