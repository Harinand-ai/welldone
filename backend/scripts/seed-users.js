const bcrypt = require('bcryptjs');
const db = require('../db');

async function seed() {
  try {
    console.log('Seeding users...');
    
    // Hash passwords
    const ownerHash = await bcrypt.hash('owner123', 10);
    const cashierHash = await bcrypt.hash('cashier123', 10);
    
    // Clean existing users (optional, but since database was just setup, we just insert)
    await db.query('DELETE FROM users');
    
    // Insert owner
    await db.query(
      'INSERT INTO users (username, password_hash, role, name, phone_number) VALUES ($1, $2, $3, $4, $5)',
      ['owner', ownerHash, 'owner', 'Owner Account', '9876543210']
    );
    console.log('Owner user seeded (username: owner, password: owner123)');
    
    // Insert cashier
    await db.query(
      'INSERT INTO users (username, password_hash, role, name, phone_number) VALUES ($1, $2, $3, $4, $5)',
      ['cashier', cashierHash, 'cashier', 'Cashier Account', '9876543211']
    );
    console.log('Cashier user seeded (username: cashier, password: cashier123)');
    
    console.log('Seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding users:', err);
    process.exit(1);
  }
}

seed();
