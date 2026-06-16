import OpenAI from "openai";

let _openai: OpenAI | null = null;
export function getOpenAI(): OpenAI {
    if (!_openai) {
        _openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || "sk-fake-key",
            baseURL: process.env.OPENAI_BASE_URL || undefined,
        });
    }
    return _openai;
}

let _resolvedModel: string | null = null;

export async function resolveModel(): Promise<string> {
    if (_resolvedModel) return _resolvedModel;
    if (process.env.LLM_MODEL) {
        _resolvedModel = process.env.LLM_MODEL;
        return _resolvedModel;
    }
    try {
        const res = await getOpenAI().models.list();
        const first = res.data?.[0]?.id;
        if (first) {
            console.log(`Auto-detected model: ${first}`);
            _resolvedModel = first;
            return _resolvedModel;
        }
    } catch (e: any) {
        console.warn("Failed to auto-detect model:", e.message);
    }
    _resolvedModel = "local-model";
    return _resolvedModel;
}

export const SYSTEM_PROMPT = `Ты автор-составитель вымышленной, абсурдной, но предельно серьёзной энциклопедии.
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
