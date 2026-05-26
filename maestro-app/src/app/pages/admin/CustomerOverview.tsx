import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { api, ApiError } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, Eye, X } from 'lucide-react';
import { toast } from 'sonner';

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tier: string;
  points: number;
  registrationDate: string;
  lastPurchase?: string;
};

type StatusHistoryItem = {
  tier: string;
  from: string;
  to: string | null;
  reason: string;
  current: boolean;
};

type PointsTransaction = {
  id: string;
  date: string;
  points: number;
  type: string;
  description: string;
};

type PurchaseRow = {
  ZNESEK: number;
  MESEC: number;
  LETO: number;
};

export function CustomerOverview() {
  const { t, tTier } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PointsTransaction[]>([]);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [pointsAdjustment, setPointsAdjustment] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('tier', statusFilter);
    if (searchQuery) params.set('search', searchQuery);
    api<Customer[]>(`/admin/customers?${params}`)
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, [statusFilter, searchQuery]);

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || customer.tier === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  const handleViewDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailDialogOpen(true);
    setStatusHistory([]);
    setPointsHistory([]);
    setPurchases([]);

    try {
      const [history, pointsData, detail] = await Promise.all([
        api<StatusHistoryItem[]>(`/admin/customers/${customer.id}/status-history`),
        api<{ balance: number; history: PointsTransaction[] }>(
          `/admin/customers/${customer.id}/points`
        ),
        api<{ purchases?: PurchaseRow[] }>(`/admin/customers/${customer.id}`),
      ]);
      setStatusHistory(history);
      setPointsBalance(pointsData.balance);
      setPointsHistory(pointsData.history);
      setPurchases(detail.purchases ?? []);
      setSelectedCustomer({ ...customer, points: pointsData.balance });
    } catch {
      toast.error(t('admin.customers.noResults'));
    }
  };

  const handleApplyCorrection = async () => {
    if (!selectedCustomer) return;
    const points = parseInt(pointsAdjustment, 10);
    if (isNaN(points) || !correctionReason.trim()) {
      toast.error(t('admin.customers.correctionReason'));
      return;
    }

    setCorrecting(true);
    try {
      const result = await api<{ balance: number }>(
        `/admin/customers/${selectedCustomer.id}/points`,
        {
          method: 'PUT',
          body: JSON.stringify({ points, reason: correctionReason.trim() }),
        }
      );
      setPointsBalance(result.balance);
      setSelectedCustomer({ ...selectedCustomer, points: result.balance });
      const pointsData = await api<{ history: PointsTransaction[] }>(
        `/admin/customers/${selectedCustomer.id}/points`
      );
      setPointsHistory(pointsData.history);
      setPointsDialogOpen(false);
      setPointsAdjustment('');
      setCorrectionReason('');
      toast.success(t('admin.customers.correctionSuccess'));
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('tier', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      const list = await api<Customer[]>(`/admin/customers?${params}`);
      setCustomers(list);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Failed';
      toast.error(message);
    } finally {
      setCorrecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.customers.title')}</h1>
        <p className="text-gray-600 mt-1">{t('admin.customers.subtitle')}</p>
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
            >
              <option value="all">{t('admin.customers.allStatuses')}</option>
              <option value="Basic">{tTier('Basic')}</option>
              <option value="Bronze">{tTier('Bronze')}</option>
              <option value="Silver">{tTier('Silver')}</option>
              <option value="Gold">{tTier('Gold')}</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t('admin.customers.memberID')}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t('admin.customers.fullName')}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t('common.email')}
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    {t('admin.customers.currentStatus')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    {t('admin.customers.pointsBalance')}
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    {t('admin.customers.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer) => {
                  const tierVariant = customer.tier.toLowerCase() as 'basic' | 'bronze' | 'silver' | 'gold';
                  return (
                    <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 font-mono text-sm text-gray-600">{customer.id}</td>
                      <td className="py-4 px-4 font-medium">
                        {customer.firstName} {customer.lastName}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{customer.email}</td>
                      <td className="py-4 px-4 text-center">
                        <Badge variant={tierVariant}>{tTier(customer.tier)}</Badge>
                      </td>
                      <td className="py-4 px-4 text-right font-semibold">{customer.points.toLocaleString()}</td>
                      <td className="py-4 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(customer)}
                        >
                          <Eye className="w-4 h-4" />
                          {t('admin.customers.viewDetails')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {paginatedCustomers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {t('admin.customers.noResults')}
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
                {t('common.previous')}
              </Button>
              <span className="text-sm text-gray-600">
                {t('admin.customers.page')} {currentPage} {t('admin.customers.of')} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {t('common.next')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog.Root open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto z-50 shadow-xl">
            <Dialog.Title className="text-2xl font-semibold mb-6">{t('admin.customers.memberDetails')}</Dialog.Title>
            {selectedCustomer && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('admin.customers.personalInfo')}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">{t('admin.customers.fullName')}</p>
                      <p className="font-medium">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('common.email')}</p>
                      <p className="font-medium">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('admin.customers.currentStatus')}</p>
                      <Badge variant={selectedCustomer.tier.toLowerCase() as 'basic' | 'bronze' | 'silver' | 'gold'}>
                        {tTier(selectedCustomer.tier)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('admin.customers.pointsBalance')}</p>
                      <p className="font-medium">{pointsBalance.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('admin.customers.statusHistory')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">{t('admin.customers.date')}</th>
                          <th className="text-left py-2">{t('admin.customers.newStatus')}</th>
                          <th className="text-left py-2">{t('admin.customers.reason')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statusHistory.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2">{String(item.from).slice(0, 10)}</td>
                            <td className="py-2">
                              <Badge variant={item.tier.toLowerCase() as 'basic' | 'bronze' | 'silver' | 'gold'}>
                                {tTier(item.tier)}
                                {item.current ? ` (${t('admin.customers.current')})` : ''}
                              </Badge>
                            </td>
                            <td className="py-2 text-gray-600">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('admin.customers.pointsHistory')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">{t('admin.customers.date')}</th>
                          <th className="text-right py-2">{t('admin.customers.pointsBalance')}</th>
                          <th className="text-left py-2">{t('admin.customers.reason')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pointsHistory.map((tx) => (
                          <tr key={tx.id} className="border-b">
                            <td className="py-2">{String(tx.date).slice(0, 10)}</td>
                            <td className={`py-2 text-right font-medium ${tx.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.points > 0 ? '+' : ''}{tx.points}
                            </td>
                            <td className="py-2 text-gray-600">{tx.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('admin.customers.purchaseHistory')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">{t('member.purchases.month')}</th>
                          <th className="text-right py-2">{t('member.purchases.amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2">{item.MESEC}/{item.LETO}</td>
                            <td className="py-2 text-right font-semibold">€{item.ZNESEK}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setDetailDialogOpen(false)} className="flex-1">
                    {t('admin.customers.close')}
                  </Button>
                  <Button variant="primary" className="flex-1" onClick={() => setPointsDialogOpen(true)}>
                    {t('admin.customers.manualPoints')}
                  </Button>
                </div>
              </div>
            )}
            <Dialog.Close asChild>
              <button className="absolute top-6 right-6 p-1 rounded-lg hover:bg-gray-100" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={pointsDialogOpen} onOpenChange={setPointsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-md z-50 shadow-xl">
            <Dialog.Title className="text-xl font-semibold mb-4">{t('admin.customers.manualPoints')}</Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('admin.customers.pointsAdjustment')}</label>
                <Input
                  type="number"
                  value={pointsAdjustment}
                  onChange={(e) => setPointsAdjustment(e.target.value)}
                  placeholder="e.g. 200 or -50"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('admin.customers.correctionReason')}</label>
                <Input
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setPointsDialogOpen(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleApplyCorrection} disabled={correcting} className="flex-1">
                  {correcting ? t('common.loading') : t('admin.customers.applyCorrection')}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
