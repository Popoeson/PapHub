/**
 * Run once: node scripts/seedAdmin.js
 * Creates the superadmin account using credentials from .env
 * Remove ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME from .env after running.
 */

require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();

  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name     = process.env.ADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const existing = await Admin.findOne({ email });

  if (existing) {
    // If account exists but has no name or role, update it
    if (!existing.name || existing.role !== 'superadmin') {
      existing.name = name;
      existing.role = 'superadmin';
      await existing.save();
      console.log(`Existing admin updated to superadmin: ${email}`);
    } else {
      console.log('Superadmin account already exists. Seeder aborted.');
    }
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await Admin.create({
    email,
    name,
    passwordHash,
    role: 'superadmin',
  });

  console.log(`Superadmin created: ${email}`);
  console.log('Remove ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_NAME from .env now.');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
