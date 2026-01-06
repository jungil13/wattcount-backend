import pool from '../config/database.js';

class Consumption {
  static async create(consumptionData) {
    const { user_id, reading_date, previous_reading, current_reading, consumption_kwh, billing_cycle, notes } = consumptionData;
    
    const [result] = await pool.query(
      `INSERT INTO consumption_records 
       (user_id, reading_date, previous_reading, current_reading, consumption_kwh, billing_cycle, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, reading_date, previous_reading || 0, current_reading, consumption_kwh, billing_cycle, notes || null]
    );
    
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT cr.*, u.username, u.full_name 
       FROM consumption_records cr
       JOIN users u ON cr.user_id = u.id
       WHERE cr.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByUserId(userId, limit = null) {
    let query = `
      SELECT cr.*, u.username, u.full_name 
      FROM consumption_records cr
      JOIN users u ON cr.user_id = u.id
      WHERE cr.user_id = ?
      ORDER BY cr.reading_date DESC
    `;
    
    if (limit) {
      query += ` LIMIT ${parseInt(limit)}`;
    }
    
    const [rows] = await pool.query(query, [userId]);
    return rows;
  }

  static async getLatestByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT * FROM consumption_records 
       WHERE user_id = ? 
       ORDER BY reading_date DESC 
       LIMIT 1`,
      [userId]
    );
    return rows[0];
  }

  static async getAllForMainUser(mainUserId) {
    const [rows] = await pool.query(
      `SELECT cr.*, u.username, u.full_name, u.role
       FROM consumption_records cr
       JOIN users u ON cr.user_id = u.id
       WHERE u.id = ? OR u.shared_code IN (
         SELECT code FROM shared_codes WHERE main_user_id = ?
       )
       ORDER BY cr.reading_date DESC`,
      [mainUserId, mainUserId]
    );
    return rows;
  }

  static async getByBillingCycle(billingCycle, userId = null) {
    let query = `
      SELECT cr.*, u.username, u.full_name 
      FROM consumption_records cr
      JOIN users u ON cr.user_id = u.id
      WHERE cr.billing_cycle = ?
    `;
    
    const params = [billingCycle];
    if (userId) {
      query += ' AND cr.user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY cr.reading_date DESC';
    
    const [rows] = await pool.query(query, params);
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
      `UPDATE consumption_records SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM consumption_records WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async getSummary(userId, startDate, endDate) {
    const [rows] = await pool.query(
      `SELECT 
        SUM(consumption_kwh) as total_kwh,
        COUNT(*) as record_count,
        MIN(reading_date) as start_date,
        MAX(reading_date) as end_date
       FROM consumption_records
       WHERE user_id = ? AND reading_date BETWEEN ? AND ?`,
      [userId, startDate, endDate]
    );
    return rows[0];
  }
}

export default Consumption;


