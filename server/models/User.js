const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: "?" },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
