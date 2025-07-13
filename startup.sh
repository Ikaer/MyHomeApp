#!/bin/sh

# MyHomeApp startup script
echo "Starting MyHomeApp initialization..."

# Create directories if they don't exist
mkdir -p /app/data /app/config /app/logs

# Set proper permissions
chown -R 1001:1001 /app/data /app/config /app/logs
chmod -R 755 /app/data /app/config /app/logs

echo "Directory initialization complete"

# Start the Next.js application
exec node server.js
