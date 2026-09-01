FROM php:8.2-apache

ENV DEBIAN_FRONTEND=noninteractive
ENV APACHE_RUN_USER=www-data \
    APACHE_RUN_GROUP=www-data \
    APACHE_PID_FILE=/var/run/apache2/apache2.pid \
    APACHE_RUN_DIR=/var/run/apache2

# Step 1: Install build dependencies and compile PHP extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libcurl4-openssl-dev \
    default-libmysqlclient-dev \
    libonig-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        gd \
        pdo_mysql \
        mysqli \
        mbstring \
        zip \
        bcmath \
        curl \
    && docker-php-ext-enable gd pdo_mysql mysqli mbstring zip bcmath curl \
    && a2enmod rewrite headers expires \
    && rm -rf /var/lib/apt/lists/*

# Step 2: Install runtime packages (separate layer for cache efficiency)
RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    default-mysql-client \
    cron \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy frontend files to DocumentRoot
COPY frontend/ /var/www/html/

# Copy backend PHP files
COPY backend/ /var/www/html/backend/

COPY docker/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

# Clean up Docker-specific files and set permissions
RUN rm -f /var/www/html/docker-compose.yml \
    && rm -rf /var/www/html/.git /var/www/html/.kilo \
    && find /var/www/html -type d -exec chmod 755 {} \; \
    && find /var/www/html -type f -exec chmod 644 {} \; \
    && chmod -R 775 /var/www/html/backend/api/ /var/www/html/backend/invoices/ \
        /var/www/html/backend/reports/ /var/www/html/backend/cron/ \
    && chown -R www-data:www-data /var/www/html

EXPOSE 80

ENV PORT=80

STOPSIGNAL SIGTERM

ENTRYPOINT ["entrypoint"]
CMD ["apache2-foreground"]
