import mongoose from "mongoose";

const leaderboardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  moves: {
    type: Number,
    required: true,
    min: 0
  },
  time: {
    type: Number,
    required: true,
    min: 0
  },
  gameMode: {
    type: String,
    enum: ['normal', 'challenge'],
    default: 'normal'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient sorting and filtering by game mode
leaderboardSchema.index({ gameMode: 1, moves: 1, time: 1 });

export const Leaderboard = mongoose.models.Leaderboard || mongoose.model("Leaderboard", leaderboardSchema);
