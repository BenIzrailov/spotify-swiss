import { ObjectId } from "mongodb";
import clientPromise from "../../../../lib/mongodb";
import Viewer from "../../../components/workouts/Viewer"
import Editor from "../../../components/workouts//Editor";

async function getWorkout(id: string) {
    const client = await clientPromise;
    const db = client.db("spotify-swiss");
    const workout = await db.collection("workouts").findOne({ _id: new ObjectId(id) });
    return JSON.parse(JSON.stringify(workout));
}

export default async function WorkoutPage({ params }: { params: { id: string } }) {
    const workout = params.id !== "new" ? await getWorkout(params.id) : null;

    return (
        <div className="p-6">
            {params.id === "new" ? (
                <Editor workout={null} />
            ) : (
                <Viewer workout={workout} />
            )}
        </div>
    );
}
