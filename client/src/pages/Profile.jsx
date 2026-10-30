import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/auth';
import { toast } from 'react-hot-toast';
import Card from '../components/ui/Card';

const pwSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Use at least 8 characters'),
});

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['me'], queryFn: authApi.me });
  const me = data?.data?.user || user;
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: authApi.sessions,
    enabled: !!me,
  });
  const sessions = sessionsData?.data?.items || [];
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ resolver: zodResolver(pwSchema) });

  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [setupResult, setSetupResult] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const changePw = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success('Password updated. Please sign in again.');
      reset();
      clear();
      navigate('/login');
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed'),
  });

  const resend = useMutation({
    mutationFn: () => authApi.resendVerification(me.email),
    onSuccess: () => toast.success('Verification email sent (check server logs in development)'),
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed'),
  });

  const setup2fa = useMutation({
    mutationFn: () => authApi.setupTwoFactor(twoFactorPassword),
    onSuccess: (res) => {
      setSetupResult(res.data);
      setTwoFactorPassword('');
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed'),
  });

  const enable2fa = useMutation({
    mutationFn: () => authApi.enableTwoFactor(setupResult.secret, twoFactorCode),
    onSuccess: () => {
      toast.success('Two-factor authentication enabled. Please sign in again.');
      setSetupResult(null);
      setTwoFactorCode('');
      clear();
      navigate('/login');
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed'),
  });

  const disable2fa = useMutation({
    mutationFn: () => authApi.disableTwoFactor(disableCode),
    onSuccess: () => {
      toast.success('Two-factor authentication disabled');
      setDisableCode('');
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed'),
  });

  const revokeSession = useMutation({
    mutationFn: (id) => authApi.revokeSession(id),
    onSuccess: () => {
      toast.success('Session revoked');
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed'),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Profile & Settings</h1>
      <Card title="Account">
        <p>
          <b>Name:</b> {me?.name}
        </p>
        <p>
          <b>Email:</b> {me?.email}
        </p>
        <p>
          <b>Role:</b> {me?.role}
        </p>
        <p>
          <b>Department:</b> {me?.department || '-'}
        </p>
        <p>
          <b>Email verified:</b> {me?.emailVerified ? 'Yes' : 'No'}
          {!me?.emailVerified && (
            <button
              className="ml-2 text-brand-600 text-sm"
              disabled={resend.isPending}
              onClick={() => resend.mutate()}
            >
              {resend.isPending ? 'Sending…' : 'Resend verification'}
            </button>
          )}
        </p>
      </Card>

      <Card title="Change password">
        <form onSubmit={handleSubmit((d) => changePw.mutate(d))} className="space-y-3">
          <div>
            <label className="label">Current password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p className="text-red-500 text-sm">{errors.currentPassword.message}</p>
            )}
          </div>
          <div>
            <label className="label">New password</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p className="text-red-500 text-sm">{errors.newPassword.message}</p>
            )}
          </div>
          <button disabled={isSubmitting || changePw.isPending} className="btn-primary">
            {changePw.isPending ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </Card>

      <Card title="Two-factor authentication">
        {me?.twoFactorEnabled ? (
          <div className="space-y-3">
            <p className="text-sm text-green-600">Two-factor authentication is enabled.</p>
            <div>
              <label className="label">Authenticator code to disable</label>
              <input
                className="input"
                inputMode="numeric"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
              />
            </div>
            <button
              className="btn-primary bg-red-600 hover:bg-red-700"
              disabled={disable2fa.isPending || disableCode.trim().length < 6}
              onClick={() => disable2fa.mutate()}
            >
              {disable2fa.isPending ? 'Disabling…' : 'Disable 2FA'}
            </button>
          </div>
        ) : setupResult ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Add this secret to your authenticator app, then enter the 6-digit code.
            </p>
            <code className="block p-2 rounded bg-gray-100 dark:bg-gray-800 text-xs break-all">
              {setupResult.secret}
            </code>
            <a href={setupResult.otpauth} className="text-brand-600 text-xs break-all">
              Open in authenticator app
            </a>
            <div>
              <label className="label">Authenticator code</label>
              <input
                className="input"
                inputMode="numeric"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
              />
            </div>
            <button
              className="btn-primary"
              disabled={enable2fa.isPending || twoFactorCode.trim().length < 6}
              onClick={() => enable2fa.mutate()}
            >
              {enable2fa.isPending ? 'Enabling…' : 'Enable 2FA'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Protect your account with an authenticator app.
            </p>
            <div>
              <label className="label">Current password</label>
              <input
                className="input"
                type="password"
                value={twoFactorPassword}
                onChange={(e) => setTwoFactorPassword(e.target.value)}
              />
            </div>
            <button
              className="btn-primary"
              disabled={setup2fa.isPending || !twoFactorPassword}
              onClick={() => setup2fa.mutate()}
            >
              {setup2fa.isPending ? 'Preparing…' : 'Set up 2FA'}
            </button>
          </div>
        )}
      </Card>

      <Card title="Active sessions">
        {sessions.length === 0 && <p className="text-sm text-gray-500">No active sessions.</p>}
        <ul className="space-y-2 text-sm">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 p-2 rounded bg-gray-50 dark:bg-gray-800"
            >
              <div>
                <p className="font-medium">{s.device || 'Unknown device'}</p>
                <p className="text-xs text-gray-500">
                  {s.ip || 'unknown IP'} · last active{' '}
                  {s.lastActive ? new Date(s.lastActive).toLocaleString() : '-'}
                </p>
              </div>
              <button className="text-red-600 text-xs" onClick={() => revokeSession.mutate(s.id)}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
