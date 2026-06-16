import { Router } from "express";
import fs from "fs";
import path from "path";
import { getOpenAI, resolveModel, SYSTEM_PROMPT } from "./llm.js";
import { DATA_DIR, sanitizeSlug, getArticlePath } from "./utils.js";

const router = Router();

router.get("/api/recent", (req, res) => {
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

router.get("/api/random", (req, res) => {
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

router.get("/api/article/:slug", async (req, res) => {
    let slug = req.params.slug.trim();
    if (!slug) return res.status(400).json({ error: "No slug" });

    const safeSlug = sanitizeSlug(slug);
    const filePath = getArticlePath(safeSlug);
    const force = req.query.force === "true";

    if (fs.existsSync(filePath) && !force) {
        const markdown = fs.readFileSync(filePath, "utf-8");
        return res.json({ title: safeSlug.replace(/_/g, " "), markdown });
    }

    const context = req.query.context ? String(req.query.context) : "";

    try {
        let userPrompt = `Напиши статью энциклопедии для следующего заголовка: "${safeSlug.replace(/_/g, " ")}".`;
        if (context) {
            userPrompt += `\nКонтекст упоминания откуда мы пришли: "${context}" (Статья должна логически соответствовать этому упоминанию).`;
        }

        const model = await resolveModel();
        const stream = await getOpenAI().chat.completions.create({
            model,
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

        fs.writeFileSync(filePath, fullMarkdown, "utf-8");
        res.write(`data: [DONE]\n\n`);
        return res.end();
    } catch (e: any) {
        console.error("LLM Error:", e);
        return res.status(500).json({ error: e.message || "Failed to generate article" });
    }
});

router.delete("/api/article/:slug", (req, res) => {
    let slug = req.params.slug.trim();
    if (!slug) return res.status(400).json({ error: "No slug" });
    const safeSlug = sanitizeSlug(slug);
    const filePath = getArticlePath(safeSlug);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return res.json({ success: true });
    }
    return res.status(404).json({ error: "Article not found" });
});

export default router;
