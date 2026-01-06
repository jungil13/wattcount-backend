import pool from '../config/database.js';

class ElectricityRate {
  static async create(rateData) {
    const { rate_per_kwh, effective_from, effective_to, created_by } = rateData;
    
    // Deactivate previous rates
    await pool.query(
      'UPDATE electricity_rates SET is_active = FALSE WHERE is_active = TRUE'
    );
    
    const [result] = await pool.query(
      `INSERT INTO electricity_rates (rate_per_kwh, effective_from, effective_to, created_by) 
       VALUES (?, ?, ?, ?)`,
      [rate_per_kwh, effective_from, effective_to || null, created_by]
    );
    
    return result.insertId;
  }

  static async getCurrentRate() {
    const [rows] = await pool.query(
      `SELECT * FROM electricity_rates 
       WHERE is_active = TRUE 
       AND (effective_to IS NULL OR effective_to >= CURDATE())
       ORDER BY effective_from DESC 
       LIMIT 1`
    );
    return rows[0];
  }

  static async getAll() {
    const [rows] = await pool.query(
      'SELECT * FROM electricity_rates ORDER BY effective_from DESC'
    );
    return rows;
  }

  static async getRateByDate(date) {
    const [rows] = await pool.query(
      `SELECT * FROM electricity_rates 
       WHERE effective_from <= ? 
       AND (effective_to IS NULL OR effective_to >= ?)
       ORDER BY effective_from DESC 
       LIMIT 1`,
      [date, date]
    );
    return rows[0];
  }
}

export default ElectricityRate;


