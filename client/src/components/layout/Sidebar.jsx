import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const links = [
  { to: '/dashboard', label: 'Dashboard', roles: ['student', 'faculty', 'hod', 'admin'] },
  { to: '/certificates', label: 'Certificates', roles: ['student', 'faculty', 'hod', 'admin'] },
  { to: '/certificates/new', label: 'New Certificate', roles: ['student'] },
  { to: '/credits', label: 'Credits', roles: ['student'] },
  { to: '/faculty/queue', label: 'Verification Queue', roles: ['faculty', 'hod', 'admin'] },
  { to: '/leaderboard', label: 'Leaderboard', roles: ['student', 'faculty', 'hod', 'admin'] },
  { to: '/notifications', label: 'Notifications', roles: ['student', 'faculty', 'hod', 'admin'] },
  { to: '/profile', label: 'Profile & Settings', roles: ['student', 'faculty', 'hod', 'admin'] },
  { to: '/admin', label: 'Admin Console', roles: ['admin'] },
  { to: '/verify', label: 'Verify Credential', roles: ['student', 'faculty', 'hod', 'admin'] },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'student';
  return (
    <aside className="w-56 shrink-0 hidden md:block">
      <nav className="card space-y-1 text-sm">
        {links
          .filter((l) => l.roles.includes(role))
          .map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="block px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {l.label}
            </Link>
          ))}
      </nav>
    </aside>
  );
}
