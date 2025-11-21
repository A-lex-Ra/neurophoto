# 🚀 NeuroPhoto - Быстрая установка и запуск

## 📋 Предварительные требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) установлен и запущен
- [Node.js 20+](https://nodejs.org/) установлен (для локальной разработки)
- PowerShell (встроен в Windows)

## ⚡ Быстрый старт (Docker Compose - рекомендуется)

### 1. Настройка переменных окружения

```powershell
# Создайте .env в корне проекта
# Скопируйте следующее содержимое:
```

**Файл `.env` в корне проекта:**
```env
# OpenAI API Key (BotHub)
OPENAI_API_KEY=your-bothub-api-key-here

# Auth Secrets
JWT_SECRET=your-jwt-secret-change-in-production
NEXTAUTH_SECRET=your-nextauth-secret-change-in-production
```

**Файл `back/nest-back/.env`:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/imageai
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
MINIO_BUCKET=generations
OPENAI_API_KEY=your-bothub-api-key-here
JWT_SECRET=your-jwt-secret-change-in-production
```

### 2. Запуск всех сервисов

```powershell
# Убедитесь, что Docker Desktop запущен
docker ps

# Запустите все сервисы (PostgreSQL, Redis, MinIO, API, Worker, Frontend)
docker-compose up -d

# Проверьте статус
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

### 3. Инициализация базы данных

```powershell
# Миграции применяются автоматически при запуске API
# Для создания демо пользователей выполните:
docker compose exec api npm run prisma:seed:prod
```

### 4. Проверка работоспособности

Откройте в браузере:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Nginx (reverse proxy)**: http://localhost:8080
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin123)

## 📝 Ручная установка (для разработки)

### 1. Настройка переменных окружения

Создайте файлы `.env` как описано в разделе "Быстрый старт" выше.

### 2. Запуск инфраструктуры

```powershell
# Убедитесь, что Docker Desktop запущен
docker ps

# Запустите только инфраструктурные сервисы
docker-compose up -d postgres redis minio minio-init

# Проверьте статус
docker-compose ps
```

### 3. Настройка Backend

```powershell
cd back/nest-back

# Установите зависимости
npm install

# Создайте .env файл (см. раздел выше)

# Сгенерируйте Prisma Client
npm run prisma:generate

# Примените миграции
npm run prisma:migrate

# Создайте демо пользователей
npm run prisma:seed
```

### 4. Настройка Frontend

```powershell
cd neurophoto-front

# Установите зависимости
npm install

# Создайте .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
echo "NEXTAUTH_URL=http://localhost:3000" >> .env.local
echo "NEXTAUTH_SECRET=your-nextauth-secret" >> .env.local
```

## 🎯 Запуск приложения

### Вариант 1: Локальная разработка (3 терминала)

**Терминал 1 - Backend API:**
```powershell
cd back/nest-back
npm run start:dev
```

**Терминал 2 - Worker:**
```powershell
cd back/nest-back
npm run start:dev -- --entryFile worker
```

**Терминал 3 - Frontend:**
```powershell
cd neurophoto-front
npm run dev
```

### Вариант 2: Docker Compose (весь стек)

```powershell
# Сборка и запуск всех сервисов
docker-compose up --build

# В фоне
docker-compose up -d --build

# Остановить все сервисы
docker-compose down

# Остановить и удалить volumes (БД будет очищена)
docker-compose down -v
```

## 🌐 URL-адреса

После успешного запуска доступны:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Nginx (reverse proxy)**: http://localhost:8080
- **MinIO Console**: http://localhost:9001
  - Login: `minioadmin`
  - Password: `minioadmin123`

## 👤 Демо пользователи

После выполнения `npm run prisma:seed` или `docker compose exec api npm run prisma:seed:prod` создаются:

**Обычный пользователь:**
- Email: `demo@neurophoto.com`
- Password: `demo123`
- Credits: 100

**Администратор:**
- Email: `admin@neurophoto.com`
- Password: `admin123`
- Credits: 1000

## 🔍 Проверка работоспособности

### 1. Проверка инфраструктуры

```powershell
# Проверка Docker контейнеров
docker-compose ps

# Все должны быть в статусе "Up" или "running"
```

### 2. Проверка БД

```powershell
# Вариант 1: Через Prisma Studio (локальная разработка)
cd back/nest-back
npx prisma studio
# Откроется http://localhost:5555

# Вариант 2: Через psql в Docker
docker compose exec postgres psql -U postgres -d imageai -c 'SELECT * FROM "User";'

# Проверка кодов доступа (если используются)
docker compose exec postgres psql -U postgres -d imageai -c 'SELECT * FROM "AccessCode";'
```

### 3. Проверка API

```powershell
# Проверка health endpoint
curl http://localhost:3001

# Должен вернуть "Hello World!" или подобное
```

### 4. Проверка MinIO

