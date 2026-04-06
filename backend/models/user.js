const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  subscriptionActive: {
    type: Boolean,
    default: false,
  },
  stripeCustomerId: {
    type: String,
    default: "",
    trim: true,
  },
  stripeSubscriptionId: {
    type: String,
    default: "",
    trim: true,
  },
});

module.exports = mongoose.model("User", userSchema);
