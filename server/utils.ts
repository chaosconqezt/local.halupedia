import path from "path";
import fs from "fs";

export const DATA_DIR = path.join(process.cwd(), "data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

export function sanitizeSlug(slug: string): string {
    return slug
        .replace(/[^а-яА-ЯёЁa-zA-Z0-9_\-\s.,!?()'"]/g, "")
        .replace(/\s+/g, "_");
}

export function getArticlePath(safeSlug: string): string {
    return path.join(DATA_DIR, `${safeSlug}.md`);
}
