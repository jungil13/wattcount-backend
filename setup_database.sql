-- WattCount Database Setup Script
-- Run this script to create the database and all tables

-- Create database
CREATE DATABASE IF NOT EXISTS wattcount CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE wattcount;

-- Users table
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_phone_number (phone_number),
  INDEX idx_role (role),
  INDEX idx_shared_code (shared_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shared codes table (for connecting shared users)
CREATE TABLE IF NOT EXISTS shared_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  main_user_id INT NOT NULL,
  expires_at TIMESTAMP NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_by_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (main_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_code (code),
  INDEX idx_main_user (main_user_id),
  INDEX idx_is_used (is_used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Consumption records table
CREATE TABLE IF NOT EXISTS consumption_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reading_date DATE NOT NULL,
  previous_reading DECIMAL(10, 2) DEFAULT 0,
  current_reading DECIMAL(10, 2) NOT NULL,
  consumption_kwh DECIMAL(10, 2) NOT NULL,
  billing_cycle VARCHAR(50) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, reading_date),
  INDEX idx_billing_cycle (billing_cycle),
  INDEX idx_reading_date (reading_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Electricity rates table
CREATE TABLE IF NOT EXISTS electricity_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rate_per_kwh DECIMAL(10, 4) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_effective_from (effective_from),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  consumption_record_id INT NOT NULL,
  billing_cycle VARCHAR(50) NOT NULL,
  consumption_kwh DECIMAL(10, 2) NOT NULL,
  rate_per_kwh DECIMAL(10, 4) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NULL,
  status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (consumption_record_id) REFERENCES consumption_records(id) ON DELETE CASCADE,
  INDEX idx_user_cycle (user_id, billing_cycle),
  INDEX idx_billing_cycle (billing_cycle),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NULL,
  reference_number VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  INDEX idx_bill_id (bill_id),
  INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(50) NULL,
  record_id INT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_table_name (table_name),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

