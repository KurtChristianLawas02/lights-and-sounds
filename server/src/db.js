import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'alberca_booking',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

export async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function ensureSchema() {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'bookings'
       AND COLUMN_NAME = 'delivery_status'`
  );

  if (!rows.length) {
    await pool.execute(
      `ALTER TABLE bookings
       ADD COLUMN delivery_status ENUM('Preparing', 'Out for Delivery', 'Delivered') NOT NULL DEFAULT 'Preparing' AFTER status`
    );
  }
}
