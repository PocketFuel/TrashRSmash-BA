import mongoose from 'mongoose';

const { Schema } = mongoose;

// Create Schema for User
const UserSchema = new Schema({
  username: {
    type: String,
  },
  avatar: {
    type: String,
  },
  walletAddress: {
    type: String
  },
  balance: {
    type: Number
  },
  reward: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Create a model from the schema
const User = mongoose.model('user', UserSchema);

export default User;
