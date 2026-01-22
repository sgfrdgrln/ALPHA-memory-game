import mongoose from "mongoose";

export async function connectToDatabase() {
  try {
    if (mongoose.connections[0].readyState) return;
    await mongoose.connect(process.env.MONGODB_URI as string);
  } catch (error) {
    console.error(error);
  }
}