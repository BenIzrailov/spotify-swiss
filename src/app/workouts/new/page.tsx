"use client";

import { useState } from "react";

export default function NewWorkoutPage() {
    const [name, setName] = useState("");
    const [type, setType] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const res = await fetch("/api/workouts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, type }),
        });

        if (res.ok) {
            const data = await res.json();
            console.log("Created workout with ID:", data.id);

            // redirect to workout detail or sections page
            window.location.href = `/workouts/${data.id}`;
        } else {
            const err = await res.json();
            alert("Error: " + err.error);
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">
                    Create a Workout
                </h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Workout Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Workout Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., HIIT Sprint Session"
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            required
                        />
                    </div>

                    {/* Workout Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Workout Type
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            required
                        >
                            <option value="">Select type</option>
                            <option value="strength">Strength Training</option>
                            <option value="cardio">Cardio</option>
                            <option value="hiit">HIIT</option>
                            <option value="yoga">Yoga</option>
                            <option value="pilates">Pilates</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl shadow-md hover:bg-indigo-700 transition"
                    >
                        Save Workout
                    </button>
                </form>
            </div>
        </div>
    );
}
