import { Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Home } from './components/Home';
import { Article } from './components/Article';

export function App() {
  return (
    <div className="site">
      <Header />
      <main className="layout">
        <div className="layout-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/:slug" element={<Article />} />
          </Routes>
        </div>
        <Sidebar />
      </main>
    </div>
  );
}
