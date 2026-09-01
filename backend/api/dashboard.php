<?php
// api/dashboard.php - Dashboard summary stats
require_once '../config/database.php';

$conn = getDBConnection();
$stats = [];

// Total clients
$stmt = $conn->query("SELECT COUNT(*) as count FROM clients");
$stats['clients'] = $stmt->fetch()['count'];

// Total vehicles
$stmt = $conn->query("SELECT COUNT(*) as count FROM vehicles");
$stats['vehicles'] = $stmt->fetch()['count'];

// Active vehicles (all vehicles since no status column)
$stmt = $conn->query("SELECT COUNT(*) as count FROM vehicles");
$stats['active_vehicles'] = $stmt->fetch()['count'];

// Daily revenue
$stmt = $conn->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE DATE(transaction_date) = CURDATE() AND type = 'income'");
$stmt->execute();
$stats['daily_income'] = $stmt->fetch()['total'];

// Daily expenses
$stmt = $conn->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE DATE(transaction_date) = CURDATE() AND type = 'expense'");
$stmt->execute();
$stats['daily_expense'] = $stmt->fetch()['total'];

// Inventory count
$stmt = $conn->query("SELECT COUNT(*) as count FROM inventory");
$stats['inventory'] = $stmt->fetch()['count'];

// Low stock items
$stmt = $conn->query("SELECT COUNT(*) as count FROM inventory WHERE quantity <= min_quantity");
$stats['low_stock'] = $stmt->fetch()['count'];

// Pending jobs
$stmt = $conn->query("SELECT COUNT(*) as count FROM repair_jobs WHERE status = 'pending'");
$stats['pending_jobs'] = $stmt->fetch()['count'];

// Active jobs
$stmt = $conn->query("SELECT COUNT(*) as count FROM repair_jobs WHERE status = 'in_progress'");
$stats['active_jobs'] = $stmt->fetch()['count'];

// Total workers
$stmt = $conn->query("SELECT COUNT(*) as count FROM workers");
$stats['workers'] = $stmt->fetch()['count'];

// Monthly income
$stmt = $conn->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND MONTH(transaction_date) = MONTH(CURDATE()) AND YEAR(transaction_date) = YEAR(CURDATE())");
$stmt->execute();
$stats['monthly_income'] = $stmt->fetch()['total'];

// Monthly expenses
$stmt = $conn->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND MONTH(transaction_date) = MONTH(CURDATE()) AND YEAR(transaction_date) = YEAR(CURDATE())");
$stmt->execute();
$stats['monthly_expense'] = $stmt->fetch()['total'];

$stats['revenue'] = $stats['daily_income'];

echo json_encode(['success' => true, 'data' => $stats]);
