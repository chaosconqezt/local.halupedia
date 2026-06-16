import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function Sidebar() {
  const [randomArticle, setRandomArticle] = useState<{slug: string, title?: string} | null>(null);

  useEffect(() => {
    fetch('/api/random').then(r => r.json()).then(data => {
       if (data.slug) setRandomArticle(data);
    }).catch(()=>{});
  }, []);

  return (
    <aside className="sidebar">
      <div className="sb-panel sb-featured">
        <h3 className="sb-heading" style={{ marginBottom: '0.5rem', color: 'var(--ink-soft)' }}>Статья дня</h3>
        {randomArticle ? (
          <Link to={`/${randomArticle.slug}`} className="sb-featured-title">
            {randomArticle.title || randomArticle.slug}
          </Link>
        ) : (
          <Link to="/Горный_Осьминог" className="sb-featured-title">Горный Осьминог</Link>
        )}
        <p className="sb-featured-blurb">
          Случайная статья из архивов Глюкопедии.
        </p>
      </div>
      <div className="sb-panel">
        <h3 className="sb-heading">В настоящий момент читают</h3>
        <div className="sb-fellow-readers sb-now-current">
          <span className="sb-fellow-dot"></span>
          <strong>1</strong> <Link to="/">посетитель</Link> обозревает эту энциклопедию.
        </div>
      </div>
    </aside>
  );
}
