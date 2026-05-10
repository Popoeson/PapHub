/**
 * Run once: node scripts/seedAdmin.js
 * Creates the admin account using credentials from .env
 * Remove ADMIN_EMAIL and ADMIN_PASSWORD from .env after running.
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const existing = await Admin.findOne({ email });

  if (existing) {
    console.log('Admin account already exists. Seeder aborted.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await Admin.create({ email, passwordHash });

  console.log(`Admin created: ${email}`);
  console.log('Remove ADMIN_EMAIL and ADMIN_PASSWORD from .env now.');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
