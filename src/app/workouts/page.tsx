import Link from "next/link";
import clientPromise from "../../../lib/mongodb";

export default async function WorkoutsListPage() {
    const client = await clientPromise;
    const db = client.db("spotify-swiss");
    const workouts = await db.collection("workouts").find({}).toArray();

    console.log("Fetched workouts:", workouts);



    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">My Workouts</h1>

            {workouts.length === 0 ? (
                <p className="text-gray-500">No workouts created yet.</p>
            ) : (
                <ul className="space-y-4">
                    {workouts.map((workout: any) => (
                        <li
                            key={workout._id.toString()}
                            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition"
                        >
                            <Link
                                href={`/workouts/${workout._id.toString()}`}
                                className="block"
                            >
                                <h2 className="text-xl font-semibold">{workout.name}</h2>
                                <p className="text-gray-500">Type: {workout.type}</p>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-8">
                <Link
                    href="/workouts/new"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700"
                >
                    ➕ New Workout
                </Link>
            </div>
        </div>
    );
}