Откройте http://localhost:9001 в браузере:
- Войдите: minioadmin / minioadmin123
- Проверьте наличие bucket `generations`

## 🐛 Решение проблем

### Docker не запускается

```powershell
# Проверьте статус Docker
docker ps

# Если ошибка - запустите Docker Desktop
```

### Ошибки при npm install

```powershell
# Очистите кэш и переустановите
npm cache clean --force
npm install

# Если проблемы с зависимостями
rm -rf node_modules package-lock.json
npm install
```

### Ошибки Prisma

```powershell
# Пересоздайте БД
docker-compose down -v
docker-compose up -d postgres

# Подождите 10 секунд
Start-Sleep -Seconds 10

# Примените миграции заново
cd back/nest-back
npm run prisma:migrate
npm run prisma:seed
```

### Порты заняты

Если порты 3000, 3001, 5432, 6379, 8080, 9000 или 9001 заняты:

1. Найдите процессы:
```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :8080
```

2. Измените порты в `docker-compose.yml` и `.env` файлах

### MinIO не создает bucket

```powershell
# Пересоздайте minio-init
docker-compose rm -f minio-init
docker-compose up -d minio-init

# Проверьте логи
docker-compose logs minio-init
```

### Ошибки генерации изображений

```powershell
# Проверьте логи worker
docker-compose logs -f worker

# Проверьте, что OPENAI_API_KEY установлен
docker compose exec api printenv | findstr OPENAI_API_KEY
```

## 📦 Полезные команды

### Docker

```powershell
# Остановить все сервисы
docker-compose down

# Остановить и удалить volumes (БД будет очищена)
docker-compose down -v

# Просмотр логов всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f web

# Перезапустить конкретный сервис
docker-compose restart api

# Выполнить команду в контейнере
docker compose exec api npm run prisma:seed:prod
docker compose exec postgres psql -U postgres -d imageai
```

### Backend

```powershell
cd back/nest-back

# Разработка
npm run start:dev                # Запуск API в dev режиме
npm run start:dev -- --entryFile worker  # Запуск Worker в dev режиме

# Production
npm run build                    # Сборка
npm run start:prod               # Запуск API в prod режиме
npm run start:worker             # Запуск Worker в prod режиме

# Тесты
npm run test                     # Unit тесты
npm run test:watch               # Watch режим
npm run test:cov                 # Coverage
npm run test:e2e                 # E2E тесты

# Prisma
npm run prisma:generate          # Генерация Prisma Client
npm run prisma:migrate           # Создать новую миграцию
npm run prisma:deploy            # Применить миграции (production)
npm run prisma:seed              # Seed данные (dev)
npm run prisma:seed:prod         # Seed данные (prod)
npx prisma studio                # Prisma Studio (GUI для БД)

# Форматирование
npm run format                   # Prettier
npm run lint                     # ESLint
```

### Frontend

```powershell
cd neurophoto-front

# Разработка
npm run dev                      # Запуск в dev режиме

# Production
npm run build                    # Сборка для production
npm run start                    # Запуск production сборки

# Линтинг
npm run lint                     # Next.js lint
```

## 📚 Дополнительно

- **Полная документация**: [README.md](./README.md)
- **API документация**: [API.md](./API.md)
- **Реализованная функциональность**: [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- **Архитектура**: [.github/copilot-instructions.md](./.github/copilot-instructions.md)
- **Prisma схема**: [back/nest-back/prisma/schema.prisma](./back/nest-back/prisma/schema.prisma)

## 🤖 AI Модель

Проект использует **Gemini 2.5 Flash Image Preview** через BotHub API (OpenAI-compatible endpoint).

Для получения API ключа:
1. Зарегистрируйтесь на [BotHub](https://bothub.chat/)
2. Получите API ключ
3. Добавьте его в `.env` файл как `OPENAI_API_KEY`

## 🆘 Поддержка

Если возникли проблемы:

1. **Проверьте логи**: `docker-compose logs -f`
2. **Убедитесь, что Docker запущен**: `docker ps`
3. **Проверьте, что все порты свободны**: см. раздел "Решение проблем"
4. **Убедитесь, что .env файлы созданы** и содержат корректные значения
5. **Проверьте статус сервисов**: `docker-compose ps`
6. **Проверьте API ключ**: убедитесь, что `OPENAI_API_KEY` установлен корректно

### Частые проблемы:

- ❌ **"Cannot connect to Docker daemon"** → Запустите Docker Desktop
- ❌ **"Port already in use"** → Остановите процесс на занятом порту или измените порт в docker-compose.yml
- ❌ **"Prisma Client not generated"** → Выполните `npm run prisma:generate`
- ❌ **"MinIO bucket not found"** → Пересоздайте minio-init: `docker-compose up -d minio-init`
- ❌ **"OpenAI API error"** → Проверьте корректность API ключа BotHub

---

**Готово к работе! 🎉**
