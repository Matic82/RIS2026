import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }
    api<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e.message || 'Verification failed');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <Loader2 className="w-12 h-12 mx-auto text-[#2E86C1] animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
          )}
          {status === 'error' && (
            <XCircle className="w-12 h-12 mx-auto text-red-500" />
          )}
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>{message || 'Verifying your email...'}</CardDescription>
        </CardHeader>
        {status !== 'loading' && (
          <CardContent className="text-center">
            <Link to="/member/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
