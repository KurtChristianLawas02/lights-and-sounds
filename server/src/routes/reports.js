import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/summary', async (req, res, next) => {
  try {
    const [summary] = await query(
      `SELECT
        COUNT(*) AS total_bookings,
        COALESCE(SUM(CASE WHEN status IN ('Paid', 'Completed') THEN total_amount ELSE 0 END), 0) AS revenue,
        COALESCE(AVG(total_amount), 0) AS average_booking
       FROM bookings`
    );
    const statuses = await query('SELECT status, COUNT(*) AS count FROM bookings GROUP BY status ORDER BY status');
    const products = await query('SELECT COUNT(*) AS total_products FROM products WHERE is_active = TRUE');
    const customers = await query('SELECT COUNT(*) AS total_customers FROM users WHERE role = "customer"');

    res.json({
      summary: {
        ...summary,
        total_products: products[0].total_products,
        total_customers: customers[0].total_customers
      },
      statuses
    });
  } catch (error) {
    next(error);
  }
});

router.get('/sales', async (req, res, next) => {
  try {
    const monthly = await query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
              COALESCE(SUM(CASE WHEN status IN ('Paid', 'Completed') THEN total_amount ELSE 0 END), 0) AS revenue,
              COUNT(*) AS bookings
       FROM bookings
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`
    );
    const popular = await query(
      `SELECT p.name, p.category, SUM(bi.quantity) AS rented_quantity, SUM(bi.line_total) AS rental_total
       FROM booking_items bi
       JOIN products p ON p.id = bi.product_id
       JOIN bookings b ON b.id = bi.booking_id
       WHERE b.status IN ('Approved', 'Paid', 'Completed')
       GROUP BY p.id
       ORDER BY rented_quantity DESC
       LIMIT 8`
    );

    res.json({ monthly, popular });
  } catch (error) {
    next(error);
  }
});

router.get('/sales/:month', async (req, res, next) => {
  try {
    const { month } = req.params;
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Month must use YYYY-MM format.' });
    }

    const orders = await query(
      `SELECT b.id,
              b.created_at,
              b.start_datetime,
              b.status,
              b.total_amount,
              u.name AS customer_name,
              u.email AS customer_email,
              COUNT(bi.id) AS item_count
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       LEFT JOIN booking_items bi ON bi.booking_id = b.id
       WHERE DATE_FORMAT(b.created_at, '%Y-%m') = :month
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      { month }
    );
    const [summary] = await query(
      `SELECT COALESCE(SUM(CASE WHEN status IN ('Paid', 'Completed') THEN total_amount ELSE 0 END), 0) AS total_sales,
              COUNT(*) AS bookings
       FROM bookings
       WHERE DATE_FORMAT(created_at, '%Y-%m') = :month`,
      { month }
    );

    res.json({ month, orders, summary });
  } catch (error) {
    next(error);
  }
});

router.get('/calendar', async (req, res, next) => {
  try {
    const bookings = await query(
      `SELECT b.id,
              b.start_datetime,
              b.end_datetime,
              b.status,
              b.delivery_status,
              b.delivery_location,
              b.total_amount,
              u.name AS customer_name,
              u.email AS customer_email
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       ORDER BY b.start_datetime ASC`
    );
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
});

export default router;
