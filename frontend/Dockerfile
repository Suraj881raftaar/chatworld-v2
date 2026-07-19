# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /build

# Copy dependencies manifest
COPY package*.json ./

# Install npm packages
RUN npm ci --legacy-peer-deps

# Copy frontend source code
COPY . .

# Compile TypeScript and build static production assets
RUN npm run build

# --- Production Serve Stage ---
FROM nginx:1.25-alpine

# Copy nginx config for client routes routing
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

# Copy static builds from builder stage
COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
