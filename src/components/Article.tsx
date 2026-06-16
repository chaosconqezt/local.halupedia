import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useArticleStream } from '../hooks/useArticleStream';
import { AnimatedParagraph, AnimatedHeading, AnimatedListItem } from './DiffusionText';

import type { Components } from 'react-markdown';

const markdownComponents: Components = {
  p: ({ node, children, ...props }: any) => <AnimatedParagraph {...props}>{children}</AnimatedParagraph>,
  h1: ({ node, children, ...props }: any) => <AnimatedHeading level={1} {...props}>{children}</AnimatedHeading>,
  h2: ({ node, children, ...props }: any) => <AnimatedHeading level={2} {...props}>{children}</AnimatedHeading>,
  h3: ({ node, children, ...props }: any) => <AnimatedHeading level={3} {...props}>{children}</AnimatedHeading>,
  li: ({ node, children, ...props }: any) => <AnimatedListItem {...props}>{children}</AnimatedListItem>,
  a: ({ node, href, children, ...props }: any) => {
    if (href && href.startsWith('/')) {
       return <Link to={href} {...props}>{children}</Link>;
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
  }
};

export function Article() {
  const { slug } = useParams();
  const [data, setData] = useState<{ title: string; markdown: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const streamArticle = useArticleStream();

  useEffect(() => {
    let active = true;
    
    async function fetchArticle() {
      setLoading(true);
      setError('');
      try {
        setConfirmDelete(false);
        const queryParams = new URLSearchParams(location.search);
        const context = queryParams.get('context') || '';
        
        let url = `/api/article/${encodeURIComponent(slug || '')}`;
        if (context) {
          url += `?context=${encodeURIComponent(context)}`;
        }
        
        const res = await fetch(url);
        if (!res.ok) throw new Error("Не удалось загрузить статью.");
        
        if (res.headers.get("content-type")?.includes("text/event-stream")) {
          const reader = res.body?.getReader();
          if (!reader) throw new Error("Stream not supported");
          
          if (active) setLoading(false);
          const result = await streamArticle(reader, slug || '', (newData) => {
            if (active) setData({...newData});
          });
          if (active) setData({...result});
        } else {
          const json = await res.json();
          if (active) setData(json);
        }
      } catch (err: any) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchArticle();

    return () => { active = false; };
  }, [slug, location.search]);

  const handleRegenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams(location.search);
      const context = queryParams.get('context') || '';
      
      let url = `/api/article/${encodeURIComponent(slug || '')}?force=true`;
      if (context) {
        url += `&context=${encodeURIComponent(context)}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Не удалось перегенерировать статью.");
      
      if (res.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = res.body?.getReader();
        if (!reader) throw new Error("Stream not supported");
        
        setLoading(false);
        const result = await streamArticle(reader, slug || '', (newData) => {
          setData({...newData});
        });
        setData({...result});
      } else {
        const json = await res.json();
        setData(json);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/article/${encodeURIComponent(slug || '')}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Не удалось удалить статью.");
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="article"><p>Пишем статью о "{slug?.replace(/_/g, " ")}"... Это может занять несколько секунд.</p></div>;
  if (error) return <div className="article"><p className="admin-error">Ошибка: {error}</p></div>;
  if (!data) return null;

  let cleanedMarkdown = data.markdown || '';
  cleanedMarkdown = cleanedMarkdown.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, p1, p2) => {
    const link = '/' + p1.trim().replace(/\s+/g, "_");
    const display = (p2 || p1).trim();
    return `[${display}](${link})`;
  });

  cleanedMarkdown = cleanedMarkdown.replace(/\[([^\]]+)\]\((?!http|\/)([^)]+)\)/g, (match, text, link) => {
    const slug = '/' + link.trim().replace(/\s+/g, "_");
    return `[${text}](${slug})`;
  });

  cleanedMarkdown = cleanedMarkdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, link) => {
    return `[${text.replace(/_/g, ' ')}](${link})`;
  });
  
  cleanedMarkdown = cleanedMarkdown.replace(/^\s+/, '');
  cleanedMarkdown = cleanedMarkdown.replace(/^#\s+[^\n]+\n+/, '');

  const blocks = cleanedMarkdown.split(/\n{2,}/);
  cleanedMarkdown = blocks.map(block => {
    const plainTextContext = block
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_~`#]/g, '')
      .trim()
      .substring(0, 1000);
      
    const safeContext = encodeURIComponent(plainTextContext)
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
      
    return block.replace(/\[([^\]]+)\]\(\/([^?)]+)(?:\?.*?)?\)/g, (match, text, slug) => {
      return `[${text}](/${slug}?context=${safeContext})`;
    });
  }).join('\n\n');

  return (
    <div className="article">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>{data.title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem', alignItems: 'center' }}>
          <button 
            onClick={handleRegenerate} 
            className="action-button"
            title="Перегенерировать статью"
          >
            <RefreshCw size={18} />
          </button>
          
          {confirmDelete ? (
            <>
               <span style={{ fontSize: '0.75rem', color: 'var(--accent)', marginLeft: '0.5rem' }}>Удалить?</span>
               <button 
                onClick={handleDelete} 
                className="action-button action-button-danger"
                title="Да, удалить"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
              >
                Да
              </button>
              <button 
                onClick={() => setConfirmDelete(false)} 
                className="action-button"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
              >
                Нет
              </button>
            </>
          ) : (
             <button 
              onClick={() => setConfirmDelete(true)} 
              className="action-button action-button-danger"
              title="Удалить статью"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
      <div className="markdown-body">
        <Markdown 
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
        >
          {cleanedMarkdown}
        </Markdown>
      </div>
    </div>
  );
}
