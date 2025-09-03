# 1) сборка фронта
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm install; fi
# по умолчанию бэкенд будет за /api
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN npm run build

# 2) nginx как веб-сервер/прокси
FROM nginx:1.27-alpine
# наш конфиг nginx (см. следующий блок)
COPY nginx.conf /etc/nginx/nginx.conf
# собранный фронт
COPY --from=build /app/dist /usr/share/nginx/html
# статика бэкенда будет проксироваться, а не копироваться
EXPOSE 80
