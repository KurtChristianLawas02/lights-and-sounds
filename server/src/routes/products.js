import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'products');
const allowedImageTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif']
]);

router.get('/', async (req, res, next) => {
  try {
    const { category, search, includeInactive } = req.query;
    const params = {};
    const where = [];

    if (category && category !== 'All') {
      where.push('category = :category');
      params.category = category;
    }

    if (search) {
      where.push('(name LIKE :search OR description LIKE :search)');
      params.search = `%${search}%`;
    }

    if (includeInactive !== 'true') {
      where.push('is_active = TRUE');
    }

    const sql = `SELECT * FROM products ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY category, name`;
    res.json({ products: await query(sql, params) });
  } catch (error) {
    next(error);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const where = req.query.includeInactive === 'true' ? '' : 'WHERE is_active = TRUE';
    const rows = await query(`SELECT DISTINCT category FROM products ${where} ORDER BY category`);
    res.json({ categories: rows.map((row) => row.category) });
  } catch (error) {
    next(error);
  }
});

router.post('/upload-image', requireAuth, requireAdmin, express.raw({ type: [...allowedImageTypes.keys()], limit: '5mb' }), async (req, res, next) => {
  try {
    const extension = allowedImageTypes.get(req.headers['content-type']);
    if (!extension || !Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ message: 'Attach a JPG, PNG, WebP, or GIF image.' });
    }

    await fs.mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    await fs.writeFile(path.join(uploadDir, filename), req.body);
    const image_url = `${req.protocol}://${req.get('host')}/uploads/products/${filename}`;
    res.status(201).json({ image_url });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const products = await query('SELECT * FROM products WHERE id = :id', { id: req.params.id });
    if (!products.length) return res.status(404).json({ message: 'Product not found.' });
    res.json({ product: products[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const product = normalizeProduct(req.body);
    const result = await query(
      `INSERT INTO products
       (name, category, description, price_per_hour, price_per_day, stock_quantity, image_url, specs, is_active)
       VALUES
        (:name, :category, :description, :price_per_hour, :price_per_day, :stock_quantity, :image_url, :specs, :is_active)`,
      product
    );
    res.status(201).json({ id: result.insertId, ...product });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const product = normalizeProduct(req.body);
    await query(
      `UPDATE products SET
        name = :name,
        category = :category,
        description = :description,
        price_per_hour = :price_per_hour,
        price_per_day = :price_per_day,
        stock_quantity = :stock_quantity,
        image_url = :image_url,
        specs = :specs,
        is_active = :is_active
       WHERE id = :id`,
      { ...product, id: req.params.id }
    );
    res.json({ id: Number(req.params.id), ...product });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await query('UPDATE products SET is_active = FALSE WHERE id = :id', { id: req.params.id });
    res.json({ message: 'Product archived.' });
  } catch (error) {
    next(error);
  }
});

function normalizeProduct(body) {
  if (!body.name || !body.category) {
    throw Object.assign(new Error('Name and category are required.'), { status: 400 });
  }

  return {
    name: body.name,
    category: body.category,
    description: body.description || '',
    price_per_hour: Number(body.price_per_hour || 0),
    price_per_day: Number(body.price_per_day || 0),
    stock_quantity: Number(body.stock_quantity || 1),
    image_url: body.image_url || '',
    specs: JSON.stringify(body.specs || {}),
    is_active: body.is_active === false ? 0 : 1
  };
}

export default router;
