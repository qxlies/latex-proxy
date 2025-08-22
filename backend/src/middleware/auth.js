const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'Authentication invalid: Missing or malformed header' });
  }

  const token = authHeader.split(' ')[1];

  if (token.split('.').length === 3) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { userId: payload.userId, login: payload.login };
      return next();
    } catch (error) {
      return res.status(401).json({ msg: 'Authentication invalid: Invalid JWT' });
    }
  }

  if (token.startsWith('sk-')) {
    try {
      const user = await User.findOne({ apiKey: token });
      if (!user) {
        return res.status(401).json({ msg: 'Authentication invalid: Invalid API Key' });
      }
      req.user = { userId: user._id, login: user.login };
      return next();
    } catch (dbError) {
      return res.status(500).json({ msg: 'Server error during API Key authentication' });
    }
  }

  return res.status(401).json({ msg: 'Authentication invalid: Unknown token format' });
};

module.exports = authMiddleware;