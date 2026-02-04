import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/backend/db/connection";
import { Leaderboard } from "@/backend/models/Leaderboard";

// GET - Fetch top 10 leaderboard entries for both modes
export async function GET() {
  try {
    await connectToDatabase();
    
    const normalEntries = await Leaderboard.find({ gameMode: 'normal' })
      .sort({ moves: 1, time: 1 })
      .limit(10)
      .select('-__v -updatedAt')
      .lean();

    const challengeEntries = await Leaderboard.find({ gameMode: 'challenge' })
      .sort({ moves: 1, time: 1 })
      .limit(10)
      .select('-__v -updatedAt')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        normal: normalEntries.map(entry => ({
          ...entry,
          _id: entry._id.toString(),
          date: new Date(entry.date).toLocaleDateString()
        })),
        challenge: challengeEntries.map(entry => ({
          ...entry,
          _id: entry._id.toString(),
          date: new Date(entry.date).toLocaleDateString()
        }))
      }
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}

// POST - Add new leaderboard entry
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { name, moves, time, gameMode } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    if (typeof moves !== 'number' || moves < 0) {
      return NextResponse.json(
        { success: false, error: "Invalid moves count" },
        { status: 400 }
      );
    }

    if (typeof time !== 'number' || time < 0) {
      return NextResponse.json(
        { success: false, error: "Invalid time" },
        { status: 400 }
      );
    }

    if (gameMode && !['normal', 'challenge'].includes(gameMode)) {
      return NextResponse.json(
        { success: false, error: "Invalid game mode" },
        { status: 400 }
      );
    }

    // Create new entry
    const entry = await Leaderboard.create({
      name: name.trim(),
      moves,
      time,
      gameMode: gameMode || 'normal'
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: entry._id.toString(),
        name: entry.name,
        moves: entry.moves,
        time: entry.time,
        date: new Date(entry.date).toLocaleDateString()
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error saving to leaderboard:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save to leaderboard" },
      { status: 500 }
    );
  }
}
