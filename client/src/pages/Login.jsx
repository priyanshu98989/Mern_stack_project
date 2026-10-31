import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/auth';
import { API_URL } from '../lib/api';
import { toast } from 'react-hot-toast';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorToken: z.string().optional(),
});

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });
  const setAuth = useAuthStore((s) => s.setAuth);
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const res = await authApi.login(data);
      setAuth(res.data.user, res.data.accessToken);
      toast.success('Welcome back');
      navigate('/dashboard');
    } catch (e) {
      const code = e.response?.data?.error?.code;
      if (code === 'TWO_FACTOR_REQUIRED' || code === 'INVALID_2FA') {
        setNeedsTwoFactor(true);
        toast.error(
          code === 'INVALID_2FA' ? 'Invalid authenticator code' : 'Enter your authenticator code'
        );
        return;
      }
      toast.error(e.response?.data?.error?.message || 'Login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 card">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        </div>
        {needsTwoFactor && (
          <div>
            <label className="label">Authenticator code</label>
            <input
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              {...register('twoFactorToken')}
            />
          </div>
        )}
        <button disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      {/* Google login disabled until OAuth credentials are configured */}
{/* <a
        href={`${API_URL}/api/v1/auth/google`}
        className="mt-3 block text-center rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm"
      >
        Continue with Google
      </a> */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <Link to="/forgot-password" className="text-brand-600">
          Forgot password?
        </Link>
        <p>
          No account?{' '}
          <Link to="/register" className="text-brand-600">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
