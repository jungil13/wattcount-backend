import pool from './database.js';

export async function initDatabase() {
  try {
    // Create database if it doesn't exist
    const connection = await pool.getConnection();
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'wattcount'}`);
    await connection.release();

    // Create tables
    await createTables();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

async function createTables() {
  const connection = await pool.getConnection();
  
  try {
    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role ENUM('main_user', 'shared_user') NOT NULL,
        shared_code VARCHAR(10) UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Shared codes table (for connecting shared users)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shared_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        main_user_id INT NOT NULL,
        expires_at TIMESTAMP,
        is_used BOOLEAN DEFAULT FALSE,
        used_by_user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (main_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Consumption records table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS consumption_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        reading_date DATE NOT NULL,
        previous_reading DECIMAL(10, 2) DEFAULT 0,
        current_reading DECIMAL(10, 2) NOT NULL,
        consumption_kwh DECIMAL(10, 2) NOT NULL,
        billing_cycle VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_date (user_id, reading_date)
      )
    `);

    // Electricity rates table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS electricity_rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rate_per_kwh DECIMAL(10, 4) NOT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Bills table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        consumption_record_id INT NOT NULL,
        billing_cycle VARCHAR(50) NOT NULL,
        consumption_kwh DECIMAL(10, 2) NOT NULL,
        rate_per_kwh DECIMAL(10, 4) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        due_date DATE,
        status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (consumption_record_id) REFERENCES consumption_records(id) ON DELETE CASCADE,
        INDEX idx_user_cycle (user_id, billing_cycle)
      )
    `);

    // Payments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50),
        reference_number VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
      )
    `);

    // Audit logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(50),
        record_id INT,
        old_values JSON,
        new_values JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    connection.release();
  }
}

