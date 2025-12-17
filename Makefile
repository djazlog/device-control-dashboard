.PHONY: build up down restart logs clean rebuild help

# Переменные
PORT := 8117
DOCKER_COMPOSE_DIR := docker

help: ## Показать справку по командам
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Собрать Docker образ через docker-compose (выполняет npm run build в контейнере)
	@echo "Сборка Docker образа..."
	cd $(DOCKER_COMPOSE_DIR) && docker-compose build
	@echo "Сборка завершена!"

up: build ## Запустить сервис через docker-compose (собирает образ если нужно)
	@echo "Запуск сервиса через docker-compose..."
	cd $(DOCKER_COMPOSE_DIR) && docker-compose up -d
	@echo "Сервис запущен на http://localhost:$(PORT)"

down: ## Остановить и удалить контейнеры
	@echo "Остановка сервиса..."
	cd $(DOCKER_COMPOSE_DIR) && docker-compose down
	@echo "Сервис остановлен"

restart: down up ## Перезапустить сервис

logs: ## Показать логи контейнера
	cd $(DOCKER_COMPOSE_DIR) && docker-compose logs -f

clean: down ## Остановить контейнеры и удалить образы
	@echo "Удаление образов..."
	cd $(DOCKER_COMPOSE_DIR) && docker-compose down --rmi all
	@echo "Очистка завершена"

rebuild: clean build ## Пересобрать образ с нуля

clean-deps: ## Очистить node_modules и переустановить зависимости
	@echo "Очистка зависимостей..."
	rm -rf node_modules
	rm -f package-lock.json
	@echo "Установка зависимостей..."
	npm install
	@echo "Зависимости переустановлены"

rebuild-full: clean-deps rebuild ## Полная пересборка с очисткой зависимостей

serve-dist: ## Запустить локальный HTTP сервер из папки dist (требует npm run build)
	@echo "Запуск локального сервера из папки dist..."
	@if [ ! -d "dist" ]; then \
		echo "❌ Папка dist не найдена! Сначала выполните: npm run build"; \
		exit 1; \
	fi
	@node scripts/serve-dist.js

# Команда по умолчанию
.DEFAULT_GOAL := help

