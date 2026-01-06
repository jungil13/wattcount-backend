import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

class User {
  static async create(userData) {
    const { username, phone_number, password, full_name, role, shared_code } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.query(
      `INSERT INTO users (username, phone_number, password, full_name, role, shared_code) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, phone_number, hashedPassword, full_name, role, shared_code || null]
    );
    
    return result.insertId;
  }

  static async findByUsername(username) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0];
  }

  static async findByPhoneNumber(phone_number) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE phone_number = ?',
      [phone_number]
    );
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, username, phone_number, full_name, role, shared_code, is_active, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findBySharedCode(shared_code) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE shared_code = ?',
      [shared_code]
    );
    return rows[0];
  }

  static async getAllSharedUsers(mainUserId) {
    const [rows] = await pool.query(
      `SELECT id, username, phone_number, full_name, role, is_active, created_at 
       FROM users 
       WHERE role = 'shared_user' AND shared_code IN (
         SELECT code FROM shared_codes WHERE main_user_id = ?
       )`,
      [mainUserId]
    );
    return rows;
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (fields.length === 0) return null;
    
    values.push(id);
    const [result] = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  static async deactivate(id) {
    const [result] = await pool.query(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async generateSharedCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export default User;

