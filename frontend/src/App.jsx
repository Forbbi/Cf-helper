import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider } from './context/AppContext';
import { ProblemsProvider } from './context/ProblemsContext';
import Navbar from './components/Navbar';
import ProblemsPage from './pages/ProblemsPage';
import BookmarksPage from './pages/BookmarksPage';
import SubmissionsPage from './pages/SubmissionsPage';
import './App.css';

const pageVariants = {
    initial: { opacity: 0, y: 10, filter: 'blur(4px)' },
    in: { opacity: 1, y: 0, filter: 'blur(0px)' },
    out: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4
};

export default function App() {
    const [activePage, setActivePage] = useState('problems');

    return (
        <AppProvider>
            <ProblemsProvider>
                <div className="app">
                    <div className="bg-mesh">
                        <div className="mesh-orb orb-1"></div>
                        <div className="mesh-orb orb-2"></div>
                        <div className="mesh-orb orb-3"></div>
                    </div>
                    <Navbar activePage={activePage} onNavigate={setActivePage} />
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activePage}
                            className="app-content"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={pageVariants}
                            transition={pageTransition}
                        >
                            {activePage === 'problems' && <ProblemsPage />}
                            {activePage === 'bookmarks' && <BookmarksPage />}
                            {activePage === 'submissions' && <SubmissionsPage />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </ProblemsProvider>
        </AppProvider>
    );
}
