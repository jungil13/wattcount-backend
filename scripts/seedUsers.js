import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import SharedCode from '../models/SharedCode.js';

const mockUsers = [
  {
    username: 'admin',
    phone_number: '+639123456789',
    password: 'admin123',
    full_name: 'Main Administrator',
    role: 'main_user'
  },
  {
    username: 'user1',
    phone_number: '+639123456790',
    password: 'user123',
    full_name: 'John Doe',
    role: 'shared_user',
    shared_code: 'TESTCODE1'
  },
  {
    username: 'user2',
    phone_number: '+639123456791',
    password: 'user123',
    full_name: 'Jane Smith',
    role: 'shared_user',
    shared_code: 'TESTCODE1'
  },
  {
    username: 'user3',
    phone_number: '+639123456792',
    password: 'user123',
    full_name: 'Bob Johnson',
    role: 'shared_user',
    shared_code: 'TESTCODE1'
  }
];

async function seedUsers() {
  try {
    console.log('🌱 Starting user seeding...\n');

    // Clear existing test users (optional - comment out if you want to keep existing data)
    console.log('Cleaning up existing test users...');
    await pool.query("DELETE FROM users WHERE username IN ('admin', 'user1', 'user2', 'user3')");
    await pool.query("DELETE FROM shared_codes WHERE code = 'TESTCODE1'");

    // Create main user
    console.log('Creating main user (admin)...');
    const mainUserData = mockUsers[0];
    let mainUserCode;
    let isUnique = false;
    while (!isUnique) {
      mainUserCode = await User.generateSharedCode();
      const existing = await User.findBySharedCode(mainUserCode);
      if (!existing) {
        isUnique = true;
      }
    }

    const mainUserId = await User.create({
      ...mainUserData,
      shared_code: mainUserCode
    });

    console.log(`✅ Main user created:`);
    console.log(`   Username: ${mainUserData.username}`);
    console.log(`   Password: ${mainUserData.password}`);
    console.log(`   Shared Code: ${mainUserCode}\n`);

    // Create shared code for test users
    console.log('Creating shared code for test users...');
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 365); // Expires in 1 year

    await SharedCode.create({
      code: 'TESTCODE1',
      main_user_id: mainUserId,
      expires_at
    });

    // Create shared users
    console.log('Creating shared users...');
    for (let i = 1; i < mockUsers.length; i++) {
      const userData = mockUsers[i];
      const userId = await User.create({
        ...userData,
        shared_code: 'TESTCODE1'
      });

      // Mark shared code as used (but we'll allow multiple users with same code for testing)
      // In production, each code is used once
      
      console.log(`✅ Shared user ${i} created:`);
      console.log(`   Username: ${userData.username}`);
      console.log(`   Password: ${userData.password}`);
      console.log(`   Name: ${userData.full_name}\n`);
    }

    // Mark the shared code as used by the first shared user
    const firstSharedUser = await User.findByUsername('user1');
    await SharedCode.markAsUsed('TESTCODE1', firstSharedUser.id);

    console.log('🎉 User seeding completed successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Main User:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  Shared Code: ' + mainUserCode);
    console.log('\nShared Users:');
    console.log('  Username: user1, user2, user3');
    console.log('  Password: user123 (for all)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();

