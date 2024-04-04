import mongoose from 'mongoose';

const { Schema } = mongoose;

// Create Schema for User
const RoomInfoSchema = new Schema({
  round1: [],
  round2: [{
    userId: String,
    ownVote: Number,
    totalVote: Number
  }],
  round3: [],
  winner: {},
  created_at: {
    type: Date,
    default: Date.now
  },
});

// Create a model from the schema
const RoomInfo = mongoose.model('room', RoomInfoSchema);

export default RoomInfo;
