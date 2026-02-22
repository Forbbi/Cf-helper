import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import ProblemsPage from './pages/ProblemsPage';
import BookmarksPage from './pages/BookmarksPage';
import SubmissionsPage from './pages/SubmissionsPage';
import './App.css';

export default function App() {
    const [activePage, setActivePage] = useState('problems');

    return (
        <AppProvider>
            <div className="app">
                <Navbar activePage={activePage} onNavigate={setActivePage} />
                <div className="app-content">
                    {activePage === 'problems' && <ProblemsPage />}
                    {activePage === 'bookmarks' && <BookmarksPage />}
                    {activePage === 'submissions' && <SubmissionsPage />}
                </div>
            </div>
        </AppProvider>
    );
}
