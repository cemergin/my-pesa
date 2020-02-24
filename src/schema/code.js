const mongoose = require("mongoose");
const shortid = require("shortid");
const { String, Number, Boolean, ObjectId } = mongoose.Schema.Types;

const CodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      default: shortid.generate()
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
    creatorAccount: {
      type: ObjectId,
      ref: "Account",
      required: true
    },
    consumerAccount: {
      type: ObjectId,
      ref: "Account"
    }
  },
  {
    timestamp: true
  }
);

module.exports = mongoose.models.Code || mongoose.model("Code", CodeSchema);
