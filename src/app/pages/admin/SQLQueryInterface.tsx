import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { api, ApiError } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Play, Download, AlertTriangle } from 'lucide-react';

const savedQueries = [
  {
    nameKey: 'admin.sql.query.membersByTier',
    query: `SELECT n.NAZIV_EN AS TIER, COUNT(*) AS CNT
FROM STATUS_CLANA s
JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
WHERE s.TRENUTNI = 'Y'
GROUP BY n.NAZIV_EN`,
  },
  {
    nameKey: 'admin.sql.query.top10Active',
    query: `SELECT c.IME, c.PRIIMEK, n.NAZIV_EN AS TIER
FROM CLAN c
LEFT JOIN STATUS_CLANA s ON c.ID_CLANA = s.ID_CLANA AND s.TRENUTNI = 'Y'
LEFT JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
WHERE c.AKTIVEN = 'Y'
AND ROWNUM <= 10
ORDER BY c.DATUM_REGISTRACIJE DESC`,
  },
  {
    nameKey: 'admin.sql.query.activeMembersCount',
    query: `SELECT COUNT(*) AS ACTIVE_MEMBERS
FROM CLAN 
WHERE AKTIVEN = 'Y'`,
  },
];

export function SQLQueryInterface() {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRunQuery = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    const startTime = Date.now();
    try {
      const data = await api<{ rows: Record<string, unknown>[]; rowCount: number }>(
        '/admin/sql',
        { method: 'POST', body: JSON.stringify({ sql: query }) }
      );
      setResults(data.rows);
      setExecutionTime(Date.now() - startTime);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadQuery = (savedQuery: typeof savedQueries[0]) => {
    setQuery(savedQuery.query);
  };

  const handleExport = () => {
    if (!results) return;

    const headers = Object.keys(results[0]);
    const csvContent = [
      headers.join(','),
      ...results.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query-results.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.sql.title')}</h1>
        <p className="text-gray-600 mt-1">{t('admin.sql.subtitle')}</p>
      </div>

      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">{t('admin.sql.warning')}</p>
              <p className="text-sm text-gray-700 mt-1">{t('admin.sql.warningDetail')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{t('admin.sql.savedQueries')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedQueries.map((sq) => (
                <button
                  key={sq.nameKey}
                  onClick={() => handleLoadQuery(sq)}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {t(sq.nameKey)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('admin.sql.queryEditor')}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                    {t('admin.sql.clear')}
                  </Button>
                  <Button size="sm" onClick={handleRunQuery} disabled={loading}>
                    <Play className="w-4 h-4" />
                    {loading ? t('admin.sql.running') : t('admin.sql.runQuery')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('admin.sql.placeholder')}
                className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86C1] bg-gray-50"
              />
              {executionTime !== null && (
                <p className="text-sm text-gray-600 mt-2">
                  {t('admin.sql.queryExecuted').replace('{ms}', executionTime.toFixed(2))}
                </p>
              )}
            </CardContent>
          </Card>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">{t('admin.sql.queryError')}</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {results && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('admin.sql.results')}</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="w-4 h-4" />
                    {t('admin.sql.exportCsv')}
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {t('admin.sql.showingResults').replace('{count}', String(results.length))}
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {results.length > 0 &&
                          Object.keys(results[0]).map((key) => (
                            <th key={key} className="text-left py-3 px-4 font-semibold text-gray-700">
                              {key}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50">
                          {Object.values(row).map((value: any, colIndex) => (
                            <td key={colIndex} className="py-3 px-4">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
