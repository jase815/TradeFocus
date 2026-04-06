const { PRO_REQUIRED_MESSAGE, hasPremiumAccess } = require("../utils/premiumAccess");

module.exports = async function requirePro(req, res, next) {
  try {
    const isPremium = await hasPremiumAccess(req.user.id);

    if (!isPremium) {
      return res.status(403).json({ message: PRO_REQUIRED_MESSAGE });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
