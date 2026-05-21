'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
          router.push('/login');
          router.refresh();
        }
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  };

  // Inline CSS module styles for quick loading and styling isolated to navigation
  const navStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(11, 12, 22, 0.5)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '1rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'between',
    maxWidth: '100%',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  };

  const navContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '700px',
    margin: '0 auto',
  };

  const logoStyle = {
    fontSize: '1.4rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #fff 30%, var(--accent) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const linksContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  };

  const linkStyle = (active) => ({
    fontSize: '0.9rem',
    fontWeight: '500',
    color: active ? '#fff' : 'var(--text-secondary)',
    transition: 'var(--transition-smooth)',
    padding: '0.4rem 0.8rem',
    borderRadius: 'var(--border-radius-sm)',
    background: active ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
  });

  const logoutBtnStyle = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: 'var(--danger)',
    padding: '0.4rem 0.8rem',
    transition: 'var(--transition-smooth)',
  };

  return (
    <nav style={navStyle}>
      <div style={navContainerStyle}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="/logo/daymark_logo.png" 
            alt="Daymark" 
            style={{ height: '95px', width: 'auto', display: 'block' }} 
          />
        </Link>

        <div style={linksContainerStyle}>
          <Link href="/" style={linkStyle(pathname === '/')}>
            Dashboard
          </Link>
          
          <Link href="/settings" style={linkStyle(pathname === '/settings')}>
            Settings
          </Link>

          <button onClick={handleLogout} style={logoutBtnStyle}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
