const mongoose = require("mongoose");
const { String, Number } = mongoose.Schema.Types;

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
    },
    type: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
      required: true
    }
  },
  {
    timestamp: true
  }
);

module.exports =
  mongoose.models.Account || mongoose.model("Account", AccountSchema);
