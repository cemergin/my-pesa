const mongoose = require("mongoose");
const shortid = require("shortid");
const { String, Number, ObjectId } = mongoose.Schema.Types;

const TransactionSchema = new mongoose.Schema(
  {
    sender: {
      type: ObjectId,
      ref: "Account",
      required: true
    },
    receiver: {
      type: ObjectId,
      ref: "Account",
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      default: shortid.generate()
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
