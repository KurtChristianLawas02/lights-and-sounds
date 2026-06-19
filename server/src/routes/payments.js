import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { booking_id, amount, method, reference_number, status } = req.body;
    if (!booking_id || !amount) {
      return res.status(400).json({ message: 'Booking and amount are required.' });
    }

    const result = await query(
      `INSERT INTO payments (booking_id, amount, method, reference_number, status, paid_at)
       VALUES (:booking_id, :amount, :method, :reference_number, :status, CASE WHEN :status = 'Verified' THEN NOW() ELSE NULL END)`,
      {
        booking_id,
        amount,
        method: method || 'Manual',
        reference_number: reference_number || null,
        status: status || 'Submitted'
      }
    );

    if (status === 'Verified') {
      await query('UPDATE bookings SET status = "Paid" WHERE id = :booking_id', { booking_id });
    }

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status, reference_number } = req.body;
    await query(
      `UPDATE payments
       SET status = :status,
           reference_number = COALESCE(:reference_number, reference_number),
           paid_at = CASE WHEN :status = 'Verified' THEN NOW() ELSE paid_at END
       WHERE id = :id`,
      { id: req.params.id, status, reference_number: reference_number || null }
    );

    if (status === 'Verified') {
      await query(
        `UPDATE bookings b
         JOIN payments p ON p.booking_id = b.id
         SET b.status = 'Paid'
         WHERE p.id = :id`,
        { id: req.params.id }
      );
    }

    res.json({ id: Number(req.params.id), status });
  } catch (error) {
    next(error);
  }
});

export default router;

