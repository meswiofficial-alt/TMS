<?php
// backend/cron/process_whatsapp_queue.php
// Process queued WhatsApp messages
// Run every minute: * * * * * php /var/www/html/backend/cron/process_whatsapp_queue.php

// Prevent concurrent execution
$lockFile = __DIR__ . '/whatsapp_queue.lock';
$maxRuntime = 55; // Max 55 seconds to prevent overlap

if (file_exists($lockFile)) {
    $lockTime = filemtime($lockFile);
    if ((time() - $lockTime) < $maxRuntime) {
        exit("Another instance is running\n");
    }
    // Lock is stale, remove it
    unlink($lockFile);
}

touch($lockFile);

// Set error handling
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/whatsapp_errors.log');

try {
    require_once __DIR__ . '/../services/WhatsAppService.php';
    
    $whatsapp = new WhatsAppService();
    $results = $whatsapp->processQueue(50);
    
    $logMessage = sprintf(
        "[%s] Processed: %d | Sent: %d | Failed: %d\n",
        date('Y-m-d H:i:s'),
        $results['processed'],
        $results['sent'],
        $results['failed']
    );
    
    // Log to file
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    file_put_contents($logDir . '/whatsapp_queue.log', $logMessage, FILE_APPEND);
    
    // Output for cron email/logging
    echo $logMessage;
    
} catch (Exception $e) {
    $errorMsg = "[" . date('Y-m-d H:i:s') . "] Error: " . $e->getMessage() . "\n";
    error_log($errorMsg);
    echo $errorMsg;
} finally {
    if (file_exists($lockFile)) {
        unlink($lockFile);
    }
}
