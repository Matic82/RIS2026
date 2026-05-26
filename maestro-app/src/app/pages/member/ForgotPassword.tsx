import { useState } from 'react';
import { Link } from 'react-router';
import { useLanguage } from '../../context/LanguageContext';
import { api, ApiError } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function ForgotPassword() {
  const { t, tApiError } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
      setEmail('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset link';
      const code = err instanceof ApiError ? err.code : undefined;
      setError(tApiError(message, code));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('member.forgotPassword.checkEmail')}
              </h2>
              <p className="text-gray-600 mb-6">
                {t('member.forgotPassword.sentMessage')}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {t('member.forgotPassword.expiresIn')}
              </p>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link to="/member/login">{t('member.forgotPassword.backToLogin')}</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/">{t('member.forgotPassword.backToHome')}</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('member.forgotPassword.title')}</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            {t('member.forgotPassword.subtitle')}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('common.email')}
              </label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email}
            >
              {loading ? t('common.loading') : t('member.forgotPassword.sendLink')}
            </Button>

            <p className="text-center text-sm text-gray-600">
              {t('member.forgotPassword.rememberPassword')}{' '}
              <a href="/member/login" className="text-blue-600 hover:underline font-medium">
                {t('common.signIn')}
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
