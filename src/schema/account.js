const mongoose = require("mongoose");
const shortid = require("shortid");
const { String, Number, ObjectId } = mongoose.Schema.Types;

const AccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true,
      unique: true
    },
    balance: {
      type: Number,
      required: true
    }
  },
  {
    timestamp: true
  }
);

module.exports =
  mongoose.models.Account || mongoose.model("Account", AccountSchema);
