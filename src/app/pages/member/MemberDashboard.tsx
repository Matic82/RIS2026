import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router';
import { TrendingUp, Gift, CreditCard, ArrowRight } from 'lucide-react';
import * as Progress from '@radix-ui/react-progress';

type PurchaseRow = { period: string; amount: number };

export function MemberDashboard() {
  const { memberData, refreshMember } = useAuth();
  const { t, tTier } = useLanguage();
  const [recentPurchases, setRecentPurchases] = useState<PurchaseRow[]>([]);

  useEffect(() => {
    refreshMember();
    api<PurchaseRow[]>('/member/purchases')
      .then((rows) => setRecentPurchases(rows.slice(0, 3)))
      .catch(() => setRecentPurchases([]));
  }, [refreshMember]);

  if (!memberData) return null;

  const tierVariant = memberData.tier.toLowerCase() as 'basic' | 'bronze' | 'silver' | 'gold';

  const tierThresholds: Record<string, { next: string | null }> = {
    Bronze: { next: 'Silver' },
    Silver: { next: 'Gold' },
    Gold: { next: null },
  };

  const currentTierData = tierThresholds[memberData.tier];
  const progress = currentTierData?.next ? ((memberData.points / 5000) * 100) : 100;
  const pointsToNext = currentTierData?.next ? (5000 - memberData.points) : 0;
  const nextTierLabel = currentTierData?.next ? tTier(currentTierData.next) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('member.dashboard.title')}</h1>
        <p className="text-gray-600 mt-1">
          {t('member.dashboard.welcome')}, {memberData.firstName}!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-gradient-to-br from-[#2E86C1] to-[#1a5f8f] text-white border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t('member.dashboard.status')}
              </CardTitle>
              <Badge variant={tierVariant} className="text-lg px-4 py-1">
                {tTier(memberData.tier)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-5xl font-bold">{memberData.points.toLocaleString()}</div>
              <div className="text-blue-100">{t('member.dashboard.currentPoints')}</div>
            </div>

            {/* Removed points-to-next-tier display as requested */}

            <div className="flex gap-3 pt-2">
              <Link to="/member/rewards" className="flex-1">
                <Button variant="secondary" className="w-full">
                  <Gift className="w-4 h-4" />
                  {t('member.dashboard.redeemPoints')}
                </Button>
              </Link>
              <Link to="/member/purchases" className="flex-1">
                <Button variant="outline" className="w-full border-white text-white hover:bg-white/10">
                  {t('member.dashboard.viewPurchases')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t('member.dashboard.loyaltyCard')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 text-white">
              <div className="text-xs opacity-70 mb-2">MAESTRO CARD</div>
              <div className="text-lg font-mono tracking-wider mb-4">
                {memberData.cardNumber}
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs opacity-70">{t('member.dashboard.cardholder')}</div>
                  <div className="text-sm">{memberData.firstName} {memberData.lastName}</div>
                </div>
                <Badge variant={tierVariant}>{tTier(memberData.tier)}</Badge>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span>{t('member.dashboard.cardStatus')}:</span>
                <Badge variant="success">{memberData.cardStatus}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('member.dashboard.recentPurchases')}</CardTitle>
            <Link to="/member/purchases">
              <Button variant="ghost" size="sm">
                {t('member.dashboard.viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentPurchases.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">{t('member.dashboard.noPurchases')}</p>
            )}
            {recentPurchases.map((purchase) => (
              <div
                key={purchase.period}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-[#2E86C1] transition-colors"
              >
                <div>
                  <div className="font-medium">{purchase.period}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-lg">€{purchase.amount}</div>
                  <div className="text-sm text-gray-600">{t('member.dashboard.total')}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
