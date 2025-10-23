import { NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const body = await req.json();
        const client = await clientPromise;
        const db = client.db("spotify-swiss");
        const workouts = db.collection("workouts");

        await workouts.updateOne(
            { _id: new ObjectId(params.id) },
            { $set: { sections: body.sections } }
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to update workout" }, { status: 500 });
    }
}
