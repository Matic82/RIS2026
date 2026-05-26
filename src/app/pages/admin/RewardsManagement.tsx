import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { api, ApiError } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

type Reward = {
  id: number;
  nameEn: string;
  nameSl: string;
  descriptionEn: string;
  descriptionSl: string;
  points: number;
  category: string;
  categoryId?: number;
  stock: number;
  active: boolean;
};

type ApiRewardRow = {
  ID_NAGRADE: number;
  ID_KATEGORIJE?: number | null;
  NAZIV_SL: string;
  NAZIV_EN: string;
  OPIS_SL?: string | null;
  OPIS_EN?: string | null;
  VREDNOST_V_TOCKAH: number;
  ZALOGA: number;
  AKTIVNA: string;
  KATEGORIJA?: string | null;
};

function mapRewardRow(row: ApiRewardRow): Reward {
  return {
    id: row.ID_NAGRADE,
    nameEn: row.NAZIV_EN,
    nameSl: row.NAZIV_SL,
    descriptionEn: row.OPIS_EN ?? '',
    descriptionSl: row.OPIS_SL ?? '',
    points: row.VREDNOST_V_TOCKAH,
    category: row.KATEGORIJA ?? '',
    categoryId: row.ID_KATEGORIJE ?? undefined,
    stock: row.ZALOGA,
    active: row.AKTIVNA === 'Y',
  };
}

function toApiBody(formData: {
  nameEn: string;
  nameSl: string;
  descriptionEn: string;
  descriptionSl: string;
  points: number;
  stock: number;
  active: boolean;
}, categoryId?: number) {
  return {
    nameEn: formData.nameEn,
    nameSl: formData.nameSl,
    descriptionEn: formData.descriptionEn || undefined,
    descriptionSl: formData.descriptionSl || undefined,
    pointsCost: formData.points,
    stock: formData.stock,
    active: formData.active,
    ...(categoryId !== undefined ? { categoryId } : {}),
  };
}

export function RewardsManagement() {
  const { t, language } = useLanguage();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);
  const [formData, setFormData] = useState({
    nameEn: '',
    nameSl: '',
    descriptionEn: '',
    descriptionSl: '',
    points: 0,
    category: '',
    stock: 0,
    active: true,
  });

  const loadRewards = useCallback(() => {
    setLoading(true);
    api<ApiRewardRow[]>('/admin/rewards')
      .then((rows) => setRewards(rows.map(mapRewardRow)))
      .catch(() => {
        toast.error('Failed to load rewards');
        setRewards([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  const handleAddNew = () => {
    setEditingReward(null);
    setFormData({
      nameEn: '',
      nameSl: '',
      descriptionEn: '',
      descriptionSl: '',
      points: 0,
      category: '',
      stock: 0,
      active: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      nameEn: reward.nameEn,
      nameSl: reward.nameSl,
      descriptionEn: reward.descriptionEn,
      descriptionSl: reward.descriptionSl,
      points: reward.points,
      category: reward.category,
      stock: reward.stock,
      active: reward.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nameEn.trim() || !formData.nameSl.trim() || formData.points <= 0) {
      toast.error('Name (EN/SL) and a positive points value are required');
      return;
    }

    setSaving(true);
    try {
      const body = toApiBody(formData, editingReward?.categoryId);
      if (editingReward) {
        await api(`/admin/rewards/${editingReward.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        toast.success('Reward updated successfully');
      } else {
        await api('/admin/rewards', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        toast.success('Reward added successfully');
      }
      setDialogOpen(false);
      loadRewards();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to save reward');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!rewardToDelete) return;

    setSaving(true);
    try {
      await api(`/admin/rewards/${rewardToDelete.id}`, { method: 'DELETE' });
      toast.success('Reward deleted successfully');
      setDeleteDialogOpen(false);
      setRewardToDelete(null);
      loadRewards();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to delete reward');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (reward: Reward) => {
    const nextActive = !reward.active;
    setRewards(rewards.map((r) => (r.id === reward.id ? { ...r, active: nextActive } : r)));
    try {
      await api(`/admin/rewards/${reward.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: nextActive }),
      });
      loadRewards();
    } catch (e) {
      setRewards(rewards.map((r) => (r.id === reward.id ? { ...r, active: reward.active } : r)));
      toast.error(e instanceof ApiError ? e.message : 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.rewards.title')}</h1>
          <p className="text-gray-600 mt-1">{t('admin.rewards.subtitle')}</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4" />
          {t('admin.rewards.addNew')}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t('admin.rewards.name')}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t('admin.rewards.category')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('admin.rewards.pointsCost')}</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    {t('admin.rewards.stock')}
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && rewards.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-gray-500">
                      No rewards yet
                    </td>
                  </tr>
                )}
                {!loading &&
                  rewards.map((reward) => (
                  <tr key={reward.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 font-mono text-sm">{reward.id}</td>
                    <td className="py-4 px-4 font-medium">{language === 'sl' ? reward.nameSl : reward.nameEn}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{reward.category}</td>
                    <td className="py-4 px-4 text-right font-semibold">{reward.points}</td>
                    <td className="py-4 px-4 text-center">{reward.stock}</td>
                    <td className="py-4 px-4 text-center">
                      <Switch.Root
                        checked={reward.active}
                        onCheckedChange={() => handleToggleActive(reward)}
                        className="w-11 h-6 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#2E86C1] transition-colors"
                      >
                        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                      </Switch.Root>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(reward)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRewardToDelete(reward);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50 shadow-xl">
            <Dialog.Title className="text-2xl font-semibold mb-6">
              {editingReward ? 'Edit Reward' : 'Add New Reward'}
            </Dialog.Title>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nameEn">Reward Name (EN)</Label>
                  <Input
                    id="nameEn"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameSl">Reward Name (SL)</Label>
                  <Input
                    id="nameSl"
                    value={formData.nameSl}
                    onChange={(e) => setFormData({ ...formData, nameSl: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="descEn">Description (EN)</Label>
                  <textarea
                    id="descEn"
                    value={formData.descriptionEn}
                    onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descSl">Description (SL)</Label>
                  <textarea
                    id="descSl"
                    value={formData.descriptionSl}
                    onChange={(e) => setFormData({ ...formData, descriptionSl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="points">Points Required</Label>
                  <Input
                    id="points"
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch.Root
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  className="w-11 h-6 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#2E86C1] transition-colors"
                >
                  <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                </Switch.Root>
                <Label>Active</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSave} className="flex-1" disabled={saving}>
                  {saving ? 'Saving...' : t('common.save')}
                </Button>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="absolute top-6 right-6 p-1 rounded-lg hover:bg-gray-100" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-md z-50 shadow-xl">
            <Dialog.Title className="text-xl font-semibold mb-4">Confirm Deletion</Dialog.Title>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this reward? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={handleDelete} className="flex-1" disabled={saving}>
                {saving ? 'Deleting...' : t('common.delete')}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
