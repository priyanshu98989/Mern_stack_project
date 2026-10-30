import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/auth';
import { useAuthStore } from '../store/authStore';
import Card from '../components/ui/Card';

export default function GoogleComplete() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    authApi
      .refresh()
      .then((res) => {
        if (!res?.data?.accessToken) throw new Error('No session');
        setAuth(res.data.user, res.data.accessToken);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => setError('Google sign-in could not be completed. Please try again.'));
  }, [navigate, setAuth]);

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <h1 className="text-2xl font-bold mb-3">Signing you in…</h1>
        {error ? (
          <>
            <p className="text-red-600 text-sm">{error}</p>
            <Link to="/login" className="text-brand-600 text-sm mt-4 inline-block">
              Back to sign in
            </Link>
          </>
        ) : (
          <p className="text-gray-500 text-sm">Finishing Google authentication.</p>
        )}
      </Card>
    </div>
  );
}
