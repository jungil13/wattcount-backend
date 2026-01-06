import pool from '../config/database.js';

class Payment {
  static async create(paymentData) {
    const { bill_id, amount, payment_date, payment_method, reference_number, notes } = paymentData;
    
    const [result] = await pool.query(
      `INSERT INTO payments (bill_id, amount, payment_date, payment_method, reference_number, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bill_id, amount, payment_date, payment_method || null, reference_number || null, notes || null]
    );
    
    return result.insertId;
  }

  static async findByBillId(billId) {
    const [rows] = await pool.query(
      'SELECT * FROM payments WHERE bill_id = ? ORDER BY payment_date DESC',
      [billId]
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT p.*, b.user_id, b.total_amount, u.username, u.full_name
       FROM payments p
       JOIN bills b ON p.bill_id = b.id
       JOIN users u ON b.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async getByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT p.*, b.billing_cycle, b.total_amount, b.status
       FROM payments p
       JOIN bills b ON p.bill_id = b.id
       WHERE b.user_id = ?
       ORDER BY p.payment_date DESC`,
      [userId]
    );
    return rows;
  }
}

export default Payment;


