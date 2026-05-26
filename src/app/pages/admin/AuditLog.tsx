import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { parseAuditDetails } from '../../lib/audit';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Download, Search } from 'lucide-react';

type AuditEvent = {
  timestamp: string;
  eventType: 'Status Change' | 'Points Awarded' | 'Points Redeemed' | 'Rule Change' | 'Admin Action' | 'Login';
  affectedMember: string;
  performedBy: 'system' | 'allMembers' | string;
  descriptionKey: string;
  description: string;
  oldValue: string;
  newValue: string;
};

type DbAuditRow = {
  CAS_DOGODKA: string | Date;
  TIP_DOGODKA: string;
  PODROBNOSTI: string | null;
  UPORABNISKO_IME: string | null;
};

const TIER_VALUES = new Set(['Basic', 'Bronze', 'Silver', 'Gold']);

const EVENT_TYPE_MAP: Record<string, AuditEvent['eventType']> = {
  STATUS_CHANGE: 'Status Change',
  POINTS_AWARDED: 'Points Awarded',
  POINTS_REDEEMED: 'Points Redeemed',
  REWARD_REDEEMED: 'Points Redeemed',
  RULE_CHANGE: 'Rule Change',
  POINTS_RULES_UPDATED: 'Rule Change',
  STATUS_RULES_UPDATED: 'Rule Change',
  MANUAL_POINTS_CORRECTION: 'Admin Action',
  ERP_IMPORT: 'Admin Action',
  ERP_IMPORT_TRIGGERED: 'Admin Action',
  ERP_IMPORT_REVERTED: 'Admin Action',
  BILLING_TRIGGERED: 'Admin Action',
  LOGIN: 'Login',
  ADMIN_LOGIN: 'Login',
};

function formatAuditTimestamp(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function mapDbRow(row: DbAuditRow): AuditEvent {
  const details = parseAuditDetails(row.PODROBNOSTI);
  const eventType = EVENT_TYPE_MAP[row.TIP_DOGODKA] ?? 'Admin Action';
  const performedBy =
    details.performedBy === 'system'
      ? 'system'
      : details.performedBy ?? row.UPORABNISKO_IME ?? 'system';

  return {
    timestamp: formatAuditTimestamp(row.CAS_DOGODKA),
    eventType,
    affectedMember: details.affectedMember ?? '-',
    performedBy,
    descriptionKey: details.descriptionKey ?? '',
    description: details.description ?? row.PODROBNOSTI ?? row.TIP_DOGODKA,
    oldValue: details.oldValue ?? '-',
    newValue: details.newValue ?? '-',
  };
}

export function AuditLog() {
  const { t, tTier } = useLanguage();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    api<DbAuditRow[]>('/admin/audit')
      .then((rows) => setEvents(rows.map(mapDbRow)))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const eventTypes = ['all', 'Status Change', 'Points Awarded', 'Points Redeemed', 'Rule Change', 'Admin Action', 'Login'];

  const translateCell = (value: string): string => {
    if (value === '-') return t('common.na');
    if (TIER_VALUES.has(value)) return tTier(value);
    if (value.startsWith('admin.')) return t(value);
    return value;
  };

  const translatePerformedBy = (performedBy: AuditEvent['performedBy']): string => {
    if (performedBy === 'system') return t('admin.audit.system');
    return performedBy;
  };

  const translateAffectedMember = (member: string): string => {
    if (member === 'allMembers') return t('admin.audit.allMembers');
    if (member === '-') return t('common.na');
    return member;
  };

  const getEventDescription = (event: AuditEvent): string => {
    if (event.descriptionKey && event.descriptionKey.startsWith('admin.')) {
      return t(event.descriptionKey);
    }
    return event.description || event.descriptionKey || '—';
  };

  const getEventSearchText = (event: AuditEvent): string => {
    return [
      getEventDescription(event),
      translateAffectedMember(event.affectedMember),
      translatePerformedBy(event.performedBy),
      translateCell(event.oldValue),
      translateCell(event.newValue),
    ].join(' ').toLowerCase();
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch = getEventSearchText(event).includes(searchQuery.toLowerCase());
    const matchesType = eventTypeFilter === 'all' || event.eventType === eventTypeFilter;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);

  const getEventTypeVariant = (type: string): 'success' | 'warning' | 'danger' | 'default' => {
    switch (type) {
      case 'Status Change':
        return 'success';
      case 'Points Redeemed':
        return 'warning';
      case 'Rule Change':
        return 'danger';
      case 'Points Awarded':
        return 'success';
      default:
        return 'default';
    }
  };

  const getTranslatedEventType = (type: string): string => {
    return t(`admin.audit.event.${type}`);
  };

  const handleExport = () => {
    const csvContent = [
      [
        t('admin.audit.timestamp'),
        t('admin.audit.eventType'),
        t('admin.audit.affectedMember'),
        t('admin.audit.performedBy'),
        t('admin.audit.description'),
        t('admin.audit.oldValue'),
        t('admin.audit.newValue'),
      ],
      ...events.map((event) => [
        event.timestamp,
        getTranslatedEventType(event.eventType),
        translateAffectedMember(event.affectedMember),
        translatePerformedBy(event.performedBy),
        getEventDescription(event),
        translateCell(event.oldValue),
        translateCell(event.newValue),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-log.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.audit.title')}</h1>
          <p className="text-gray-600 mt-1">{t('admin.audit.subtitle')}</p>
        </div>
        <Button onClick={handleExport} variant="outline" disabled={events.length === 0}>
          <Download className="w-4 h-4" />
          {t('common.export')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t('admin.audit.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
            >
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'all' ? t('admin.audit.allEventTypes') : t(`admin.audit.event.${type}`)}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t('admin.audit.timestamp')}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t('admin.audit.eventType')}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t('admin.audit.affectedMember')}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t('admin.audit.performedBy')}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('admin.audit.description')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('admin.audit.oldValue')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('admin.audit.newValue')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.map((event, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">{event.timestamp}</td>
                    <td className="py-3 px-4">
                      <Badge variant={getEventTypeVariant(event.eventType)}>{getTranslatedEventType(event.eventType)}</Badge>
                    </td>
                    <td className="py-3 px-4">{translateAffectedMember(event.affectedMember)}</td>
                    <td className="py-3 px-4 text-gray-600">{translatePerformedBy(event.performedBy)}</td>
                    <td className="py-3 px-4">{getEventDescription(event)}</td>
                    <td className="py-3 px-4 text-gray-600">{translateCell(event.oldValue)}</td>
                    <td className="py-3 px-4 font-medium text-green-600">{translateCell(event.newValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
          )}

          {!loading && paginatedEvents.length === 0 && (
            <div className="text-center py-12 text-gray-500">{t('admin.audit.noEvents')}</div>
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

      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{t('admin.audit.aboutTitle')}</h3>
            <p className="text-sm text-gray-700">{t('admin.audit.aboutText')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
