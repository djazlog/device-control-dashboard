# Этап сборки
FROM node:lts-alpine AS builder

WORKDIR /app

# Принимаем build arguments для переменных окружения
ARG VITE_HTTP_API_URL
ARG VITE_WS_API_URL

# Устанавливаем переменные окружения для сборки
ENV VITE_HTTP_API_URL=${VITE_HTTP_API_URL}
ENV VITE_WS_API_URL=${VITE_WS_API_URL}

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Собираем проект (переменные VITE_* будут встроены в код)
RUN npm run build

# Этап запуска с nginx
FROM nginx:alpine

# Копируем собранные файлы из этапа сборки
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт 80
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]

