import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { api, ApiError } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Users, TrendingUp, Gift, Award, Upload, RefreshCw } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const TIER_COLORS: Record<string, string> = {
  Basic: '#9CA3AF',
  Bronze: '#92400E',
  Silver: '#6B7280',
  Gold: '#FBBF24',
};

type DashboardData = {
  totalMembers: number;
  totalPurchaseVolume: number;
  totalPointsIssued: number;
  totalRedemptions: number;
  tierDistribution: { tier: string; count: number }[];
  monthlyPurchases: { label: string; total: number }[];
};

type ImportStatus = {
  timestamp: string | null;
  recordsProcessed: number;
  errors: string[];
  status: 'success' | 'partial' | 'failed' | 'idle' | 'reverted';
  revertedPeriods?: string[];
};

export function AdminDashboard() {
  const { t, tTier } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [importing, setImporting] = useState(false);

  const loadImportStatus = useCallback(() => {
    api<ImportStatus>('/admin/import/status')
      .then(setImportStatus)
      .catch(() => setImportStatus(null));
  }, []);

  useEffect(() => {
    api<DashboardData>('/admin/dashboard').then(setData).catch(() => setData(null));
    loadImportStatus();
  }, [loadImportStatus]);

  const handleRunImport = async () => {
    setImporting(true);
    try {
      const result = await api<ImportStatus>('/admin/import/trigger', {
        method: 'POST',
        body: JSON.stringify({ filePath: 'data/erp-april-2026.json' }),
      });
      setImportStatus(result);
      if (result.status === 'reverted') {
        toast.success(t('admin.import.reverted'));
      } else {
        toast.success(`${t('admin.import.records')}: ${result.recordsProcessed}`);
      }
      if (result.errors.length > 0) {
        toast.error(result.errors.join('; '));
      }
      api<DashboardData>('/admin/dashboard').then(setData).catch(() => {});
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Import failed';
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  // Billing is now executed automatically after ERP import

  const importStatusLabel = (status: ImportStatus['status']) => {
    const key = `admin.import.status.${status}` as const;
    return t(key);
  };

  const tierDistribution =
    data?.tierDistribution.map((row) => ({
      name: tTier(row.tier),
      value: row.count,
      color: TIER_COLORS[row.tier] || '#9CA3AF',
    })) ?? [];

  const monthlyPurchases =
    data?.monthlyPurchases.map((m) => ({
      month: m.label,
      amount: m.total,
    })) ?? [];

  const totalMembers = data?.totalMembers ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.dashboard.title')}</h1>
        <p className="text-gray-600 mt-1">{t('admin.dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('admin.dashboard.activeMembers')}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalMembers.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-[#2E86C1]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('admin.dashboard.goldMembers')}</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {data?.tierDistribution.find((row) => row.tier === 'Gold')?.count ?? 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('admin.dashboard.pointsIssued')}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {(data?.totalPointsIssued ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('admin.dashboard.rewardsRedeemed')}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {data?.totalRedemptions ?? 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Gift className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('admin.import.title')}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{t('admin.import.subtitle')}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadImportStatus}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button onClick={handleRunImport} disabled={importing}>
                <Upload className="w-4 h-4" />
                {importing ? t('admin.import.running') : t('admin.import.trigger')}
              </Button>
              {/* Billing is run automatically by the ERP import; manual trigger removed */}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {importStatus && importStatus.status !== 'idle' && importStatus.timestamp ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">{t('admin.import.lastRun')}</p>
                <p className="font-medium">{new Date(importStatus.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">{t('admin.import.records')}</p>
                <p className="font-medium">{importStatus.recordsProcessed}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className="font-medium">{importStatusLabel(importStatus.status)}</p>
              </div>
              {importStatus.errors.length > 0 && (
                <div className="sm:col-span-3">
                  <p className="text-gray-600">{t('admin.import.errors')}</p>
                  <ul className="mt-1 text-red-600 list-disc list-inside">
                    {importStatus.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">{t('admin.import.none')}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.chartMonthly')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyPurchases}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `€${Number(value).toLocaleString()}`}
                  labelFormatter={(label) => `${t('chart.month')}: ${label}`}
                />
                <Bar dataKey="amount" fill="#2E86C1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.chartTierDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tierDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tierDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.dashboard.purchaseVolume')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-[#2E86C1]">
            €{(data?.totalPurchaseVolume ?? 0).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
