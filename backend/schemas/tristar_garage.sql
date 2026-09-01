-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 31, 2026 at 11:11 AM
-- Server version: 10.4.24-MariaDB
-- PHP Version: 8.0.19

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tristar_garage`
--

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `name`, `phone`, `email`, `address`, `created_at`) VALUES
(1, 'Alice M.', '+1234567890', 'alice@email.com', NULL, '2026-08-28 10:01:59'),
(2, 'Bob S.', '+1234567891', 'bob@email.com', 'wayaki', '2026-08-28 10:01:59'),
(3, 'Carol D.', '+1234567892', 'carol@email.com', 'kilimani', '2026-08-28 10:01:59'),
(4, 'wekelome', '0987546', 'wekelome@gmail.com', 'kiliani', '2026-08-31 07:15:44');

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `quantity` int(11) DEFAULT 0,
  `unit` varchar(20) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `vehicle_id` int(11) DEFAULT NULL,
  `min_quantity` int(11) DEFAULT 5,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`id`, `name`, `category_id`, `quantity`, `unit`, `location`, `vehicle_id`, `min_quantity`, `created_at`) VALUES
(1, 'Brake pads', 2, 15, 'sets', 'Shelve A2', NULL, 5, '2026-08-28 10:01:59'),
(2, 'Engine oil 5W30', 3, 25, 'liters', 'Storage B1', NULL, 5, '2026-08-28 10:01:59'),
(3, 'Spark plugs', 1, 30, 'pieces', 'Shelve A3', NULL, 5, '2026-08-28 10:01:59');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_categories`
--

CREATE TABLE `inventory_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `inventory_categories`
--

INSERT INTO `inventory_categories` (`id`, `name`, `description`) VALUES
(1, 'Engine Parts', 'Engine components and parts'),
(2, 'Body Parts', 'Exterior body parts'),
(3, 'Fluids', 'Oils, coolants, and fluids'),
(4, 'Electrical', 'Electrical components'),
(5, 'Tools', 'Garage tools and equipment');

-- --------------------------------------------------------

--
-- Table structure for table `repair_jobs`
--

CREATE TABLE `repair_jobs` (
  `id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `worker_id` int(11) DEFAULT NULL,
  `description` text NOT NULL,
  `status` enum('pending','in_progress','completed','ready') DEFAULT 'pending',
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `estimated_hours` decimal(5,2) DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `completion_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `repair_jobs`
--

INSERT INTO `repair_jobs` (`id`, `vehicle_id`, `worker_id`, `description`, `status`, `priority`, `estimated_hours`, `start_date`, `completion_date`, `created_at`) VALUES
(1, 1, 1, 'Engine check and oil change', 'in_progress', 'high', NULL, NULL, NULL, '2026-08-28 10:01:59'),
(2, 2, 2, 'Brake pad replacement', 'completed', 'medium', NULL, NULL, NULL, '2026-08-28 10:01:59'),
(3, 3, 3, 'Electrical system diagnosis', 'pending', 'low', NULL, NULL, NULL, '2026-08-28 10:01:59');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `category` enum('client_payment','staff_salary','parts','maintenance','other') NOT NULL,
  `description` text DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','bank') DEFAULT 'cash',
  `reference` varchar(50) DEFAULT '',
  `client_id` int(11) DEFAULT NULL,
  `worker_id` int(11) DEFAULT NULL,
  `vehicle_id` int(11) DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `notes` text DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `type`, `category`, `description`, `amount`, `payment_method`, `reference`, `client_id`, `worker_id`, `vehicle_id`, `transaction_date`, `notes`, `created_at`) VALUES
(1, 'income', 'client_payment', 'Engine repair - Toyota Corolla', '240.00', 'cash', '', 1, NULL, NULL, '2026-08-28', '', '2026-08-28 10:01:59'),
(2, 'expense', 'staff_salary', 'Weekly salary - John W.', '180.00', 'cash', '', NULL, NULL, NULL, '2026-08-28', '', '2026-08-28 10:01:59'),
(3, 'expense', 'parts', 'Brake pads purchase', '620.00', 'cash', '', NULL, NULL, NULL, '2026-08-27', '', '2026-08-28 10:01:59'),
(4, 'income', '', 'exhaust', '10000.00', 'cash', '', NULL, NULL, NULL, '2026-08-31', '', '2026-08-31 08:32:00'),
(5, 'income', '', 'paintjob', '15000.00', 'cash', '', NULL, NULL, NULL, '2026-08-31', '', '2026-08-31 08:32:37');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','operator') DEFAULT 'operator',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `created_at`) VALUES
(1, 'Admin User', 'admin@tristar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '2026-08-28 10:01:59'),
(2, 'Operator User', 'operator@tristar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'operator', '2026-08-28 10:01:59');

-- --------------------------------------------------------

--
-- Table structure for table `user_activity_log`
--

CREATE TABLE `user_activity_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `table_name` varchar(50) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `make` varchar(50) NOT NULL,
  `model` varchar(50) NOT NULL,
  `year` year(4) DEFAULT NULL,
  `plate` varchar(20) NOT NULL,
  `vin` varchar(50) DEFAULT NULL,
  `color` varchar(30) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `vehicles`
