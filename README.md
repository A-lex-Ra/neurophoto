# 🎨 NeuroPhoto - AI Image Generator

SaaS-платформа для генерации изображений с помощью AI (Gemini 2.5 Flash через BotHub API).

## 🚀 Быстрый старт

### 1. Запуск инфраструктуры (PostgreSQL, Redis, MinIO)

```powershell
# Клонируйте репозиторий и перейдите в директорию
cd neurophoto

# Создайте .env файл в корне проекта
# OPENAI_API_KEY=your-api-key
# JWT_SECRET=your-secret
# NEXTAUTH_SECRET=your-nextauth-secret

# Запустите инфраструктуру
docker-compose up -d postgres redis minio minio-init
```

### 2. Настройка Backend (NestJS)

```powershell
cd back/nest-back

# Скопируйте .env.example в .env
cp .env.example .env

# Отредактируйте .env и добавьте свой OPENAI_API_KEY

# Установите зависимости
npm install

# Сгенерируйте Prisma Client
npm run prisma:generate

# Запустите миграции
npm run prisma:migrate

# Запустите в режиме разработки
npm run start:dev

# чтобы генерировать коды доступа в докере:
docker compose exec api node dist/src/scripts/create-codes.js
```

Backend будет доступен на `http://localhost:3001`

### 3. Запуск Worker (обработка очереди)

```powershell
# В отдельном терминале
cd back/nest-back
npm run start:dev -- --entryFile worker
```

### 4. Настройка Frontend (Next.js)

```powershell
cd neurophoto-front

# Установите зависимости
npm install

# Создайте .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

# Запустите в режиме разработки
npm run dev
```

Frontend будет доступен на `http://localhost:3000`

## 🐳 Запуск через Docker Compose (полный стек)

```powershell
# Создайте .env в корне проекта с необходимыми переменными
# OPENAI_API_KEY=...
# JWT_SECRET=...
# NEXTAUTH_SECRET=...

# Запустите все сервисы
docker-compose up -d

# Проверьте логи
docker-compose logs -f
```

Сервисы:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MinIO Console: http://localhost:9001 (minioadmin / minioadmin123)
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 📦 Структура проекта

```
neurophoto/
├── back/
│   └── nest-back/          # NestJS Backend
│       ├── src/
│       │   ├── prisma/     # Prisma client
│       │   ├── storage/    # MinIO интеграция
│       │   ├── queue/      # BullMQ
│       │   ├── openai/     # OpenAI client
│       │   ├── generation/ # Генерация изображений
│       │   └── gallery/    # Управление файлами
│       └── prisma/
│           └── schema.prisma
│
├── neurophoto-front/       # Next.js Frontend
│   ├── app/
│       └── components/
│
└── docker-compose.yml
```

## 🔧 Разработка

### Backend команды

```powershell
npm run start:dev          # Запуск API в dev режиме
npm run start:worker       # Запуск Worker в prod режиме
npm run build              # Сборка
npm run prisma:generate    # Генерация Prisma Client
npm run prisma:migrate     # Создание миграции
npm run test               # Тесты
```

### Frontend команды

```powershell
npm run dev                # Запуск в dev режиме
npm run build              # Сборка для production
npm run start              # Запуск production сборки
```

## 🌐 API Endpoints

### Gallery Service
- `POST /api/gallery/upload` - Загрузить файл
- `GET /api/gallery/:fileId` - Скачать файл
- `GET /api/gallery/user/:userId` - Список файлов пользователя
- `DELETE /api/gallery/:fileId` - Удалить файл

### Generation Service
- `POST /api/generations/create` - Создать задачу генерации
- `GET /api/generations/stream/:jobId` - SSE stream прогресса
- `GET /api/generations/:id` - Получить результат
- `GET /api/generations/list` - История генераций

### Tools Service
- `GET /api/tools/list` - Список инструментов
- `POST /api/tools/:toolName/call` - Вызвать инструмент

## 🗄️ Database

Prisma управляет схемой БД. Основные модели:
- `User` - пользователи
- `File` - файлы в MinIO
- `Generation` - задачи генерации
- `Transaction` - финансовые транзакции

### Миграции

```powershell
# Создать новую миграцию
npm run prisma:migrate

# Применить миграции (production)
npm run prisma:deploy

# Prisma Studio (GUI для БД)
npx prisma studio
```

## 🔐 Переменные окружения

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/imageai
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
OPENAI_API_KEY=your-key
JWT_SECRET=your-secret
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
```

## 📝 TODO

- [ ] Аутентификация (JWT)
- [ ] Система кредитов
- [ ] Stripe интеграция
- [ ] Rate limiting
- [ ] Мониторинг и логирование
- [ ] E2E тесты

## 🤝 Contributing

1. Fork репозиторий
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Создайте Pull Request

## 📄 License

MIT
