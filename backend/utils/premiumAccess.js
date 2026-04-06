const User = require("../models/user");

const PRO_REQUIRED_MESSAGE = "This feature is available on TradeFocus Pro. Upgrade to Pro to continue.";

async function hasPremiumAccess(userId) {
  const user = await User.findById(userId).select("subscriptionActive");
  return Boolean(user?.subscriptionActive);
}

module.exports = {
  PRO_REQUIRED_MESSAGE,
  hasPremiumAccess,
};
