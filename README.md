# Telegram-бот для аналитики группового чата
<img width="1401" height="900" alt="539565329-ad63e511-106f-44dd-899c-88b5233bca23" src="https://github.com/user-attachments/assets/9bca58b6-6e42-4afc-aaf8-772f1d921f41" />
<img width="1046" height="641" alt="539565353-3433b17f-7af9-4a1a-856c-424b48b75e4f" src="https://github.com/user-attachments/assets/c3df7001-c12b-49ab-beff-80c5bada1f11" />

## 1. Запуск проекта

### Требования
- Docker + Docker Compose
- Node.js 18+ (для локального запуска web)

### Настройка
1. Скопируйте `.env.example` в `.env` и заполните токены:
   ```bash
   cp .env.example .env
   ```
2. Запустите инфраструктуру:
   ```bash
   docker-compose up --build
   ```
3. Если Gemini возвращает ошибку модели, проверьте `GEMINI_MODEL` и `GEMINI_API_VERSION`.
   По умолчанию используется `GEMINI_API_VERSION=v1` и fallback на `GEMINI_FALLBACK_API_VERSION=v1beta`.

### Локальный запуск веб-интерфейса
```bash
cd web
npm install
npm run dev
```

## UI (Mantine)

В `web/` подключен Mantine (UI‑компоненты + хуки): `@mantine/core` и `@mantine/hooks`.
Интеграция выполнена через импорт `@mantine/core/styles.css` и провайдер `MantineProvider`
в `web/src/app/layout.tsx` + `web/src/app/providers.tsx`. Компоненты Mantine используются
в виджете `web/src/widgets/user-analysis-panel/ui/UserAnalysisPanel.tsx`.

Если добавляете дополнительные пакеты Mantine (например, `@mantine/notifications`), подключите их CSS
в `layout.tsx` аналогично.

## FSD (Feature‑Sliced Design) в `web/`

Структура `web/src/` приведена к слоям FSD (слой `pages` хранится в `pages-layer`):

- `app/` — инициализация приложения, провайдеры, глобальные стили, маршрутизация Next.js.
- `pages/` — страницы (в нашем случае `home`). В Next.js App Router эта директория зарезервирована,
  поэтому слой `pages` размещен как `web/src/pages-layer/`.
- `widgets/` — крупные UI‑блоки страницы (панель анализа пользователя).
- `features/` — пользовательские сценарии и бизнес‑логика (запрос анализа пользователя).
- `entities/` — доменные сущности и их модели (user/message).
- `shared/` — общие утилиты, конфиги, доступ к внешним API и БД.

Важно: `app/` — это технический слой Next.js, но по FSD он соответствует слою инициализации приложения.

## 2. Архитектура

- `docker-compose.yml` поднимает `postgres`, `redis`, `bot`, `web`.
- `db/init.sql` содержит схему БД.
- `bot/` — Node.js + TypeScript + Telegraf. Чистые SQL-запросы через `pg`.
- `web/` — Next.js приложение (App Router) с FSD‑структурой и API‑роутом для анализа.
- `models/` в боте инкапсулируют SQL-запросы по таблицам.
- Кэш статистики хранится в Redis.
- API версионируется через `/api/v1`, есть healthcheck `/api/v1/health`.

## 3. Принятые решения

- Без ORM: простой `pg` и модели для таблиц.
- Кэширование статистики в Redis, TTL настраивается через `CACHE_TTL_SECONDS`.
- Gemini вызывается через прямой HTTP-запрос, чтобы не тащить лишние SDK.
- Простая схема БД (chats, users, messages) с индексами по дате.
- Запись сообщений оборачивается в транзакцию (аналог Unit of Work) — меньше риска частичных записей.
- Для web API есть сервисные ошибки и единый обработчик статусов.

Сложности:
- Telegram id больше 32-бит — сохраняем как `BIGINT`, в Node обрабатываем строками.
- Форматирование статистики и inline-кнопки — вынесено в отдельные хелперы.

## Инженерные практики (из рекомендаций)

- Разделение слоев: SQL спрятан в `models/`, бизнес-логика в `services/`, входы валидируются в контроллерах/роутах.
  Это упрощает поддержку и тестирование.
- Транзакционность (Unit of Work-идея) реализована через `withTransaction` и `ingestMessage`.
  Так мы не получим запись сообщения без пользователя/чата при сбое.
- Сервисные исключения + централизованный обработчик в `web` позволяют возвращать корректные HTTP-статусы.
  Клиенту проще реагировать на ошибки, чем на `200 OK` с текстом ошибки.
- Версионирование API (`/api/v1`) и healthcheck (`/api/v1/health`) помогают интеграциям и эксплуатации сервиса.

## 4. Использование AI (обязательный раздел)

- Использовал: GPT-5 (Codex CLI).
- Где помогло: генерация структуры проекта, шаблонов Dockerfile/compose, каркаса бота и API.
- Где дорабатывал: модели SQL, обработку inline-кнопок, форматирование выводов, обработку ошибок.
- Оценка экономии времени: ~30-40%.

## Команды бота

- `/stats` — общая статистика (топ-10). Inline-кнопки для фильтра по времени.
- `/stats @username` — статистика конкретного пользователя.
- `/stats from YYYY-MM-DD to YYYY-MM-DD` — кастомный диапазон (опционально).
- `/analyze @username` или `/analyze` (reply на сообщение) — анализ через Gemini.
- `/keywords` — **своя фича**: топ слов по чату (последние 30 дней или указанная дата).

Примечание по анализу: бот делает 2 попытки запроса в Gemini. Если ответ пустой или API недоступен, используется
локальный fallback-анализ по сообщениям (частые слова, активность, длина).

## Своя фича

**Что делает:** команда `/keywords` показывает наиболее частые слова в чате (без стоп-слов), помогает быстро понять, о чем больше всего говорят.

**Зачем нужна:** позволяет быстро увидеть «темы недели», не запуская анализ конкретного пользователя.

**Как использовать:** `/keywords` или `/keywords week`.

## Тесты

```bash
npm test
```

Используется Vitest. Тесты изолированы и не требуют поднятия БД/Redis: зависимости (`pg`, `redis`, модели)
замоканы на уровне сервисов.

## Логи

Ошибки пишутся в stdout/stderr контейнеров. Смотреть так:

```bash
docker compose logs -f bot
docker compose logs -f web
docker compose logs --tail 200 bot
```

## Мониторинг и уведомления

### Уведомления о падении контейнера

Скрипт `scripts/monitor-containers.sh` слушает события Docker и отправляет уведомление в Telegram при падении
контейнера (с последними строками логов).

1) В `.env` включите и укажите данные:

- `ALERTS_ENABLED=true`
- `ALERTS_TELEGRAM_BOT_TOKEN=...`
- `ALERTS_TELEGRAM_CHAT_ID=...`

2) Запуск:

```bash
./scripts/monitor-containers.sh
```

### Проверка healthcheck

Скрипт `scripts/monitor-health.sh` опрашивает `ALERTS_HEALTHCHECK_URL` (по умолчанию
`http://localhost:3000/api/v1/health`) и шлет уведомление при смене статуса (UP/DOWN).

```bash
./scripts/monitor-health.sh
```

Для фонового запуска:

```bash
nohup ./scripts/monitor-containers.sh > monitor-containers.log 2>&1 &
nohup ./scripts/monitor-health.sh > monitor-health.log 2>&1 &
```

## Технологии

- Node.js + TypeScript
- Telegraf
- Next.js
- Mantine
- PostgreSQL
- Redis
- Docker Compose
