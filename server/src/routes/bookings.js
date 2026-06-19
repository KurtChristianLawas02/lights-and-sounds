import express from 'express';
import { pool, query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { priceForDuration, rentalHours, serviceFee } from '../utils/pricing.js';

const router = express.Router();

router.post('/availability', async (req, res, next) => {
  try {
    const { items, start_datetime, end_datetime } = req.body;
    const availability = await checkAvailability(items || [], start_datetime, end_datetime);
    res.json({ availability, available: availability.every((item) => item.available) });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const {
      items = [],
      start_datetime,
      end_datetime,
      delivery_location,
      setup_needed,
      technician_needed,
      notes
    } = req.body;

    if (!items.length || !delivery_location) {
      return res.status(400).json({ message: 'Items and delivery location are required.' });
    }

    const hours = rentalHours(start_datetime, end_datetime);
    const availability = await checkAvailability(items, start_datetime, end_datetime);
    const unavailable = availability.filter((item) => !item.available);

    if (unavailable.length) {
      return res.status(409).json({ message: 'Some items are unavailable.', unavailable });
    }

    const productRows = await productsByIds(items.map((item) => item.product_id));
    const products = new Map(productRows.map((product) => [Number(product.id), product]));
    let subtotal = 0;
    const pricedItems = items.map((item) => {
      const product = products.get(Number(item.product_id));
      const quantity = Number(item.quantity || 1);
      const unitPrice = priceForDuration(product, hours);
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;
      return { product_id: product.id, quantity, unitPrice, lineTotal };
    });

    const extraFee = serviceFee({ setupNeeded: setup_needed, technicianNeeded: technician_needed });
    const total = subtotal + extraFee;

    await connection.beginTransaction();
    const [bookingResult] = await connection.execute(
      `INSERT INTO bookings
        (user_id, start_datetime, end_datetime, delivery_location, setup_needed, technician_needed, status, subtotal, service_fee, total_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?)`,
      [
        req.user.id,
        start_datetime,
        end_datetime,
        delivery_location,
        setup_needed ? 1 : 0,
        technician_needed ? 1 : 0,
        subtotal,
        extraFee,
        total,
        notes || null
      ]
    );

    for (const item of pricedItems) {
      await connection.execute(
        'INSERT INTO booking_items (booking_id, product_id, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?)',
        [bookingResult.insertId, item.product_id, item.quantity, item.unitPrice, item.lineTotal]
      );
    }

    await connection.commit();
    res.status(201).json({ id: bookingResult.insertId, subtotal, service_fee: extraFee, total_amount: total, status: 'Pending' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const bookings = await query(
      `SELECT b.*, COUNT(bi.id) AS item_count
       FROM bookings b
       LEFT JOIN booking_items bi ON bi.booking_id = b.id
       WHERE b.user_id = :userId
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      { userId: req.user.id }
    );
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT b.*, u.name AS customer_name, u.email AS customer_email, COUNT(bi.id) AS item_count
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       LEFT JOIN booking_items bi ON bi.booking_id = b.id
       GROUP BY b.id
       ORDER BY b.start_datetime DESC`
    );
    res.json({ bookings: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const bookings = await query(
      `SELECT b.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       WHERE b.id = :id`,
      { id: req.params.id }
    );
    const booking = bookings[0];

    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed.' });
    }

    const items = await query(
      `SELECT bi.*, p.name, p.category, p.image_url
       FROM booking_items bi
       JOIN products p ON p.id = bi.product_id
       WHERE bi.booking_id = :id`,
      { id: req.params.id }
    );
    const payments = await query('SELECT * FROM payments WHERE booking_id = :id ORDER BY created_at DESC', { id: req.params.id });

    res.json({ booking, items, payments });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['Pending', 'Approved', 'Rejected', 'Paid', 'Completed', 'Cancelled'];
    const { status } = req.body;
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid booking status.' });
    }

    await query('UPDATE bookings SET status = :status WHERE id = :id', { status, id: req.params.id });
    res.json({ id: Number(req.params.id), status });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/delivery-status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['Preparing', 'Out for Delivery', 'Delivered'];
    const { delivery_status } = req.body;
    if (!allowed.includes(delivery_status)) {
      return res.status(400).json({ message: 'Invalid delivery status.' });
    }

    await query(
      'UPDATE bookings SET delivery_status = :delivery_status WHERE id = :id',
      { delivery_status, id: req.params.id }
    );
    res.json({ id: Number(req.params.id), delivery_status });
  } catch (error) {
    next(error);
  }
});

async function productsByIds(ids) {
  if (!ids.length) return [];
  const placeholders = ids.map((_, index) => `:id${index}`).join(', ');
  const params = Object.fromEntries(ids.map((id, index) => [`id${index}`, id]));
  return query(`SELECT * FROM products WHERE id IN (${placeholders}) AND is_active = TRUE`, params);
}

async function checkAvailability(items, startDatetime, endDatetime) {
  rentalHours(startDatetime, endDatetime);
  const products = await productsByIds(items.map((item) => item.product_id));
  const productMap = new Map(products.map((product) => [Number(product.id), product]));

  return Promise.all(items.map(async (item) => {
    const product = productMap.get(Number(item.product_id));
    if (!product) {
      return { product_id: Number(item.product_id), requested: Number(item.quantity || 1), available: false, message: 'Product not found.' };
    }

    const rows = await query(
      `SELECT COALESCE(SUM(bi.quantity), 0) AS reserved
       FROM booking_items bi
       JOIN bookings b ON b.id = bi.booking_id
       WHERE bi.product_id = :productId
         AND b.status IN ('Pending', 'Approved', 'Paid')
         AND b.start_datetime < :endDatetime
         AND b.end_datetime > :startDatetime`,
      {
        productId: product.id,
        startDatetime,
        endDatetime
      }
    );

    const reserved = Number(rows[0]?.reserved || 0);
    const requested = Number(item.quantity || 1);
    const remaining = Number(product.stock_quantity) - reserved;

    return {
      product_id: product.id,
      name: product.name,
      stock_quantity: Number(product.stock_quantity),
      reserved,
      remaining,
      requested,
      available: remaining >= requested
    };
  }));
}

export default router;
