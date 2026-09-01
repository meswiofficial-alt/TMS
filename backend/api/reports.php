<?php
// api/reports.php - Report Generation
require_once '../config/cors.php';
require_once '../config/database.php';

// Set error handling to return JSON instead of HTML
set_exception_handler(function($e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
    exit;
});

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
        exit;
    }
    
    $section = $input['section'] ?? 'all';
    $format = $input['format'] ?? 'xlsx';
    $dateFrom = $input['date_from'] ?? null;
    $dateTo = $input['date_to'] ?? null;
    
    if (!in_array($format, ['xlsx', 'pdf', 'docx'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid format']);
        exit;
    }
    
    try {
        $data = fetchReportData($conn, $section, $dateFrom, $dateTo);
        
        $filename = 'report_' . $section . '_' . date('Ymd_His');
        $outputDir = __DIR__ . '/../reports/';
        
        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }
        
        $filePath = $outputDir . $filename;
        
        switch ($format) {
            case 'xlsx':
                generateExcel($data, $filePath . '.xlsx', $section);
                $downloadUrl = '/backend/reports/' . $filename . '.xlsx';
                break;
            case 'pdf':
                generatePDF($data, $filePath . '.pdf', $section);
                $downloadUrl = '/backend/reports/' . $filename . '.pdf';
                break;
            case 'docx':
                generateWord($data, $filePath . '.docx', $section);
                $downloadUrl = '/backend/reports/' . $filename . '.docx';
                break;
        }
        
        echo json_encode(['success' => true, 'download_url' => $downloadUrl]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Report generation failed: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

function fetchReportData($conn, $section, $dateFrom, $dateTo) {
    $data = [];
    
    if ($section === 'all' || $section === 'clients') {
        $stmt = $conn->query("SELECT id, name, phone, email, created_at FROM clients ORDER BY name");
        $data['clients'] = $stmt->fetchAll();
    }
    
    if ($section === 'all' || $section === 'vehicles') {
        $stmt = $conn->query("
            SELECT v.*, c.name as client_name 
            FROM vehicles v 
            LEFT JOIN clients c ON v.client_id = c.id 
            ORDER BY v.created_at DESC
        ");
        $data['vehicles'] = $stmt->fetchAll();
    }
    
    if ($section === 'all' || $section === 'transactions') {
        $sql = "SELECT * FROM transactions WHERE 1=1";
        $params = [];
        if ($dateFrom) { $sql .= " AND transaction_date >= ?"; $params[] = $dateFrom; }
        if ($dateTo) { $sql .= " AND transaction_date <= ?"; $params[] = $dateTo; }
        $sql .= " ORDER BY transaction_date DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $data['transactions'] = $stmt->fetchAll();
    }
    
    if ($section === 'all' || $section === 'inventory') {
        $stmt = $conn->query("SELECT * FROM inventory ORDER BY name");
        $data['inventory'] = $stmt->fetchAll();
    }
    
    if ($section === 'all' || $section === 'workers') {
        $stmt = $conn->query("SELECT * FROM workers ORDER BY name");
        $data['workers'] = $stmt->fetchAll();
    }
    
    if ($section === 'all' || $section === 'repair_jobs') {
        $stmt = $conn->query("
            SELECT rj.*, w.name as worker_name, v.make, v.model, v.plate 
            FROM repair_jobs rj 
            LEFT JOIN workers w ON rj.worker_id = w.id 
            LEFT JOIN vehicles v ON rj.vehicle_id = v.id 
            ORDER BY rj.created_at DESC
        ");
        $data['repair_jobs'] = $stmt->fetchAll();
    }
    
    return $data;
}

function generateExcel($data, $filePath, $section) {
    // Generate proper CSV with BOM for Excel compatibility
    $output = '';
    
    // Add UTF-8 BOM for Excel to recognize encoding
    $output .= "\xEF\xBB\xBF";
    
    foreach ($data as $tableName => $rows) {
        // Add sheet name as header
        $output .= "=== " . ucfirst($tableName) . " ===\n";
        
        if (!empty($rows)) {
            // Get headers from first row
            $headers = array_keys($rows[0]);
            $output .= implode("\t", $headers) . "\n";
            
            // Add data rows using tab separation (better Excel compatibility)
            foreach ($rows as $row) {
                $line = '';
                $i = 0;
                foreach ($row as $value) {
                    if ($i > 0) $line .= "\t";
                    // Escape values and wrap in quotes if contains special chars
                    $cellValue = str_replace(["\r\n", "\r", "\t", '"'], [' ', ' ', ' ', '""'], $value ?? '');
                    $line .= '"' . $cellValue . '"';
                    $i++;
                }
                $output .= $line . "\n";
            }
        }
        $output .= "\n\n";
    }
    
    file_put_contents($filePath, $output);
}

function generatePDF($data, $filePath, $section) {
    // Simple HTML to PDF using TCPDF or Dompdf fallback
    $html = '<html><head><style>
        body { font-family: Arial, sans-serif; font-size: 10pt; }
        h1 { font-size: 16pt; color: #1a2332; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 9pt; }
        th { background: #1a2332; color: white; }
    </style></head><body>';
    $html .= '<h1>Tristar Garage Report - ' . ucfirst($section) . '</h1>';
    $html .= '<p>Generated: ' . date('Y-m-d H:i:s') . '</p>';
    
    foreach ($data as $tableName => $rows) {
        $html .= '<h2>' . ucfirst($tableName) . '</h2>';
        if (empty($rows)) {
            $html .= '<p>No data</p>';
            continue;
        }
        $html .= '<table><thead><tr>';
        foreach (array_keys($rows[0]) as $header) {
            $html .= '<th>' . htmlspecialchars($header) . '</th>';
        }
        $html .= '</tr></thead><tbody>';
        foreach ($rows as $row) {
            $html .= '<tr>';
            foreach ($row as $cell) {
                $html .= '<td>' . htmlspecialchars($cell ?? '') . '</td>';
            }
            $html .= '</tr>';
        }
        $html .= '</tbody></table>';
    }
    
    $html .= '</body></html>';
    
    if (class_exists('Dompdf\Dompdf')) {
        $dompdf = new \Dompdf\Dompdf();
        $dompdf->loadHtml($html);
        $dompdf->render();
        file_put_contents($filePath, $dompdf->output());
    } else {
        file_put_contents($filePath . '.html', $html);
        rename($filePath . '.html', $filePath);
    }
}

function generateWord($data, $filePath, $section) {
    $html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Tristar Garage Report</title>
    <style>
        body { font-family: Arial, sans-serif; }
        h1 { color: #1a2332; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 5px; }
        th { background: #1a2332; color: white; }
    </style></head><body>';
    $html .= '<h1>Tristar Garage Report - ' . ucfirst($section) . '</h1>';
    
    foreach ($data as $tableName => $rows) {
        $html .= '<h2>' . ucfirst($tableName) . '</h2>';
        if (empty($rows)) {
            $html .= '<p>No data</p>';
            continue;
        }
        $html .= '<table><tr>';
        foreach (array_keys($rows[0]) as $header) {
            $html .= '<th>' . htmlspecialchars($header) . '</th>';
        }
        $html .= '</tr>';
        foreach ($rows as $row) {
            $html .= '<tr>';
            foreach ($row as $cell) {
                $html .= '<td>' . htmlspecialchars($cell ?? '') . '</td>';
            }
            $html .= '</tr>';
        }
        $html .= '</table><br>';
    }
    
    $html .= '</body></html>';
    file_put_contents($filePath, $html);
}
