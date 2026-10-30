import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuthStore } from './store/authStore';
import { authApi } from './services/auth';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Verify = lazy(() => import('./pages/Verify'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const GoogleComplete = lazy(() => import('./pages/GoogleComplete'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Certificates = lazy(() => import('./pages/Certificates'));
const CertificateNew = lazy(() => import('./pages/CertificateNew'));
const CertificateEdit = lazy(() => import('./pages/CertificateEdit'));
const CertificateDetail = lazy(() => import('./pages/CertificateDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Admin = lazy(() => import('./pages/Admin'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const FacultyQueue = lazy(() => import('./pages/FacultyQueue'));
const Credits = lazy(() => import('./pages/Credits'));
const NotFound = lazy(() => import('./pages/NotFound'));

const TITLES = {
  '/': 'CertTrack — Certification Tracker',
  '/login': 'Sign in · CertTrack',
  '/register': 'Create account · CertTrack',
  '/verify': 'Verify a credential · CertTrack',
  '/forgot-password': 'Forgot password · CertTrack',
  '/dashboard': 'Dashboard · CertTrack',
  '/certificates': 'Certificates · CertTrack',
  '/certificates/new': 'New certificate · CertTrack',
  '/profile': 'Profile & settings · CertTrack',
  '/notifications': 'Notifications · CertTrack',
  '/leaderboard': 'Leaderboard · CertTrack',
  '/credits': 'Credits · CertTrack',
  '/admin': 'Admin console · CertTrack',
  '/faculty/queue': 'Verification queue · CertTrack',
};

function titleFor(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/certificates/')) return 'Certificate · CertTrack';
  if (pathname.startsWith('/verify/')) return 'Verify a credential · CertTrack';
  return 'CertTrack';
}

export default function App() {
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const clear = useAuthStore((s) => s.clear);
  const setReady = useAuthStore((s) => s.setReady);

  useEffect(() => {
    document.title = titleFor(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    authApi
      .refresh()
      .then((r) => {
        if (r?.data?.accessToken) setAuth(r.data.user, r.data.accessToken);
        else setReady(true);
      })
      .catch(() => {
        clear();
      });
  }, [setAuth, clear, setReady]);

  useEffect(() => {
    const onLogout = () => clear();
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [clear]);

  return (
    <Layout>
      <ErrorBoundary>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/verify/:id" element={<Verify />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/verify-email/:token" element={<VerifyEmail />} />
                <Route path="/auth/google/complete" element={<GoogleComplete />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/certificates" element={<Certificates />} />
                  <Route path="/certificates/new" element={<CertificateNew />} />
                  <Route path="/certificates/:id" element={<CertificateDetail />} />
                  <Route path="/certificates/:id/edit" element={<CertificateEdit />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/faculty/queue" element={<FacultyQueue />} />
                  <Route path="/credits" element={<Credits />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </ErrorBoundary>
    </Layout>
  );
}
