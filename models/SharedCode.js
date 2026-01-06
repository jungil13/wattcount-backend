import pool from '../config/database.js';

class SharedCode {
  static async create(codeData) {
    const { code, main_user_id, expires_at } = codeData;
    
    const [result] = await pool.query(
      `INSERT INTO shared_codes (code, main_user_id, expires_at) 
       VALUES (?, ?, ?)`,
      [code, main_user_id, expires_at || null]
    );
    
    return result.insertId;
  }

  static async findByCode(code) {
    const [rows] = await pool.query(
      `SELECT sc.*, u.username as main_username, u.full_name as main_full_name
       FROM shared_codes sc
       JOIN users u ON sc.main_user_id = u.id
       WHERE sc.code = ? AND sc.is_used = FALSE 
       AND (sc.expires_at IS NULL OR sc.expires_at > NOW())`,
      [code]
    );
    return rows[0];
  }

  static async markAsUsed(code, userId) {
    const [result] = await pool.query(
      'UPDATE shared_codes SET is_used = TRUE, used_by_user_id = ? WHERE code = ?',
      [userId, code]
    );
    return result.affectedRows > 0;
  }

  static async getActiveCodesByMainUser(mainUserId) {
    const [rows] = await pool.query(
      `SELECT sc.*, u.username as used_by_username, u.full_name as used_by_full_name
       FROM shared_codes sc
       LEFT JOIN users u ON sc.used_by_user_id = u.id
       WHERE sc.main_user_id = ?
       ORDER BY sc.created_at DESC`,
      [mainUserId]
    );
    return rows;
  }

  static async delete(code) {
    const [result] = await pool.query(
      'DELETE FROM shared_codes WHERE code = ?',
      [code]
    );
    return result.affectedRows > 0;
  }
}

export default SharedCode;


