import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api, ApiError } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertCircle, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function MemberProfile() {
  const { memberData, refreshMember, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(memberData?.firstName ?? '');
  const [lastName, setLastName] = useState(memberData?.lastName ?? '');
  const [address, setAddress] = useState(memberData?.address ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (memberData) {
      setFirstName(memberData.firstName);
      setLastName(memberData.lastName);
      setAddress(memberData.address);
    }
  }, [memberData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api('/member/me/profile', {
        method: 'PUT',
        body: JSON.stringify({ firstName, lastName, address }),
      });
      await refreshMember();
      toast.success(t('member.profile.saved'));
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : t('member.profile.saveFailed');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api('/member/me/account', { method: 'DELETE' });
      setDeleteDialogOpen(false);
      logout('member');
      navigate('/');
      toast.success(t('member.profile.deleted'));
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : t('member.profile.deleteFailed');
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  if (!memberData) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('member.profile.title')}</h1>
        <p className="text-gray-600 mt-1">{t('member.profile.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('member.profile.personalInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4 max-w-lg">
            {error && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input id="email" type="email" value={memberData.email} disabled className="mt-1 bg-gray-50" />
              <p className="text-xs text-gray-500 mt-1">{t('member.profile.emailReadonly')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">{t('member.register.firstName')}</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">{t('member.register.lastName')}</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">{t('member.register.address')}</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">{t('member.profile.dangerZone')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">{t('member.profile.deleteWarning')}</p>
          <Button variant="danger" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="w-4 h-4" />
            {t('member.profile.deleteAccount')}
          </Button>
        </CardContent>
      </Card>

      <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-md z-50 shadow-xl">
            <Dialog.Title className="text-xl font-semibold mb-2">{t('member.profile.confirmDelete')}</Dialog.Title>
            <p className="text-gray-600 mb-6">{t('member.profile.confirmDeleteText')}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={handleDeleteAccount} disabled={deleting} className="flex-1">
                {deleting ? t('common.loading') : t('member.profile.deleteAccount')}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