--

INSERT INTO `vehicles` (`id`, `client_id`, `make`, `model`, `year`, `plate`, `vin`, `color`, `created_at`) VALUES
(1, 1, 'Toyota', 'Corolla', 2020, 'ABC-123', '1HGCM82633A123456', 'Silver', '2026-08-28 10:01:59'),
(2, 2, 'Honda', 'Civic', 2019, 'XYZ-789', '2HGCM82633A789012', 'Blue', '2026-08-28 10:01:59'),
(3, 3, 'Ford', 'Focus', 2021, 'DEF-456', '3HGCM82633A345678', 'Red', '2026-08-28 10:01:59');

-- --------------------------------------------------------

--
-- Table structure for table `workers`
--

CREATE TABLE `workers` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `position` varchar(50) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `workers`
--

INSERT INTO `workers` (`id`, `name`, `phone`, `email`, `position`, `hire_date`, `created_at`) VALUES
(1, 'John W.', '+1234567893', 'john@garage.com', 'Senior Mechanic', NULL, '2026-08-28 10:01:59'),
(2, 'Sarah K.', '+1234567894', 'sarah@garage.com', 'Mechanic', NULL, '2026-08-28 10:01:59'),
(3, 'Mike R.', '+1234567895', 'mike@garage.com', 'Apprentice', NULL, '2026-08-28 10:01:59'),
(4, 'John Mechanic', '+1234567890', 'john@tristar.com', 'Senior Mechanic', NULL, '2026-08-30 13:52:44');

-- --------------------------------------------------------

--
-- Table structure for table `worker_assignments`
--

CREATE TABLE `worker_assignments` (
  `id` int(11) NOT NULL,
  `worker_id` int(11) NOT NULL,
  `repair_job_id` int(11) NOT NULL,
  `assigned_date` datetime DEFAULT current_timestamp(),
  `hours_worked` decimal(5,2) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `vehicle_id` (`vehicle_id`);

--
-- Indexes for table `inventory_categories`
--
ALTER TABLE `inventory_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `repair_jobs`
--
ALTER TABLE `repair_jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vehicle_id` (`vehicle_id`),
  ADD KEY `worker_id` (`worker_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `worker_id` (`worker_id`),
  ADD KEY `vehicle_id` (`vehicle_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_activity_log`
--
ALTER TABLE `user_activity_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `plate` (`plate`),
  ADD KEY `client_id` (`client_id`);

--
-- Indexes for table `workers`
--
ALTER TABLE `workers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `worker_assignments`
--
ALTER TABLE `worker_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `worker_id` (`worker_id`),
  ADD KEY `repair_job_id` (`repair_job_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `inventory_categories`
--
ALTER TABLE `inventory_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `repair_jobs`
--
ALTER TABLE `repair_jobs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_activity_log`
--
ALTER TABLE `user_activity_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `workers`
--
ALTER TABLE `workers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `worker_assignments`
--
ALTER TABLE `worker_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `inventory`
--
ALTER TABLE `inventory`
  ADD CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `inventory_categories` (`id`),
  ADD CONSTRAINT `inventory_ibfk_2` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `repair_jobs`
--
ALTER TABLE `repair_jobs`
  ADD CONSTRAINT `repair_jobs_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `repair_jobs_ibfk_2` FOREIGN KEY (`worker_id`) REFERENCES `workers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`worker_id`) REFERENCES `workers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `transactions_ibfk_3` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_activity_log`
--
ALTER TABLE `user_activity_log`
  ADD CONSTRAINT `user_activity_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `worker_assignments`
--
ALTER TABLE `worker_assignments`
  ADD CONSTRAINT `worker_assignments_ibfk_1` FOREIGN KEY (`worker_id`) REFERENCES `workers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `worker_assignments_ibfk_2` FOREIGN KEY (`repair_job_id`) REFERENCES `repair_jobs` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
