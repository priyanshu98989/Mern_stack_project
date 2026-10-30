import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { authApi } from '../../services/auth';
import { toast } from 'react-hot-toast';

export default function Navbar() {
  const { user, clear } = useAuthStore();
  const { dark, setDark } = useApp();
  const navigate = useNavigate();
  const { data: notifData } = useQuery({
    queryKey: ['notifs-count'],
    queryFn: () => api.get('/api/v1/notifications?limit=1').then((r) => r.data),
    enabled: !!user,
    refetchInterval: 30000,
  });
  const unread = notifData?.data?.unreadCount || 0;
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    clear();
    toast.success('Logged out');
    navigate('/login');
  };
  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg text-brand-600">
          CertTrack
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/certificates">Certificates</Link>
              <Link to="/certificates/new">New Certificate</Link>
              <Link to="/notifications" className="relative">
                🔔
                {unread > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] rounded-full px-1">
                    {unread}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setDark(!dark)}
                className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
                aria-label="Toggle theme"
              >
                {dark ? '☀' : '☾'}
              </button>
              <span className="text-gray-600 dark:text-gray-300">
                {user.name} ({user.role})
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
              <button
                onClick={() => setDark(!dark)}
                className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
                aria-label="Toggle theme"
              >
                {dark ? '☀' : '☾'}
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
