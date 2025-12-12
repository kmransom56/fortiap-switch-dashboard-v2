# Multi-stage build for Unified FortiAP/Switch Dashboard
FROM node:18-slim AS node-builder

# Install Python for discovery service
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package-unified.json package.json
COPY shared/ ./shared/

# Install Node.js dependencies
RUN npm ci --only=production

# Copy Python requirements
COPY babylon_3d/requirements.txt ./babylon_3d/
RUN pip3 install -r babylon_3d/requirements.txt --break-system-packages

# Copy application code
COPY . .

# Create non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /bin/sh -m nodejs

# Set permissions
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose ports
EXPOSE 13000 13001 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:13001/health || exit 1

# Start command
CMD ["npm", "run", "combined"]
