import pool from '../config/database.js';

class Bill {
  static async create(billData) {
    const { user_id, consumption_record_id, billing_cycle, consumption_kwh, rate_per_kwh, total_amount, due_date } = billData;
    
    const [result] = await pool.query(
      `INSERT INTO bills 
       (user_id, consumption_record_id, billing_cycle, consumption_kwh, rate_per_kwh, total_amount, due_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, consumption_record_id, billing_cycle, consumption_kwh, rate_per_kwh, total_amount, due_date || null]
    );
    
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT b.*, u.username, u.full_name, cr.reading_date, cr.current_reading, cr.previous_reading, cr.consumption_kwh
       FROM bills b
       JOIN users u ON b.user_id = u.id
       JOIN consumption_records cr ON b.consumption_record_id = cr.id
       WHERE b.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByUserId(userId, limit = null) {
    let query = `
      SELECT b.*, u.username, u.full_name, cr.reading_date, cr.current_reading, cr.previous_reading, cr.consumption_kwh
      FROM bills b
      JOIN users u ON b.user_id = u.id
      JOIN consumption_records cr ON b.consumption_record_id = cr.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `;
    
    if (limit) {
      query += ` LIMIT ${parseInt(limit)}`;
    }
    
    const [rows] = await pool.query(query, [userId]);
    return rows;
  }

  static async getByBillingCycle(billingCycle, userId = null) {
    let query = `
      SELECT b.*, u.username, u.full_name, cr.reading_date, cr.current_reading, cr.previous_reading, cr.consumption_kwh
      FROM bills b
      JOIN users u ON b.user_id = u.id
      JOIN consumption_records cr ON b.consumption_record_id = cr.id
      WHERE b.billing_cycle = ?
    `;
    
    const params = [billingCycle];
    if (userId) {
      query += ' AND b.user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY b.created_at DESC';
    
    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async getAllForMainUser(mainUserId) {
    const [rows] = await pool.query(
      `SELECT b.*, u.username, u.full_name, u.role, cr.reading_date, cr.current_reading, cr.previous_reading, cr.consumption_kwh
       FROM bills b
       JOIN users u ON b.user_id = u.id
       JOIN consumption_records cr ON b.consumption_record_id = cr.id
       WHERE u.id = ? OR u.shared_code IN (
         SELECT code FROM shared_codes WHERE main_user_id = ?
       )
       ORDER BY b.created_at DESC`,
      [mainUserId, mainUserId]
    );
    return rows;
  }

  static async updateStatus(id, status) {
    const [result] = await pool.query(
      'UPDATE bills SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }

  static async calculateTotalPaid(billId) {
    const [rows] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE bill_id = ?',
      [billId]
    );
    return rows[0].total_paid;
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
      `UPDATE bills SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM bills WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async getAllForSharedUser(sharedUserId) {
    // Get main user ID from shared user's shared_code
    const [userRows] = await pool.query(
      'SELECT shared_code FROM users WHERE id = ?',
      [sharedUserId]
    );
    
    if (!userRows[0] || !userRows[0].shared_code) {
      return [];
    }

    // Get main user ID from shared_codes table
    const [codeRows] = await pool.query(
      'SELECT main_user_id FROM shared_codes WHERE code = ?',
      [userRows[0].shared_code]
    );

    if (!codeRows[0]) {
      return [];
    }

    const mainUserId = codeRows[0].main_user_id;

    // Get all bills for main user and all shared users under that main user
    const [rows] = await pool.query(
      `SELECT b.*, u.username, u.full_name, u.role, cr.reading_date, cr.current_reading, cr.previous_reading, cr.consumption_kwh
       FROM bills b
       JOIN users u ON b.user_id = u.id
       JOIN consumption_records cr ON b.consumption_record_id = cr.id
       WHERE u.id = ? OR u.shared_code IN (
         SELECT code FROM shared_codes WHERE main_user_id = ?
       )
       ORDER BY b.created_at DESC`,
      [mainUserId, mainUserId]
    );
    return rows;
  }
}

export default Bill;


