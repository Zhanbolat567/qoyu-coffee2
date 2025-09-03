# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Параметр API-адреса (если хочешь оставить абсолютный — тоже ок)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- Serve stage (Nginx) ----------
FROM nginx:1.27-alpine
# Фронтовая сборка
COPY --from=build /app/dist /usr/share/nginx/html
# Конфиг nginx для прокси /api и /media
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx","-g","daemon off;"]
