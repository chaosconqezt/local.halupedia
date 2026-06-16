import { useCallback } from 'react';

interface ArticleData {
  title: string;
  markdown: string;
}

export function useArticleStream() {
  const streamArticle = useCallback(async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    slug: string,
    onUpdate: (data: ArticleData) => void
  ): Promise<ArticleData> => {
    const decoder = new TextDecoder();
    let done = false;
    let buffer = "";
    let fullMarkup = "";
    let currentTitle = slug.replace(/_/g, " ");
    let result: ArticleData = { title: currentTitle, markdown: "" };
    let pendingBuffer = "";

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const message = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          if (message.startsWith('data: ')) {
            const dataStr = message.substring(6);
            if (dataStr === '[DONE]') { done = true; break; }
            try {
              const parsed = JSON.parse(dataStr);
              let updated = false;
              if (parsed.title) { currentTitle = parsed.title; updated = true; }
              if (parsed.text) {
                pendingBuffer += parsed.text;
                // matching sentence boundaries or newlines
                const match = pendingBuffer.match(/([.!?])\s+|\n/);
                if (match) {
                  const boundaryIndex = match.index! + match[0].length;
                  fullMarkup += pendingBuffer.slice(0, boundaryIndex);
                  pendingBuffer = pendingBuffer.slice(boundaryIndex);
                  updated = true;
                }
              }
              if (parsed.markdown !== undefined) { 
                fullMarkup = parsed.markdown; 
                pendingBuffer = "";
                updated = true; 
              }
              if (updated) {
                result = { title: currentTitle, markdown: fullMarkup };
                onUpdate(result);
              }
            } catch(e) {}
          }
          boundary = buffer.indexOf('\n\n');
        }
      }
    }

    if (pendingBuffer) {
      fullMarkup += pendingBuffer;
      result = { title: currentTitle, markdown: fullMarkup };
      onUpdate(result);
    }
    return result;
  }, []);

  return streamArticle;
}
