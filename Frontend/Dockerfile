# Stage 1: Build Vue app
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve bằng Nginx
FROM nginx:alpine
# Copy file build từ Stage 1 sang thư mục public của Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
# Mở port 80 cho Nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]