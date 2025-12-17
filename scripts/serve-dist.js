#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8117;
const DIST_DIR = path.join(__dirname, '..', 'dist');

// MIME типы
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
}

function handleRequest(req, res) {
  // Убираем query string
  let filePath = req.url.split('?')[0];
  
  // Если корневой путь или заканчивается на /, отдаем index.html
  if (filePath === '/' || filePath.endsWith('/')) {
    filePath = '/index.html';
  }

  // Полный путь к файлу
  const fullPath = path.join(DIST_DIR, filePath);

  // Проверяем существование файла
  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Определяем, является ли запрос запросом статического файла
      const ext = path.extname(filePath).toLowerCase();
      const isStaticFile = ext && (ext === '.json' || ext === '.svg' || ext === '.ico' || 
                                   ext === '.png' || ext === '.jpg' || ext === '.jpeg' || 
                                   ext === '.gif' || ext === '.css' || ext === '.js' ||
                                   ext === '.woff' || ext === '.woff2' || ext === '.ttf' ||
                                   ext === '.eot' || filePath.startsWith('/assets/'));
      
      if (isStaticFile) {
        // Для статических файлов возвращаем 404, если файл не найден
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        // Для остальных запросов (SPA роутинг) возвращаем index.html
        const indexPath = path.join(DIST_DIR, 'index.html');
        fs.stat(indexPath, (indexErr) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            serveFile(indexPath, res);
          }
        });
      }
    } else {
      // Файл существует, отдаем его
      serveFile(fullPath, res);
    }
  });
}

// Проверяем существование папки dist
if (!fs.existsSync(DIST_DIR)) {
  console.error(`❌ Папка ${DIST_DIR} не найдена!`);
  console.error('Сначала выполните: npm run build');
  process.exit(1);
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`🚀 Локальный сервер запущен на http://localhost:${PORT}`);
  console.log(`📁 Обслуживает файлы из: ${DIST_DIR}`);
  console.log(`\nНажмите Ctrl+C для остановки сервера\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Порт ${PORT} уже занят!`);
    console.error(`Используйте другой порт: PORT=8080 node scripts/serve-dist.js`);
  } else {
    console.error('Ошибка сервера:', err);
  }
  process.exit(1);
});

