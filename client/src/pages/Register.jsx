import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/auth';
import { toast } from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  department: z.string().optional(),
  batch: z.string().optional(),
});

export default function Register() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await authApi.register(data);
      toast.success('Registered. Please verify email.');
      // auto-login
      const login = await authApi.login({ email: data.email, password: data.password });
      setAuth(login.data.user, login.data.accessToken);
      navigate('/dashboard');
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 card">
      <h1 className="text-2xl font-bold mb-6">Register</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" {...register('name')} />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" {...register('email')} />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" {...register('password')} />
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        </div>
        <div>
          <label className="label">Department</label>
          <input className="input" {...register('department')} />
        </div>
        <div>
          <label className="label">Batch</label>
          <input className="input" {...register('batch')} />
        </div>
        <button disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Creating...' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        Have account?{' '}
        <Link to="/login" className="text-brand-600">
          Login
        </Link>
      </p>
    </div>
  );
}
