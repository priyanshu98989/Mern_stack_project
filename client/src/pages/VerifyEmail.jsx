import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import Card from '../components/ui/Card';

export default function VerifyEmail() {
  const { token } = useParams();
  const [state, setState] = useState(() =>
    token
      ? { status: 'loading', message: 'Verifying your email…' }
      : { status: 'error', message: 'Verification token is missing.' }
  );
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !token) return;
    ran.current = true;
    api
      .get(`/api/v1/auth/verify-email/${encodeURIComponent(token)}`)
      .then((res) =>
        setState({ status: 'success', message: res.data?.data?.message || 'Email verified.' })
      )
      .catch((err) =>
        setState({
          status: 'error',
          message: err.response?.data?.error?.message || 'Verification link is invalid or expired.',
        })
      );
  }, [token]);

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <h1 className="text-2xl font-bold mb-3">Email verification</h1>
        <p
          className={
            state.status === 'error'
              ? 'text-red-600'
              : state.status === 'success'
                ? 'text-green-600'
                : 'text-gray-500'
          }
        >
          {state.message}
        </p>
        <p className="mt-6 text-sm">
          <Link to="/login" className="text-brand-600">
            Go to sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
