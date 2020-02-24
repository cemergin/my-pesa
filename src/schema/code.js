const mongoose = require("mongoose");
const { String, Number, Boolean, ObjectId } = mongoose.Schema.Types;

const CodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true
    },
    codeType: {
      type: String,
      enum: ["deposit", "withdraw"],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    completed: {
      type: Boolean,
      default: false,
      required: true
    },
    account: {
      type: ObjectId,
      ref: "Account"
    }
  },
  {
    timestamp: true
  }
);

module.exports = mongoose.models.Code || mongoose.model("Code", CodeSchema);
