const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  subscriptionActive: Boolean,
});

module.exports = mongoose.model("User", userSchema);