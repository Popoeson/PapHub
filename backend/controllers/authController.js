const Admin = require('../models/Admin');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require('../utils/jwt');

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Check if account is locked
    if (admin.isLocked) {
      const minutesLeft = Math.ceil((admin.lockUntil - Date.now()) / 60000);
      return res.status(429).json({
        message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      await admin.incrementFailedAttempts();
      const attemptsLeft = 5 - admin.failedLoginAttempts;

      return res.status(401).json({
        message: attemptsLeft > 0
          ? `Invalid credentials. ${attemptsLeft} attempt(s) remaining.`
          : 'Account locked for 15 minutes due to too many failed attempts.',
      });
    }

    // Successful login
    await admin.resetFailedAttempts();

    const accessToken = generateAccessToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    // Store refresh token hash in DB
    admin.refreshToken = refreshToken;
    await admin.save();

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      message: 'Login successful.',
      accessToken,
      admin: { email: admin.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ message: 'No refresh token.' });
    }

    const decoded = verifyRefreshToken(token);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type.' });
    }

    const admin = await Admin.findById(decoded.id);

    if (!admin || admin.refreshToken !== token) {
      // Token reuse detected or admin not found — clear cookie
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    // Rotate refresh token
    const newAccessToken = generateAccessToken(admin._id);
    const newRefreshToken = generateRefreshToken(admin._id);

    admin.refreshToken = newRefreshToken;
    await admin.save();

    setRefreshTokenCookie(res, newRefreshToken);

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    console.error('Refresh error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      const admin = await Admin.findOne({ refreshToken: token });
      if (admin) {
        admin.refreshToken = null;
        await admin.save();
      }
    }

    clearRefreshTokenCookie(res);
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/auth/me  — verify token and return admin info
const getMe = async (req, res) => {
  return res.status(200).json({ admin: { email: req.admin.email } });
};

module.exports = { login, refresh, logout, getMe };
