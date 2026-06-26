import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function Header() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const text = "Введите в меня...";
    let i = 0;
    let timer: any;
    const type = () => {
      if (searchInputRef.current) {
        searchInputRef.current.placeholder = text.slice(0, i);
      }
      i++;
      if (i <= text.length) {
        timer = setTimeout(type, 150);
      } else {
        timer = setTimeout(() => {
           if (searchInputRef.current) {
             searchInputRef.current.placeholder = text;
           }
        }, 3000); 
      }
    };
    type();
    
    return () => clearTimeout(timer);
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate('/' + search.trim().replace(/\s+/g, '_'));
      setSearch('');
    }
  };

  return (
    <header className="site-header">
      <Link to="/" className="brand">Глюкопедия</Link>
      <nav className="nav">
        <Link to="/">Главная</Link>
      </nav>
      <form className="header-search" onSubmit={onSearch}>
        <input 
          ref={searchInputRef}
          type="text" 
          className="header-search-input" 
          placeholder="Введите в меня..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Поиск статьи"
        />
        <button type="submit" className="header-search-submit">Искать</button>
      </form>
    </header>
  );
}
