const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
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

    await admin.resetFailedAttempts();

    const accessToken = generateAccessToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    admin.refreshToken = refreshToken;
    await admin.save();

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      message: 'Login successful.',
      accessToken,
      admin: {
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
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
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

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

// GET /api/auth/me
const getMe = async (req, res) => {
  return res.status(200).json({
    admin: {
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role,
    },
  });
};

// ─── Super admin: create new admin account ─────────────────────────────────

// POST /api/auth/create-admin
const createAdmin = async (req, res) => {
  try {
    const { email, name, password, role } = req.body;

    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newAdmin = await Admin.create({
      email: email.toLowerCase(),
      name,
      passwordHash,
      role: role || 'admin',
    });

    return res.status(201).json({
      message: `Admin account created for ${newAdmin.email}.`,
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error('createAdmin error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/auth/admins — list all admin accounts
const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('email name role createdAt')
      .sort({ createdAt: 1 });

    return res.status(200).json({ admins });
  } catch (error) {
    console.error('getAdmins error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/auth/admins/:id — superadmin removes an admin account
const deleteAdmin = async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.admin._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    // Prevent deleting another superadmin
    if (admin.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete a superadmin account.' });
    }

    await admin.deleteOne();
    return res.status(200).json({ message: `Admin account ${admin.email} deleted.` });
  } catch (error) {
    console.error('deleteAdmin error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { login, refresh, logout, getMe, createAdmin, getAdmins, deleteAdmin };
