import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function Home() {
  const [recent, setRecent] = useState<{title: string, slug: string, mtime: number}[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchRecent = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recent?page=${p}&limit=20`);
      const data = await res.json();
      if (data.items) {
        setRecent(prev => p === 1 ? data.items : [...prev, ...data.items]);
        setHasMore(data.hasMore);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent(1);
  }, []);

  return (
    <div className="all-entries">
      <div className="all-entries-header">
        <h1>Добро пожаловать в Глюкопедию</h1>
        <p className="all-entries-subtitle">
          Энциклопедия вымышленных знаний, абсолютно бессмысленных бюрократических процедур, исторических казусов и забытых артефактов.
        </p>
      </div>
      
      <div className="all-entries-groups">
        <div className="all-entries-group">
          <h2 className="all-entries-letter">Недавние открытия</h2>
          <ul className="all-entries-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recent.map(r => (
              <li key={r.slug} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--rule)', paddingBottom: '0.25rem' }}>
                <Link to={`/${r.slug}`}>{r.title}</Link>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginLeft: '1rem', whiteSpace: 'nowrap' }}>
                  {new Date(r.mtime).toLocaleString('ru-RU')}
                </span>
              </li>
            ))}
            {recent.length === 0 && !loading && <li>Статей пока нет</li>}
          </ul>
          {loading && <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginTop: '1rem' }}>Загрузка...</p>}
          {hasMore && (
            <button 
              className="action-button" 
              style={{ marginTop: '1rem', width: '100%', padding: '0.5rem' }}
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchRecent(nextPage);
              }}
              disabled={loading}
            >
              Загрузить еще
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
