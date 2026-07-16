import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { NotifProvider } from '../context/NotifContext';

const CandidatLayout = () => {
  return (
    <NotifProvider>
      <div style={{ background: '#f5f5f8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </NotifProvider>
  );
};

export default CandidatLayout;