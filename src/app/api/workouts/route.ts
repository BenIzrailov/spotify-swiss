import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";


export async function POST(req: Request) {
    try {
        const body = await req.json();

        // validate required fields
        if (!body.name || !body.type) {
            return NextResponse.json(
                { error: "Workout name and type are required" },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("spotify-swiss");
        const workouts = db.collection("workouts");

        // Insert workout with empty sections for now
        const result = await workouts.insertOne({
            name: body.name,
            type: body.type,
            sections: [], // user will add later
            createdAt: new Date(),
        });

        return NextResponse.json({ id: result.insertedId });
    } catch (err: unknown) {
        console.error(err);
        return NextResponse.json({ error: "Failed to create workout" }, { status: 500 });
    }
}
