ВНИМАНИЕ! ЭТО ПРОЕКТ СГЕНЕРИРОВАННЫЙ ИИ (НЕЙРОСЛОП)!

# Глюкопедия

Абсурдная LLM-энциклопедия на русском языке. Каждая статья генерируется нейросетью на основе запросов пользователя и сохраняется в локальные Markdown-файлы.

Проект по умолчанию работает с локальными LLM через OpenAI-совместимое API ([llama.cpp](https://github.com/ggml-org/llama.cpp), vLLM, Ollama). Также можно использовать облачные сервисы (OpenRouter, OpenAI, Gemini).

## Особенности
- **100% Галлюцинации:** Статьи полностью выдумываются нейросетью
- **Локальное хранение:** Статьи сохраняются как `.md` файлы в папку `data/`
- **Стек:** React (Vite) + Express (TypeScript)
- **Стриминг:** Статьи генерируются в реальном времени через SSE

## Установка и запуск

**Требования:**
- Node.js v18+
- LLM-сервер или API-ключ

```bash
npm install
cp .env.example .env
# Отредактируйте .env — укажите URL API и модель
npm run dev
```

Доступ: [http://localhost:3000](http://localhost:3000)

### Production
```bash
npm run build
npm run start
```

## Редактирование промпта

Системный промпт находится в `server/llm.ts`. Измените `SYSTEM_PROMPT` для调整 тональности энциклопедии.

## Структура проекта

- `src/` — React-фронтенд (SPA)
  - `src/components/` — компоненты (Home, Article, Header, Sidebar)
  - `src/hooks/` — хуки (useArticleStream)
- `server/` — Express-бэкенд
  - `server/index.ts` — точка входа сервера
  - `server/routes.ts` — API-маршруты
  - `server/llm.ts` — OpenAI-клиент и промпт
  - `server/utils.ts` — утилиты
- `data/` — сгенерированные статьи (Markdown)

---

# English

**WARNING! THIS IS AI SLOP!**

## Glukopedia

An absurdist LLM-powered encyclopedia in Russian. Every article is generated on-demand by an LLM and saved as a local Markdown file.

### Features
- **Fully AI-Generated:** Articles are completely hallucinated by the LLM
- **Local Storage:** Articles saved as `.md` files in `data/`
- **Stack:** React (Vite) + Express (TypeScript)
- **Streaming:** Articles generated in real-time via SSE

### Setup
```bash
npm install
cp .env.example .env
# Edit .env with your API URL and model
npm run dev
```

### Project Structure
- `src/` — React frontend (SPA)
- `server/` — Express backend
- `data/` — Generated articles (Markdown)
