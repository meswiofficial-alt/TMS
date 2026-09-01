<?php
// api/invoices.php - Invoice Management
require_once '../config/cors.php';
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'create':
            createInvoice($conn, $input);
            break;
        case 'generate_pdf':
            generateInvoicePDF($conn, $input['invoice_id'] ?? 0);
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} elseif ($method === 'GET') {
    $action = $_GET['action'] ?? 'list';
    
    switch ($action) {
        case 'list':
            listInvoices($conn);
            break;
        case 'get':
            getInvoice($conn, $_GET['id'] ?? 0);
            break;
        case 'download':
            downloadInvoice($conn, $_GET['id'] ?? 0);
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
}

/**
 * Download invoice as PDF/HTML
 */
function downloadInvoice($conn, $id) {
    $stmt = $conn->prepare("
        SELECT i.*, c.name as client_name, c.phone as client_phone, c.email as client_email
        FROM invoices i 
        LEFT JOIN clients c ON i.client_id = c.id 
        WHERE i.id = ?
    ");
    $stmt->execute([$id]);
    $invoice = $stmt->fetch();
    
    if (!$invoice) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Invoice not found']);
        return;
    }
    
    $stmt = $conn->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
    $stmt->execute([$id]);
    $items = $stmt->fetchAll();
    
    $outputDir = __DIR__ . '/../invoices/';
    if (!is_dir($outputDir)) {
        mkdir($outputDir, 0755, true);
    }
    
    $filename = $invoice['invoice_number'];
    $filePath = $outputDir . $filename . '.html';
    
    // Generate HTML invoice
    $html = generateInvoiceHTML($invoice, $items);
    
    // Save to file system for storage
    file_put_contents($filePath, $html);
    
    // Output for download
    header('Content-Type: application/html');
    header('Content-Disposition: attachment; filename="' . $filename . '.html"');
    header('Cache-Control: no-cache, must-revalidate');
    echo $html;
    exit;
}

/**
 * Generate invoice HTML
 */
function generateInvoiceHTML($invoice, $items) {
    $html = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice - ' . htmlspecialchars($invoice['invoice_number']) . '</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #1a2332; padding-bottom: 20px; }
        .company { font-size: 28px; font-weight: bold; color: #1a2332; }
        .company-sub { color: #666; font-size: 14px; }
        .invoice-details { text-align: right; }
        .invoice-number { font-size: 20px; font-weight: bold; color: #fbbf24; }
        .client-info { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #1a2332; }
        .client-info strong { color: #1a2332; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #1a2332; color: white; }
        tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: #e9ecef !important; }
        .grand-total { font-size: 18px; font-weight: bold; color: #1a2332; background: #fff3cd !important; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; }
        @media print { body { margin: 0; } .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="company">TRISTAR GARAGE</div>
            <div class="company-sub">Vehicle Service & Repair<br>Tel: +254 700 000 000<br>Nairobi, Kenya</div>
        </div>
        <div class="invoice-details">
            <div class="invoice-number">' . htmlspecialchars($invoice['invoice_number']) . '</div>
            <div>Date: ' . date('d M Y', strtotime($invoice['issue_date'])) . '</div>
            <div>Due: ' . date('d M Y', strtotime($invoice['due_date'])) . '</div>
        </div>
    </div>';
    
    $html .= '<div class="client-info">
        <strong>BILL TO:</strong><br>
        ' . htmlspecialchars($invoice['client_name']) . '<br>
        ' . htmlspecialchars($invoice['client_phone'] ?? 'N/A') . '<br>
        ' . htmlspecialchars($invoice['client_email'] ?? 'N/A') . '
    </div>';
    
    $html .= '<table>
        <thead>
            <tr>
                <th>#</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>';
    
    $i = 1;
    foreach ($items as $item) {
        $html .= '<tr>
            <td>' . $i++ . '</td>
            <td>' . htmlspecialchars($item['description']) . '</td>
            <td>' . $item['quantity'] . '</td>
            <td>KSh ' . number_format($item['unit_price'], 2) . '</td>
            <td>KSh ' . number_format($item['total_price'], 2) . '</td>
        </tr>';
    }
    
    $html .= '<tr class="total-row"><td colspan="4" style="text-align:right">Subtotal</td><td>KSh ' . number_format($invoice['subtotal'], 2) . '</td></tr>';
    $html .= '<tr class="total-row"><td colspan="4" style="text-align:right">Tax (' . $invoice['tax_rate'] . '%)</td><td>KSh ' . number_format($invoice['tax_amount'], 2) . '</td></tr>';
    $html .= '<tr class="grand-total"><td colspan="4" style="text-align:right">TOTAL</td><td>KSh ' . number_format($invoice['total_amount'], 2) . '</td></tr>';
    $html .= '</tbody></table>';
    
    if ($invoice['notes']) {
        $html .= '<p><strong>Notes:</strong> ' . htmlspecialchars($invoice['notes']) . '</p>';
    }
    
    $html .= '<div class="footer">
        <p>Thank you for choosing Tristar Garage!</p>
        <p>Payment due within 30 days. M-Pesa Paybill: 123456</p>
        <p><em>This is a computer generated invoice.</em></p>
    </div>
    <div class="no-print" style="margin-top:20px;text-align:center;">
        <button onclick="window.print()" style="padding:10px 20px;background:#1a2332;color:white;border:none;border-radius:5px;cursor:pointer;">
            Print Invoice
        </button>
    </div>
</body></html>';
    
    return $html;
}

function createInvoice($conn, $input) {
    $clientId = $input['client_id'] ?? 0;
    $items = $input['items'] ?? [];
    $taxRate = floatval($input['tax_rate'] ?? 0);
    $notes = $input['notes'] ?? '';
    $createdBy = $input['created_by'] ?? 1;
    
    if (!$clientId || empty($items)) {
        echo json_encode(['success' => false, 'error' => 'Client and items required']);
        return;
    }
    
    $subtotal = 0;
    foreach ($items as $item) {
        $subtotal += $item['quantity'] * $item['unit_price'];
    }
    
    $taxAmount = $subtotal * ($taxRate / 100);
    $totalAmount = $subtotal + $taxAmount;
    
    $invoiceNumber = 'INV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
    
    $stmt = $conn->prepare("
        INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, subtotal, tax_rate, tax_amount, total_amount, notes, created_by)
        VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$invoiceNumber, $clientId, $subtotal, $taxRate, $taxAmount, $totalAmount, $notes, $createdBy]);
    
    $invoiceId = $conn->lastInsertId();
    
    $stmt = $conn->prepare("INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)");
    foreach ($items as $item) {
        $stmt->execute([
            $invoiceId,
            $item['description'],
            $item['quantity'],
            $item['unit_price'],
            $item['quantity'] * $item['unit_price']
        ]);
    }
    
    echo json_encode([
        'success' => true,
        'invoice_id' => $invoiceId,
        'invoice_number' => $invoiceNumber,
        'download_url' => '/backend/api/invoices.php?action=download&id=' . $invoiceId
    ]);
}

function listInvoices($conn) {
    $stmt = $conn->query("
        SELECT i.*, c.name as client_name 
        FROM invoices i 
        LEFT JOIN clients c ON i.client_id = c.id 
        ORDER BY i.created_at DESC
    ");
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}

function getInvoice($conn, $id) {
    $stmt = $conn->prepare("
        SELECT i.*, c.name as client_name, c.phone as client_phone, c.email as client_email
        FROM invoices i 
        LEFT JOIN clients c ON i.client_id = c.id 
        WHERE i.id = ?
    ");
    $stmt->execute([$id]);
    $invoice = $stmt->fetch();
    
    if (!$invoice) {
        echo json_encode(['success' => false, 'error' => 'Invoice not found']);
        return;
    }
    
    $stmt = $conn->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
    $stmt->execute([$id]);
    $invoice['items'] = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'data' => $invoice]);
}

function generateInvoicePDF($conn, $invoiceId) {
    $stmt = $conn->prepare("
        SELECT i.*, c.name as client_name, c.phone as client_phone, c.email as client_email
        FROM invoices i 
        LEFT JOIN clients c ON i.client_id = c.id 
        WHERE i.id = ?
    ");
    $stmt->execute([$invoiceId]);
    $invoice = $stmt->fetch();
    
    if (!$invoice) {
        echo json_encode(['success' => false, 'error' => 'Invoice not found']);
        return;
    }
    
    $stmt = $conn->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
    $stmt->execute([$invoiceId]);
    $items = $stmt->fetchAll();
    
    $outputDir = __DIR__ . '/../invoices/';
    if (!is_dir($outputDir)) {
        mkdir($outputDir, 0755, true);
    }
    
    $filename = $invoice['invoice_number'];
    $filePath = $outputDir . $filename . '.html';
    
    // Generate and save HTML invoice
    $html = generateInvoiceHTML($invoice, $items);
    file_put_contents($filePath, $html);
    
    echo json_encode([
        'success' => true,
        'download_url' => '/backend/api/invoices.php?action=download&id=' . $invoiceId,
        'file_path' => $filename . '.html'
    ]);
}
