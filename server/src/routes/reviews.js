import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/product/:productId', async (req, res, next) => {
  try {
    const reviews = await query(
      `SELECT r.*, u.name AS customer_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = :productId
       ORDER BY r.created_at DESC`,
      { productId: req.params.productId }
    );
    res.json({ reviews });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { product_id, booking_id, rating, comment } = req.body;
    const bookings = await query(
      'SELECT id FROM bookings WHERE id = :booking_id AND user_id = :user_id AND status = "Completed"',
      { booking_id, user_id: req.user.id }
    );

    if (!bookings.length) {
      return res.status(403).json({ message: 'Reviews require a completed booking.' });
    }

    const result = await query(
      'INSERT INTO reviews (user_id, product_id, booking_id, rating, comment) VALUES (:user_id, :product_id, :booking_id, :rating, :comment)',
      {
        user_id: req.user.id,
        product_id,
        booking_id,
        rating: Number(rating),
        comment: comment || null
      }
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    next(error);
  }
});

export default router;

