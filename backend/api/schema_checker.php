<?php
// schema_checker.php
// Run this to see your actual database schema
// Place in backend/api/ and access via browser, then DELETE

require_once '../config/database.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Database Schema Checker</title>
    <style>
        body { font-family: monospace; background: #1a1a2e; color: #eee; padding: 20px; }
        h2 { color: #fbbf24; margin-top: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; background: #16213e; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background: #0f3460; color: #fbbf24; }
        .missing { color: #f87171; }
        .exists { color: #4ade80; }
    </style>
</head>
<body>
<h1>Tristar Garage Database Schema</h1>
<?php
$conn = getDBConnection();

// Get all tables
$tables = ['users', 'clients', 'vehicles', 'workers', 'repair_jobs', 'inventory_categories', 'inventory', 'inventory_movements', 'transactions'];

echo "<h2>Tables in Database</h2>";
$result = $conn->query("SHOW TABLES");
$existingTables = [];
while ($row = $result->fetch()) {
    $existingTables[] = $row[0];
    echo "<span class='exists'>✓ " . $row[0] . "</span><br>";
}

echo "<h2>Table Structures</h2>";

// Expected columns for each table
$expectedColumns = [
    'users' => ['id', 'name', 'email', 'password', 'role', 'created_at'],
    'clients' => ['id', 'name', 'phone', 'email', 'address', 'registration_date', 'created_at', 'updated_at'],
    'vehicles' => ['id', 'client_id', 'make', 'model', 'year', 'plate', 'vin', 'color', 'status', 'created_at'],
    'workers' => ['id', 'name', 'phone', 'email', 'position', 'hire_date', 'status', 'created_at'],
    'repair_jobs' => ['id', 'vehicle_id', 'worker_id', 'description', 'status', 'priority', 'estimated_hours', 'start_date', 'completion_date', 'notes', 'created_at', 'updated_at'],
    'inventory_categories' => ['id', 'name', 'description', 'created_at'],
    'inventory' => ['id', 'name', 'category_id', 'quantity', 'unit', 'location', 'min_quantity', 'supplier', 'price', 'vehicle_id', 'created_at', 'updated_at'],
    'inventory_movements' => ['id', 'item_id', 'quantity', 'type', 'user_id', 'notes', 'created_at'],
    'transactions' => ['id', 'type', 'category', 'description', 'amount', 'payment_method', 'reference', 'client_id', 'worker_id', 'transaction_date', 'notes', 'created_at']
];

foreach ($expectedColumns as $table => $expectedCols) {
    echo "<h3>$table</h3>";
    
    if (!in_array($table, $existingTables)) {
        echo "<p class='missing'>✗ Table does not exist!</p>";
        continue;
    }
    
    // Get actual columns
    $result = $conn->query("DESCRIBE $table");
    $actualCols = [];
    while ($row = $result->fetch()) {
        $actualCols[] = $row['Field'];
    }
    
    echo "<table>";
    echo "<tr><th>Column</th><th>Type</th><th>Status</th></tr>";
    
    foreach ($expectedCols as $col) {
        $status = in_array($col, $actualCols) ? 
            "<span class='exists'>✓ Exists</span>" : 
            "<span class='missing'>✗ Missing</span>";
        echo "<tr><td>$col</td><td>-</td><td>$status</td></tr>";
    }
    
    // Show extra columns not in expected
    $extraCols = array_diff($actualCols, $expectedCols);
    foreach ($extraCols as $col) {
        echo "<tr><td>$col</td><td>-</td><td style='color:#60a5fa;'>? Extra</td></tr>";
    }
    
    echo "</table>";
}

// Show sample data counts
echo "<h2>Data Counts</h2>";
foreach ($existingTables as $table) {
    $count = $conn->query("SELECT COUNT(*) FROM $table")->fetchColumn();
    echo "$table: $count records<br>";
}
?>

<p style="margin-top:20px; color:#f97316;">
    <strong>DELETE THIS FILE AFTER VIEWING!</strong>
</p>
</body>
</html>
