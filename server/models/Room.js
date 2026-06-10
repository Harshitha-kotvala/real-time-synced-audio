const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    hostName: { type: String, default: "Host" },
    access: {
      isPrivate: { type: Boolean, default: false },
      inviteOnly: { type: Boolean, default: false },
      passwordHash: { type: String, default: null },
      inviteToken: { type: String, default: null },
    },
    state: {
      videoId: { type: String, default: null },
      playing: { type: Boolean, default: false },
      timestamp: { type: Number, default: 0 },
      updatedAt: { type: Number, default: Date.now },
    },
    messages: [
      {
        userId: String,
        userName: String,
        text: String,
        sentAt: Number,
      },
    ],
    watchHistory: [
      {
        action: String,
        by: String,
        timestamp: Number,
        videoId: String,
        at: Number,
      },
    ],
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);

module.exports = { Room };
