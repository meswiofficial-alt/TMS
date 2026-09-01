-- Tristar Garage Management System - Complete Database Schema
-- Run this in phpMyAdmin or MySQL CLI

CREATE DATABASE IF NOT EXISTS tristar_garage;
USE tristar_garage;

-- Users table (existing)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'operator') DEFAULT 'operator',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) DEFAULT '',
    email VARCHAR(100) DEFAULT '',
    address TEXT DEFAULT '',
    registration_date DATE DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT DEFAULT NULL,
    plate VARCHAR(20) NOT NULL,
    vin VARCHAR(50) DEFAULT '',
    color VARCHAR(30) DEFAULT '',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Workers table
CREATE TABLE IF NOT EXISTS workers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) DEFAULT '',
    email VARCHAR(100) DEFAULT '',
    position VARCHAR(50) DEFAULT '',
    hire_date DATE DEFAULT (CURRENT_DATE),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Repair Jobs table
CREATE TABLE IF NOT EXISTS repair_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    worker_id INT DEFAULT NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'in_progress', 'completed', 'ready') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    estimated_hours DECIMAL(5,1) DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    completion_date DATE DEFAULT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL
);

-- Inventory Categories table
CREATE TABLE IF NOT EXISTS inventory_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id INT DEFAULT NULL,
    quantity INT DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'pieces',
    location VARCHAR(50) DEFAULT '',
    min_quantity INT DEFAULT 5,
    supplier VARCHAR(100) DEFAULT '',
    price DECIMAL(10,2) DEFAULT 0.00,
    vehicle_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES inventory_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

-- Inventory Movements table
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    type ENUM('addition', 'removal', 'used') NOT NULL,
    user_id INT DEFAULT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('income', 'expense') NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT DEFAULT '',
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'bank') DEFAULT 'cash',
    reference VARCHAR(50) DEFAULT '',
    client_id INT DEFAULT NULL,
    worker_id INT DEFAULT NULL,
    transaction_date DATE DEFAULT (CURRENT_DATE),
    notes TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL
);

-- Insert default admin user (password: password)
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@tristar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Operator User', 'operator@tristar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'operator');

-- Insert default inventory categories
INSERT INTO inventory_categories (name, description) VALUES
('Engine Parts', 'Engine components and accessories'),
('Body Parts', 'Body panels, bumpers, and exterior parts'),
('Fluids & Lubricants', 'Oil, coolant, brake fluid, and other fluids'),
('Electrical Components', 'Batteries, lights, wiring, and electrical parts'),
('Tools & Equipment', 'Hand tools, power tools, and shop equipment'),
('Tires & Wheels', 'Tires, rims, and wheel accessories'),
('Other', 'Miscellaneous items');

-- Insert sample clients
INSERT INTO clients (name, phone, email, address) VALUES
('John Smith', '555-0101', 'john@email.com', '123 Main St'),
('Maria Garcia', '555-0102', 'maria@email.com', '456 Oak Ave'),
('David Lee', '555-0103', 'david@email.com', '789 Pine Rd');

-- Insert sample vehicles
INSERT INTO vehicles (client_id, make, model, year, plate, vin, color, status) VALUES
(1, 'Toyota', 'Camry', 2020, 'ABC-123', '1HGBH41JXMN109186', 'Silver', 'active'),
(1, 'Honda', 'CR-V', 2019, 'XYZ-789', '2HGFC2F59KH123456', 'Blue', 'active'),
(2, 'Ford', 'F-150', 2021, 'DEF-456', '1FTEW1EP5MFA12345', 'Black', 'active'),
(3, 'BMW', 'X5', 2022, 'GHI-789', '5UXCR6C00M9A12345', 'White', 'inactive');

-- Insert sample workers
INSERT INTO workers (name, phone, email, position, hire_date) VALUES
('Mike Johnson', '555-0201', 'mike@tristar.com', 'Senior Mechanic', '2022-01-15'),
('Carlos Rivera', '555-0202', 'carlos@tristar.com', 'Mechanic', '2022-06-01'),
('Ahmed Hassan', '555-0203', 'ahmed@tristar.com', 'Apprentice', '2023-03-10');

-- Insert sample repair jobs
INSERT INTO repair_jobs (vehicle_id, worker_id, description, status, priority, estimated_hours, start_date) VALUES
(1, 1, 'Oil change and filter replacement', 'completed', 'low', 1.0, '2024-01-10'),
(2, 2, 'Brake pad replacement', 'in_progress', 'high', 2.5, '2024-01-12'),
(3, 1, 'Engine diagnostic and repair', 'pending', 'high', 4.0, NULL),
(1, 3, 'Tire rotation and alignment', 'ready', 'medium', 1.5, '2024-01-11');

-- Insert sample inventory
INSERT INTO inventory (name, category_id, quantity, unit, location, min_quantity, supplier, price) VALUES
('Engine Oil 5W-30', 3, 20, 'liters', 'Shelf A1', 10, 'Shell', 25.99),
('Brake Pads (Front)', 1, 8, 'sets', 'Shelf B2', 5, 'Brembo', 45.00),
('Air Filter', 1, 15, 'pieces', 'Shelf A3', 8, 'Bosch', 12.50),
('Battery 12V', 4, 6, 'pieces', 'Rack C1', 3, 'Varta', 89.99),
('Tire 225/65R17', 6, 12, 'pieces', 'Rack D1', 8, 'Michelin', 120.00);

-- Insert sample transactions
INSERT INTO transactions (type, category, description, amount, payment_method, reference, client_id, transaction_date) VALUES
('income', 'Service', 'Oil change service', 75.00, 'cash', 'INV-001', 1, CURDATE()),
('income', 'Parts', 'Brake pads sale', 120.00, 'bank', 'INV-002', 2, CURDATE()),
('expense', 'Salary', 'Monthly salary - Mike', 3500.00, 'bank', 'SAL-001', NULL, CURDATE()),
('expense', 'Parts', 'Oil filter purchase', 250.00, 'cash', 'PO-001', NULL, CURDATE());
