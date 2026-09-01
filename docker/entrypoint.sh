#!/bin/bash
set -e

# Use PORT env var (Render sets this); default to 80
LISTEN_PORT="${PORT:-80}"

# Configure Apache to listen on the correct port
sed -i "s/Listen 80/Listen ${LISTEN_PORT}/" /etc/apache2/ports.conf
sed -i "s/VirtualHost \*:80/VirtualHost *:${LISTEN_PORT}/" /etc/apache2/sites-available/000-default.conf
sed -i "s/\(ServerName\).*/\1 localhost/" /etc/apache2/sites-available/000-default.conf
sed -i "s/\${VIRTUAL_HOST}/localhost/g" /etc/apache2/sites-available/000-default.conf

# Wait for MySQL if DB_HOST is set and not localhost
if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
    echo "Waiting for MySQL at ${DB_HOST}:${DB_PORT:-3306}..."
    for i in $(seq 1 30); do
        if nc -z "$DB_HOST" "${DB_PORT:-3306}" 2>/dev/null; then
            echo "MySQL is available!"
            break
        fi
        echo "Waiting... ($i/30)"
        sleep 2
    done
fi

# Run database migrations if schema file exists and DB is accessible
if [ -f "/var/www/html/backend/schemas/database.sql" ] && [ -n "$DB_HOST" ]; then
    echo "Loading database schema..."
    MYSQL_PWD="${DB_PASS:-}" mysql -h"${DB_HOST}" -P"${DB_PORT:-3306}" -u"${DB_USER:-root}" "${DB_NAME:-tristar_garage}" < /var/www/html/backend/schemas/database.sql 2>/dev/null || echo "Could not load schema (DB may not be ready). Will retry on next restart."
fi

# Ensure writable directories
mkdir -p /var/www/html/backend/invoices /var/www/html/backend/reports /var/www/html/backend/api
chown -R www-data:www-data /var/www/html/backend/invoices /var/www/html/backend/reports /var/www/html/backend/api

echo "Starting Apache on port ${LISTEN_PORT}..."

# Generate crontab with environment variables for cron jobs
cat > /etc/cron.d/tms-cron << CRONEOF
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-tristar_garage}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-}
WHATSAPP_PHONE_ID=${WHATSAPP_PHONE_ID:-demo}
WHATSAPP_ACCESS_TOKEN=${WHATSAPP_ACCESS_TOKEN:-demo_token}
WHATSAPP_WEBHOOK_TOKEN=${WHATSAPP_WEBHOOK_TOKEN:-tristar_webhook_2024}

* * * * * www-data php /var/www/html/backend/cron/process_whatsapp_queue.php >/dev/null 2>&1
0 9 * * * www-data php /var/www/html/backend/cron/send_appointment_reminders.php >/dev/null 2>&1
0 10 * * * www-data php /var/www/html/backend/cron/send_followups.php >/dev/null 2>&1
CRONEOF
chmod 0644 /etc/cron.d/tms-cron
crontab /etc/cron.d/tms-cron

# Start cron daemon for background tasks
service cron start 2>/dev/null || echo "Cron not available, skipping..."

exec "$@"
