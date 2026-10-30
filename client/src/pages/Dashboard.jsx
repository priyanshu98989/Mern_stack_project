import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

function StaffDashboard({ user }) {
  const links =
    user?.role === 'admin'
      ? [
          {
            to: '/admin',
            label: 'Admin console',
            hint: 'Manage users, departments, settings and imports',
          },
          {
            to: '/faculty/queue',
            label: 'Verification queue',
            hint: 'Review submitted certificates',
          },
          { to: '/leaderboard', label: 'Leaderboard', hint: 'See top-performing students' },
        ]
      : [
          {
            to: '/faculty/queue',
            label: 'Verification queue',
            hint: 'Review submitted certificates',
          },
          { to: '/certificates', label: 'Certificates', hint: 'Browse certificates in your scope' },
          { to: '/leaderboard', label: 'Leaderboard', hint: 'See top-performing students' },
        ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="card hover:border-brand-400 border border-transparent transition"
        >
          <h2 className="font-semibold mb-1">{link.label}</h2>
          <p className="text-sm text-gray-500">{link.hint}</p>
        </Link>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === 'student';
  const { data } = useQuery({
    queryKey: ['analytics', 'student', user?.id],
    queryFn: () => api.get('/api/v1/analytics/student/me').then((r) => r.data),
    enabled: !!user && isStudent,
  });
  const d = data?.data;
  const COLORS = ['#4f46e5', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'];
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-6">
        Welcome, {user?.name}. Role: {user?.role}
      </p>
      {!isStudent && <StaffDashboard user={user} />}
      {isStudent && d && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card">
              <p className="text-sm text-gray-500">Credits earned</p>
              <p className="text-3xl font-bold">{d.progress.earned}</p>
              <p className="text-xs text-gray-400">
                of {d.progress.required} required ({d.progress.percent}%)
              </p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Certificates</p>
              <p className="text-3xl font-bold">
                {d.platformSplit.reduce((a, b) => a + b.count, 0)}
              </p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Skills tracked</p>
              <p className="text-3xl font-bold">{d.skills.length}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="font-semibold mb-2">Platform split</h2>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={d.platformSplit} dataKey="count" nameKey="name" outerRadius={90}>
                    {d.platformSplit.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h2 className="font-semibold mb-2">Skills</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={d.skills}>
                  <XAxis dataKey="skill" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
