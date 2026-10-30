import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../services/auth';
import { toast } from 'react-hot-toast';

const schema = z.object({ email: z.string().email() });

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }) => {
    try {
      await authApi.forgot(email);
      setSent(true);
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Could not send reset email');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 card">
      <h1 className="text-2xl font-bold mb-2">Forgot password</h1>
      <p className="text-sm text-gray-500 mb-6">
        Enter your account email and we will send a password reset link if the account exists.
      </p>
      {sent ? (
        <p className="text-green-600 text-sm">
          If the email exists, a reset link has been sent. Check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
          </div>
          <button disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="mt-4 text-sm text-gray-500">
        <Link to="/login" className="text-brand-600">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
