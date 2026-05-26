import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Download, Search } from 'lucide-react';

type PurchaseRow = { period: string; amount: number };

export function PurchaseHistory() {
  const { t } = useLanguage();
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

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleExport = () => {
    const csvContent = [
      ['Month', 'Total Amount (EUR)'],
      ...purchaseData.map(item => [item.period, item.amount])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchase-history.csv';
    a.click();
  };

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
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                    <tr key={item.period} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium">{item.period}</td>
                      <td className="py-4 px-4 text-right font-semibold">€{item.amount.toLocaleString()}</td>
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
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {t('member.purchases.prev')}
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
              <h3 className="font-semibold text-gray-900 mb-2">{t('member.purchases.howCalculated')}</h3>
              <p className="text-sm text-gray-700">
                {t('member.purchases.howCalculatedDesc')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
