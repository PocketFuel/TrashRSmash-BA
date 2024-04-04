import mongoose from 'mongoose';

const { Schema } = mongoose;

// Create Schema for Transaction
const transactionInfo = new Schema({
  signature: {
    type: String,
    require: true
  },
  type: {
    type: String,
    default: "in" // or 'out' or reward
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Create a model from the schema
const TransactionHis = mongoose.model('Transaction', transactionInfo);

export default TransactionHis;
