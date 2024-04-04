import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Create Schema for History
const HistorySchema = new Schema({
  activity_type: {
    type: String    // gamer, voter
  },
  gamer: {
    type: String
  },
  game_id: {
    type: String
  },
  round: {
    type: Number,
    default: 0
  },
  voter: {
    type: String
  },
  vote: {
    type: Number
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  gamer_name: {
    type: String
  },
});

// Create a model from the schema
const History = mongoose.model('history', HistorySchema);

export default History;