CREATE DATABASE IF NOT EXISTS alberca_booking;
USE alberca_booking;

DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS booking_items;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(40),
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT,
  price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_quantity INT NOT NULL DEFAULT 1,
  image_url VARCHAR(500),
  specs JSON NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_category (category),
  INDEX idx_products_active (is_active)
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  delivery_location VARCHAR(255) NOT NULL,
  setup_needed BOOLEAN NOT NULL DEFAULT FALSE,
  technician_needed BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('Pending', 'Approved', 'Rejected', 'Paid', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  delivery_status ENUM('Preparing', 'Out for Delivery', 'Delivered') NOT NULL DEFAULT 'Preparing',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_bookings_user (user_id),
  INDEX idx_bookings_status (status),
  INDEX idx_bookings_window (start_datetime, end_datetime)
);

CREATE TABLE booking_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_items_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_booking_items_booking (booking_id),
  INDEX idx_booking_items_product (product_id)
);

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(80) NOT NULL DEFAULT 'Manual',
  reference_number VARCHAR(160),
  status ENUM('Unpaid', 'Submitted', 'Verified', 'Refunded') NOT NULL DEFAULT 'Submitted',
  paid_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_payments_booking (booking_id),
  INDEX idx_payments_status (status)
);

CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  booking_id INT NOT NULL,
  rating INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  INDEX idx_reviews_product (product_id),
  INDEX idx_reviews_booking (booking_id)
);

INSERT INTO users (name, email, password_hash, phone, role) VALUES
('KYURT Admin', 'admin@kyurt.test', '$2a$10$0Ws6lC75ImJ4ZVAdYeIjlen6PxXCSSqA9C3WSjvP/PiftiOLMlRk.', '+63 900 000 0000', 'admin'),
('Sample Customer', 'customer@kyurt.test', '$2a$10$0Ws6lC75ImJ4ZVAdYeIjlen6PxXCSSqA9C3WSjvP/PiftiOLMlRk.', '+63 911 111 1111', 'customer');

INSERT INTO products (name, category, description, price_per_hour, price_per_day, stock_quantity, image_url, specs) VALUES
('Concert Line Array Sound System', 'Sound Systems', 'Premium line array package for outdoor concerts and large ballrooms.', 2500, 18000, 3, 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80', JSON_OBJECT('coverage', '800-1200 guests', 'includes', 'mixer, amps, subs')),
('P3.91 LED Wall Package', 'LED Walls', 'High-resolution modular LED wall for stages, conferences, and launches.', 3200, 24000, 2, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80', JSON_OBJECT('pitch', 'P3.91', 'size', 'configurable')),
('Moving Head Beam Lights', 'Lights', 'Programmable beam lights with rich color and motion effects.', 450, 3200, 24, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80', JSON_OBJECT('power', '230W', 'modes', 'DMX')),
('Wireless Microphone Set', 'Microphones', 'Reliable wireless microphones for hosts, singers, and panels.', 180, 1200, 18, 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80', JSON_OBJECT('channels', 'dual', 'range', '100m')),
('Laser Projector 8000 Lumens', 'Projectors', 'Bright projector for presentations, mapping, and indoor screenings.', 650, 4500, 5, 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80', JSON_OBJECT('brightness', '8000 lumens', 'resolution', 'WUXGA')),
('Powered Speaker Pair', 'Speakers', 'Portable powered speakers for seminars, parties, and small venues.', 350, 2500, 10, 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80', JSON_OBJECT('power', '1000W', 'coverage', '100-200 guests'));
