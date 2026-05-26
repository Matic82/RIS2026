import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Download, Search, TrendingUp, Coins, CalendarDays } from 'lucide-react';

type PurchaseRow = {
  period: string;
  amount: number;
  pointsEarned: number;
  billed: boolean;
  tierAtTime: string | null;
};

export function PurchaseHistory() {
  const { t, tTier } = useLanguage();
  const [purchaseData, setPurchaseData] = useState<PurchaseRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    api<PurchaseRow[]>('/member/purchases').then(setPurchaseData).catch(() => setPurchaseData([]));
  }, []);

  const filteredData = purchaseData.filter((item) =>
    item.period.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totals = useMemo(() => {
    const totalAmount = purchaseData.reduce((sum, item) => sum + item.amount, 0);
    const totalPoints = purchaseData.reduce(
      (sum, item) => sum + (item.billed ? item.pointsEarned : 0),
      0
    );
    return { totalAmount, totalPoints, months: purchaseData.length };
  }, [purchaseData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleExport = () => {
    const csvContent = [
      ['Month', 'Total Amount (EUR)', 'Points Earned', 'Status at Time'],
      ...purchaseData.map((item) => [
        item.period,
        item.amount,
        item.billed ? item.pointsEarned : 'Pending',
        item.tierAtTime ? tTier(item.tierAtTime) : '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchase-history.csv';
    a.click();
  };

  const tierVariant = (tier: string) =>
    tier.toLowerCase() as 'basic' | 'bronze' | 'silver' | 'gold';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('member.purchases.title')}</h1>
          <p className="text-gray-600 mt-1">{t('member.purchases.subtitle')}</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4" />
          {t('common.export')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-[#2E86C1]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('member.purchases.totalSpent')}</p>
                <p className="text-2xl font-bold">€{totals.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('member.purchases.totalPoints')}</p>
                <p className="text-2xl font-bold">{totals.totalPoints.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('member.purchases.months')}</p>
                <p className="text-2xl font-bold">{totals.months}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('member.purchases.records')}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t('common.search') + '...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t('member.purchases.month')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    {t('member.purchases.amount')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    {t('member.purchases.pointsEarned')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    {t('member.purchases.statusAtTime')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.period} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 font-medium">{item.period}</td>
                    <td className="py-4 px-4 text-right font-semibold">
                      €{item.amount.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {item.billed ? (
                        <span className="font-semibold text-[#2E86C1]">
                          +{item.pointsEarned.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">
                          {t('member.purchases.pending')}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {item.tierAtTime ? (
                        <Badge variant={tierVariant(item.tierAtTime)}>
                          {tTier(item.tierAtTime)}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paginatedData.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {t('member.purchases.noResults')}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {t('member.purchases.prev')}
              </Button>
              <span className="text-sm text-gray-600">
                {t('member.purchases.pageOf')
                  .replace('{page}', String(currentPage))
                  .replace('{total}', String(totalPages))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {t('member.purchases.next')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                {t('member.purchases.howCalculated')}
              </h3>
              <p className="text-sm text-gray-700">{t('member.purchases.howCalculatedDesc')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
