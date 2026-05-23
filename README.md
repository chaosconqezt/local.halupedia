ВНИМАНИЕ! ЭТО ПРОЕКТ СГЕНЕРИРОВАННЫЙ ИИ (НЕЙРОСЛОП)!

# Halupedia (Локализованная RU версия для локального использования)

Это полностью локализованный на русский язык форк справочного проекта [Halupedia](https://github.com/BaderBC/halupedia). Проект адаптирован для запуска на вашем собственном оборудовании.
Он представляет собой нейросетевую энциклопедию, где каждая статья (и даже поисковые подсказки) генерируется прямо на ходу большими языковыми моделями (LLM). Эта версия специализирована для локального использования и работает на базе Node.js, Express и SQLite, в отличие от оригинальной версии, завязанной на экосистему Cloudflare (Workers, KV, D1, R2).

Проект по умолчанию собирается под локальные открытые нейросети через API, совместимое с OpenAI (например, [llama.cpp](https://github.com/ggml-org/llama.cpp) или vLLM). Вы также можете использовать облачные сервисы (через OpenRouter, OpenAI или Google Gemini, если они поддерживают OpenAI-формат).

## Особенности (Нейрослоп)
- **100% Галлюцинации:** Статьи, их краткое содержание, связанные темы и поисковая выдача динамически придумываются нейросетью на основе запросов и ссылок.
- **Работает оффлайн (Local First):** 
  - **D1 Shim:** Использует `better-sqlite3` для симуляции Cloudflare D1.
  - **KV Shim:** Кэширует сгенерированный бред (HTML-статьи) в локальную базу SQLite.
  - **R2 Shim:** Симулирует хранилище файлов локально (для картинок, сгенерированных ИИ, если вы подключите соответствующую модель).
- **Стек:** На фронте React SPA (Vite), на бэке — Express-сервер, оборачивающий API на базе Hono.
- **Встроенная модерация:** Простые инструменты контроля для ограничения спама (рейт-лимиты), авто-модерации комментариев и управления базами.

---

## 🛠 Установка и запуск

**Требования:**
- **Node.js** (рекомендуется v18+)
- *(Опционально)* Локальный LLM-сервер (`llama.cpp`, `Ollama` или другой, раздающий эндпоинт `/v1/chat/completions`) ИЛИ ключ API (например, от OpenRouter/OpenAI).

1. Распакуйте архив или клонируйте репозиторий.
2. Перейдите в корневую папку (где лежит `package.json`).
3. Установите зависимости:
   ```bash
   npm install
   ```
4. Скопируйте файл конфигурации:
   ```bash
   cp .env.example .env
   ```
5. Отредактируйте `.env` и укажите данные вашей нейросети. Здесь же можно настроить `HOST`, если вы хотите слушать только `127.0.0.1` или определенную подсеть (по умолчанию `0.0.0.0`).
6. Запустите сервер профиля разработчика:
   ```bash
   npm run dev
   ```
Доступ будет открыт по адресу [http://localhost:3000](http://localhost:3000).

При первом старте автоматически создастся папка `.data/`, содержащая локальные базы данных (`kv.sqlite`, `d1.sqlite`) и папку `r2/`.

### Создание финального билда (Production)
```bash
npm run build
npm run start
```

---

## ✏️ Как редактировать Промпт (Инструкции для нейросети)

Все промпты (системные инструкции), которые управляют тем, как именно нейросеть будет галлюцинировать абсурдные статьи или поисковые подсказки, вынесены в отдельный файл на сервере:
- **`server/llm.ts`**

Откройте `server/llm.ts`. Обратите внимание на константы:
- `SYSTEM_PROMPT` — главная инструкция для написания статей. Если вы хотите изменить тональность энциклопедии, добавить свои правила или запреты, отредактируйте этот текст. 
- `SEARCH_SYSTEM_PROMPT` — инструкция, которая отвечает за генерацию "остроумных" поисковых подсказок.

После изменения промпта просто сохраните файл: если вы запустили через `npm run dev`, сервер автоматически перезагрузится, и следующие статьи будут генерироваться по новым правилам.

---

## 🛡 Управление контентом и Админка / Модерация

В Halupedia есть встроенная панель администратора по адресу `/admin`. 
Для входа в нее вам нужно добавить пользователя в таблицу `admins` в локальной базе данных D1 (`.data/d1.sqlite`). Пароли хэшируются с использованием SHA-512.

Через `/admin` вы можете **"Забанить статью" (Ban a slug)**:
Это удалит HTML-код статьи, все голоса и комментарии, а также добавит slug (название статьи в ссылке) в черный список модерации. Любые будущие попытки сгенерировать заблокированную статью будут выдавать сообщение "Статья удалена" и предотвращать её повторное создание.

**Как править контент вручную (базы данных):**
Поскольку вся архитектура запущена локально в SQLite:
- **KV Store (`.data/kv.sqlite`)**: содержит сгенерированный HTML статей (в таблице `kv`). Вы можете напрямую удалить или отредактировать HTML-тэг нужной статьи, найдя её по ключу.
- **Главная БД (`.data/d1.sqlite`)**: содержит профили, лайки, комментарии профилей, связь ссылок (`link_hints`). Вы можете удалить бракованные ссылки, просто удалив соответствующие строки из таблицы `link_hints`.
Управлять этими базами можно через любой инструмент для просмотра SQLite (DB Browser for SQLite, DBeaver, sqlite3-cli и т.д).

---
---

# English README

**WARNING! THIS IS AI SLOP!**

## Halupedia (Localized RU version for local hosting)

This is a globally localized Russian fork of the original [Halupedia](https://github.com/BaderBC/halupedia) project. It is adapted to strictly run on your own hardware. 
It provides an AI-powered encyclopedia where every article (and search suggestions) are generated on-demand by Large Language Models (LLMs). This version is fully adapted to run locally using Node.js, Express, and SQLite, instead of relying on Cloudflare Workers.

You can run this project locally using an OpenAI-compatible local AI server like [llama.cpp](https://github.com/ggml-org/llama.cpp) or vLLM, or you can connect it to OpenRouter / OpenAI.

You can configure the network interface by setting `HOST` in your `.env` file (e.g., `HOST=127.0.0.1`). It defaults to `0.0.0.0`.

### Features
- **Fully AI-Generated:** Articles, summaries, and related topics are dynamically created by LLMs based on search queries and URL slugs.
- **Local First:** 
  - **D1 Shim:** Uses `better-sqlite3` to simulate Cloudflare D1.
  - **KV Shim:** Stores key-value data in local SQLite for caching and fast lookups.
  - **R2 Shim:** Simulates object storage using the local file system for generated images.
- **Full-Stack:** Client is a React Single Page App (SPA) built with Vite, backend is Express wrapping a Hono API.
- **Moderation & Rate Limiting:** Built-in tools for limiting generation spam, auto-moderating bad words, and managing user comments.

### Editing Prompts

If you want to edit how the LLM generates content or changes the encyclopedia's tone, modify the system prompts found in:
- **`server/llm.ts`** (`SYSTEM_PROMPT` for articles and `SEARCH_SYSTEM_PROMPT` for search suggestions).

### Admin Access & Content Management

Halupedia includes a built-in admin panel at `/admin`. To log in, you will need to add a user to the `admins` table in the local D1 database (`.data/d1.sqlite`). Passwords are hashed using SHA-512.

Since everything is managed via local SQLite databases (`.data/kv.sqlite` and `.data/d1.sqlite`), you can also manually delete or edit generated articles and links using any SQLite viewer (like DB Browser or DBeaver).

### Project Structure (Advanced)
- `/src` - The React Vite client (SPA that drives the Wiki interface).
- `/server` - The Hono backend containing all API endpoints.
- `/cf-shims.ts` - Custom local emulators for Cloudflare's D1, KV, and R2 APIs.
- `/server.ts` - The main Express entry point.
