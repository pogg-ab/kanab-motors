# ----------------------------------------------------
# KANAB Motors Frontend Dockerfile (Vite + React + Nginx)
# ----------------------------------------------------

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# In production behind Nginx reverse proxy, API requests go to /api
ENV VITE_API_BASE_URL=/api

RUN npm run build

# Stage 2: Serve
FROM nginx:1.25-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
