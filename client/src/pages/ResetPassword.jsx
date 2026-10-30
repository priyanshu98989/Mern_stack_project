import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { authApi } from '../services/auth';
import { toast } from 'react-hot-toast';

const schema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ password }) => {
    try {
      await authApi.reset(token, password);
      toast.success('Password reset. Please sign in.');
      navigate('/login', { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Could not reset password');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 card">
      <h1 className="text-2xl font-bold mb-6">Choose a new password</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">New password</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            {...register('confirm')}
          />
          {errors.confirm && <p className="text-red-500 text-sm">{errors.confirm.message}</p>}
        </div>
        <button disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        <Link to="/login" className="text-brand-600">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
