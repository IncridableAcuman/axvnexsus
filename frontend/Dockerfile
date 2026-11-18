# ==============================================================================
# AXM Nexus Frontend Multi-Stage Dockerfile (Non-root, Production Nginx)
# ==============================================================================

# 1-bosqich: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 2-bosqich: Nginx runtime (Non-root with NET_BIND_SERVICE capability)
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Prepare permissions and capabilities for non-root nginx execution on port 80
RUN apk add --no-cache libcap && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /usr/share/nginx/html /etc/nginx/conf.d && \
    setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx

COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost:80/healthz || exit 1

STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
