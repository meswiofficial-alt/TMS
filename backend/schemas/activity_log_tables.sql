-- Activity History / Audit Log Table
-- Tracks all system activities and user actions

CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    user_name VARCHAR(100),
    user_role ENUM('admin', 'operator', 'system') DEFAULT 'system',
    action_category ENUM('auth', 'client', 'vehicle', 'job', 'transaction', 'inventory', 'worker', 'invoice', 'report', 'whatsapp', 'system') NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_description TEXT,
    entity_type VARCHAR(50),
    entity_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_category (action_category),
    INDEX idx_created (created_at),
    INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Login History Table
CREATE TABLE IF NOT EXISTS user_login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_name VARCHAR(100),
    user_role ENUM('admin', 'operator') NOT NULL,
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_status ENUM('success', 'failed') DEFAULT 'success',
    failure_reason VARCHAR(255),
    session_duration INT DEFAULT 0,
    INDEX idx_user (user_id),
    INDEX idx_login (login_at),
    INDEX idx_status (login_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample activity data
INSERT INTO activity_log (user_id, user_name, user_role, action_category, action_type, action_description, entity_type, entity_id, created_at) VALUES
(1, 'Admin User', 'admin', 'auth', 'login', 'User logged in successfully', 'user', 1, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 'Admin User', 'admin', 'client', 'create', 'Created new client: Alice M.', 'client', 1, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(1, 'Admin User', 'admin', 'vehicle', 'create', 'Added vehicle Toyota Corolla for Alice M.', 'vehicle', 1, DATE_SUB(NOW(), INTERVAL 50 MINUTE)),
(1, 'Admin User', 'admin', 'job', 'create', 'Created repair job: Engine check and oil change', 'job', 1, DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
(1, 'Admin User', 'admin', 'transaction', 'create', 'Recorded income: KSh 2,400.00', 'transaction', 1, DATE_SUB(NOW(), INTERVAL 40 MINUTE)),
(1, 'Admin User', 'admin', 'invoice', 'create', 'Generated invoice INV-20260831-ABC1', 'invoice', 1, DATE_SUB(NOW(), INTERVAL 35 MINUTE)),
(1, 'Admin User', 'admin', 'whatsapp', 'send', 'Sent job_received notification to +254712345678', 'whatsapp', 1, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(2, 'Operator User', 'operator', 'auth', 'login', 'User logged in successfully', 'user', 2, DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
(2, 'Operator User', 'operator', 'job', 'update', 'Updated job #1 status to in_progress', 'job', 1, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(2, 'Operator User', 'operator', 'inventory', 'create', 'Added inventory item: Brake pads', 'inventory', 1, DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(1, 'Admin User', 'admin', 'worker', 'payment', 'Processed payment of KSh 7,000 to John W.', 'worker', 1, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(1, 'Admin User', 'admin', 'report', 'export', 'Exported clients report to Excel', 'report', NULL, DATE_SUB(NOW(), INTERVAL 5 MINUTE));

-- Insert sample login history
INSERT INTO user_login_history (user_id, user_name, user_role, login_at, ip_address, login_status) VALUES
(1, 'Admin User', 'admin', DATE_SUB(NOW(), INTERVAL 2 HOUR), '127.0.0.1', 'success'),
(2, 'Operator User', 'operator', DATE_SUB(NOW(), INTERVAL 25 MINUTE), '127.0.0.1', 'success'),
(1, 'Admin User', 'admin', DATE_SUB(NOW(), INTERVAL 1 DAY), '127.0.0.1', 'success'),
(2, 'Operator User', 'operator', DATE_SUB(NOW(), INTERVAL 1 DAY), '127.0.0.1', 'success'),
(1, 'Admin User', 'admin', DATE_SUB(NOW(), INTERVAL 2 DAY), '192.168.1.100', 'failed'),
(1, 'Admin User', 'admin', DATE_SUB(NOW(), INTERVAL 2 DAY), '127.0.0.1', 'success');
