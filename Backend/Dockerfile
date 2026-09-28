# Sử dụng image Node.js gọn nhẹ
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json và cài đặt dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy toàn bộ code và build
COPY . .
RUN npm run build

# Chạy app
EXPOSE 3000
CMD ["npm", "run", "start:prod"]