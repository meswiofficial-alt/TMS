<?php
// fix_transactions_table.php
// Run this file once to fix the transactions table schema
// Access via browser: http://localhost/tristar-system/backend/api/fix_transactions_table.php
// DELETE THIS FILE AFTER RUNNING!

require_once '../config/database.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Fix Transactions Table</title>
    <style>
        body { font-family: monospace; background: #1a1a2e; color: #eee; padding: 20px; }
        .ok { color: #4ade80; }
        .err { color: #f87171; }
        .info { color: #60a5fa; }
        h2 { color: #fbbf24; }
        .warning { background: #f97316; color: #000; padding: 10px; border-radius: 4px; margin-top: 20px; }
    </style>
</head>
<body>
<h2>Transactions Table Fix</h2>
<pre>
<?php
$conn = getDBConnection();

// Get existing columns
$existing = [];
$result = $conn->query("SHOW COLUMNS FROM transactions");
while ($row = $result->fetch()) {
    $existing[] = $row['Field'];
}

echo "Existing columns: " . implode(', ', $existing) . "\n\n";

$columnsToAdd = [
    'payment_method' => "ENUM('cash', 'bank') DEFAULT 'cash'",
    'reference' => "VARCHAR(50) DEFAULT ''",
    'client_id' => "INT DEFAULT NULL",
    'worker_id' => "INT DEFAULT NULL",
    'transaction_date' => "DATE DEFAULT (CURRENT_DATE)",
    'notes' => "TEXT DEFAULT ''"
];

$added = 0;
$skipped = 0;

foreach ($columnsToAdd as $column => $definition) {
    if (in_array($column, $existing)) {
        echo "<span class='info'>⊘ Skipped '$column' (already exists)</span>\n";
        $skipped++;
    } else {
        try {
            $conn->exec("ALTER TABLE transactions ADD COLUMN $column $definition");
            echo "<span class='ok'>✓ Added '$column'</span>\n";
            $added++;
        } catch (PDOException $e) {
            echo "<span class='err'>✗ Failed to add '$column': " . $e->getMessage() . "</span>\n";
        }
    }
}

echo "\n";
echo "Summary: $added added, $skipped already existed\n";

// Verify final structure
echo "\n<span class='info'>Final table structure:</span>\n";
$result = $conn->query("DESCRIBE transactions");
while ($row = $result->fetch()) {
    echo "  - {$row['Field']}: {$row['Type']}\n";
}
?>

</pre>
<div class="warning">
    <strong>IMPORTANT:</strong> Delete this file after running:<br>
    <code>backend/api/fix_transactions_table.php</code>
</div>
</body>
</html>
