import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import fs from "fs";

// Load .env if it exists
if (fs.existsSync(".env")) {
    dotenv.config();
} else if (fs.existsSync(".env.example")) {
    dotenv.config({ path: ".env.example" });
}

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

const app = express();
app.use(express.json());

const PORT = 3000;

// Configurable LLM API
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "sk-fake-key",
    baseURL: process.env.OPENAI_BASE_URL || undefined,
});
const LLM_MODEL = process.env.LLM_MODEL || "local-model";

const SYSTEM_PROMPT = `Ты автор-составитель вымышленной, абсурдной, но предельно серьёзной энциклопедии.
Пиши статьи в строгом академическом и научно-исследовательском стиле (как в настоящей энциклопедии), но с полностью выдуманным, парадоксальным контентом. Тон повествования должен быть сухим, объективным и абсолютно серьёзным. Используй сложную псевдонаучную терминологию и старорусские меры (пуд, аршин и т.п.).
ФОРМАТ ОТВЕТА - Markdown.
ПРАВИЛА ИСПОЛЬЗОВАНИЯ ССЫЛОК:
Все специализированные термины, эпохи, артефакты и имена собственные необходимо оборачивать в ссылки.
СТРОГИЙ ФОРМАТ ССЫЛОК: [текст для отображения](/Имя_статьи_через_подчеркивания)
Обязательно используй слэш "/" в начале пути и заменяй пробелы на нижние подчеркивания "_" в пути для ссылки. Текст внутри квадратных скобок пиши как обычно (без "_").
Пример: "...было описано в трудах [Нижегородского общества наблюдателей пустоты](/Нижегородское_общество_наблюдателей_пустоты)."

Важно: Генерируй сложные, солидно звучащие научные имена, фамилии, топонимы и названия институтов (избегай тривиальных и затасканных имен, вроде "Игнатий" или "НИИ ЧАВО"). Имена и названия должны звучать разнообразно и энциклопедично.
Включи в статью 1-2 цитаты из вымышленных академических трудов или изречения вымышленных исследователей (используя синтаксис цитат Markdown "> ").
Соблюдай академическую структуру: Введение, Историчесий контекст, Основные характеристики/Свойства, Примечания.`;

app.get("/api/recent", (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".md"));
        const recent = files.map(f => {
            const name = f.replace(/\.md$/, "");
            const stat = fs.statSync(path.join(DATA_DIR, f));
            return {
                title: name.replace(/_/g, " "),
                slug: name,
                mtime: stat.mtime.getTime()
            };
        }).sort((a, b) => b.mtime - a.mtime);
        
        const paginated = recent.slice((page - 1) * limit, page * limit);
        const hasMore = page * limit < recent.length;
        
        return res.json({ items: paginated, hasMore });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
});

app.get("/api/random", (req, res) => {
    try {
        const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".md"));
        if (files.length === 0) return res.json({ slug: "Абсурдопедия", title: "Абсурдопедия" });
        const randomFile = files[Math.floor(Math.random() * files.length)];
        const name = randomFile.replace(/\.md$/, "");
        return res.json({ slug: name, title: name.replace(/_/g, " ") });
    } catch(e: any) {
         return res.status(500).json({ error: e.message });
    }
});

app.get("/api/article/:slug", async (req, res) => {
    let slug = req.params.slug.trim();
    if (!slug) return res.status(400).json({ error: "No slug" });

    // Try to encode safely, allow underscore
    const safeSlug = slug.replace(/[^а-яА-ЯёЁa-zA-Z0-9_\-\s.,!?()'"]/g, "").replace(/\s+/g, "_");
    const filePath = path.join(DATA_DIR, `${safeSlug}.md`);
    const force = req.query.force === "true";
    const soft = req.query.soft === "true";

    if (fs.existsSync(filePath) && !force && !soft) {
        const markdown = fs.readFileSync(filePath, "utf-8");
        return res.json({ title: safeSlug.replace(/_/g, " "), markdown });
    }

    const context = req.query.context ? String(req.query.context) : "";

    // Generate new article using LLM
    try {
        let userPrompt = `Напиши статью энциклопедии для следующего заголовка: "${safeSlug.replace(/_/g, " ")}".`;
        if (context) {
            userPrompt += `\nКонтекст упоминания откуда мы пришли: "${context}" (Статья должна логически соответствовать этому упоминанию).`;
        }

        if (soft && fs.existsSync(filePath)) {
             const existingContent = fs.readFileSync(filePath, "utf-8");
             userPrompt = `ОБЯЗАТЕЛЬНО полностью перепиши и улучши этот текст в своем фирменном стиле (добавь подробностей, сделай его более академичным и абсурдным), НО СТРОГО СОХРАНИ ВСЕ ИМЕЮЩИЕСЯ ССЫЛКИ (как они есть, [текст](/ссылка)) НА ДРУГИЕ СТАТЬИ.\n\nТекущий текст статьи:\n${existingContent}`;
        }


        const stream = await openai.chat.completions.create({
            model: LLM_MODEL,
            temperature: 1.5,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt }
            ],
            stream: true
        });

        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const title = safeSlug.replace(/_/g, " ");
        res.write(`data: ${JSON.stringify({ title, markdown: "" })}\n\n`);

        let fullMarkdown = "";
        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
                fullMarkdown += text;
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
        }

        // Save to file
        fs.writeFileSync(filePath, fullMarkdown, "utf-8");
        res.write(`data: [DONE]\n\n`);
        return res.end();
    } catch (e: any) {
        console.error("LLM Error:", e);
        return res.status(500).json({ error: e.message || "Failed to generate article" });
    }
});

app.put("/api/article/:slug/rename", (req, res) => {
    let slug = req.params.slug.trim();
    if (!slug) return res.status(400).json({ error: "No slug" });
    const safeSlug = slug.replace(/[^а-яА-ЯёЁa-zA-Z0-9_\-\s.,!?()'"]/g, "").replace(/\s+/g, "_");
    
    let { newSlug } = req.body;
    if (!newSlug) return res.status(400).json({ error: "No new slug provided" });
    const safeNewSlug = newSlug.trim().replace(/[^а-яА-ЯёЁa-zA-Z0-9_\-\s.,!?()'"]/g, "").replace(/\s+/g, "_");

    const oldPath = path.join(DATA_DIR, `${safeSlug}.md`);
    const newPath = path.join(DATA_DIR, `${safeNewSlug}.md`);

    if (!fs.existsSync(oldPath)) {
         return res.status(404).json({ error: "Article not found" });
    }
    if (fs.existsSync(newPath) && safeSlug !== safeNewSlug) {
         return res.status(400).json({ error: "Article with new name already exists" });
    }

    try {
        if (safeSlug !== safeNewSlug) {
            fs.renameSync(oldPath, newPath);
        }
        return res.json({ success: true, newSlug: safeNewSlug });
    } catch(e: any) {
        return res.status(500).json({ error: e.message });
    }
});

app.delete("/api/article/:slug", (req, res) => {
    let slug = req.params.slug.trim();
    if (!slug) return res.status(400).json({ error: "No slug" });
    const safeSlug = slug.replace(/[^а-яА-ЯёЁa-zA-Z0-9_\-\s.,!?()'"]/g, "").replace(/\s+/g, "_");
    const filePath = path.join(DATA_DIR, `${safeSlug}.md`);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return res.json({ success: true });
    }
    return res.status(404).json({ error: "Article not found" });
});

async function startServer() {
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*all', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
}

startServer();
