import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api, ApiError } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Search, Gift, Check, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

type Reward = {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: string;
};

const rewardImages: Record<string, string> = {
  'Gift cards': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&h=200&fit=crop',
  Discounts: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=300&h=200&fit=crop',
  Experiences: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&h=200&fit=crop',
};

export function RewardsCatalog() {
  const { memberData, refreshMember } = useAuth();
  const { t, tCategory, language } = useLanguage();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('points-asc');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);

  useEffect(() => {
    api<Reward[]>(`/member/rewards?lang=${language}`)
      .then(setRewards)
      .catch(() => setRewards([]));
  }, [language]);

  if (!memberData) return null;

  const categories = ['all', ...new Set(rewards.map((r) => r.category).filter(Boolean))];

  let filteredRewards = rewards.filter((reward) => {
    const matchesSearch = reward.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || reward.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (sortBy === 'points-asc') {
    filteredRewards.sort((a, b) => a.pointsCost - b.pointsCost);
  } else if (sortBy === 'points-desc') {
    filteredRewards.sort((a, b) => b.pointsCost - a.pointsCost);
  }

  const handleRedeem = (reward: Reward) => {
    setSelectedReward(reward);
    setRedeemDialogOpen(true);
  };

  const confirmRedeem = async () => {
    if (!selectedReward) return;
    try {
      await api(`/member/rewards/${selectedReward.id}/redeem`, { method: 'POST' });
      await refreshMember();
      toast.success(t('member.rewards.redeemedSuccess'), {
        description: `You redeemed ${selectedReward.name} for ${selectedReward.pointsCost} points.`,
      });
      setRedeemDialogOpen(false);
      setSelectedReward(null);
      const updated = await api<Reward[]>(`/member/rewards?lang=${language}`);
      setRewards(updated);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('member.rewards.redeemFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('member.rewards.title')}</h1>
        <p className="text-gray-600 mt-1">
          {t('member.rewards.availablePoints')}{' '}
          <span className="font-semibold text-[#2E86C1]">{memberData.points}</span>{' '}
          {t('member.rewards.pointsAvailable')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t('common.search') + '...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {tCategory(cat)}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
            >
              <option value="points-asc">{t('member.rewards.sortLowHigh')}</option>
              <option value="points-desc">{t('member.rewards.sortHighLow')}</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRewards.map((reward) => {
              const canAfford = memberData.points >= reward.pointsCost;
              const rewardName = reward.name;
              const image = rewardImages[reward.category] || rewardImages['Gift cards'];

              return (
                <Card key={reward.id} className={`overflow-hidden ${!canAfford ? 'opacity-60' : ''}`}>
                  <div className="relative">
                    <img
                      src={image}
                      alt={rewardName}
                      className="w-full h-48 object-cover"
                    />
                    {!canAfford && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="danger">{t('member.rewards.notEnoughPoints')}</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-lg mb-1">{rewardName}</h3>
                    <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-[#2E86C1]">
                        <Gift className="w-4 h-4" />
                        <span className="font-bold">{reward.pointsCost}</span>
                        <span className="text-sm">{t('member.rewards.pointsRequired')}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canAfford}
                      className="w-full"
                      variant={canAfford ? 'primary' : 'outline'}
                    >
                      {t('member.rewards.redeem')}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredRewards.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {t('member.rewards.noRewards')}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog.Root open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-md z-50 shadow-xl">
            <Dialog.Title className="text-xl font-semibold mb-4">{t('member.rewards.confirmRedemption')}</Dialog.Title>
            {selectedReward && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedReward.name}</h3>
                  <p className="text-sm text-gray-600">{selectedReward.description}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('member.rewards.pointsDeducted')}:</span>
                    <span className="font-semibold text-[#2E86C1]">{selectedReward.pointsCost}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('member.rewards.remainingBalance')}:</span>
                    <span className="font-semibold">{memberData.points - selectedReward.pointsCost}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setRedeemDialogOpen(false)} className="flex-1">
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={confirmRedeem} className="flex-1">
                    {t('common.confirm')}
                  </Button>
                </div>
              </div>
            )}
            <Dialog.Close asChild>
              <button
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
