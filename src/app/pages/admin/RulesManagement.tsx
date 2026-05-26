import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { api, ApiError } from '../../lib/api';
import { parseAuditDetails } from '../../lib/audit';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import * as Dialog from '@radix-ui/react-dialog';
import { Edit, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

type StatusRule = {
  id: number;
  description: string;
  tier: string;
  thresholdAmount: number;
  consecutiveMonths: number;
  ruleType: string;
};

type PointsValue = {
  tier: string;
  upTo200: number;
  from200To1000: number;
  over1000: number;
  ruleIds: {
    upTo200: number;
    from200To1000: number;
    over1000: number;
  };
};

type ChangeHistoryRow = {
  timestamp: string;
  changedBy: string;
  field: string;
  oldValue: string;
  newValue: string;
};

type DbStatusRule = {
  ID_PRAVILA: number;
  TIP_PRAVILA: string;
  POGOJ_OPIS: string;
  PRAG_ZNESEK: number;
  STEVILO_MESECEV: number;
};

type DbPointsRule = {
  ID_PRAVILA: number;
  NAZIV_EN: string;
  ZNESEK_OD: number;
  ZNESEK_DO: number | null;
  TOCKE: number;
};

type DbAuditRow = {
  CAS_DOGODKA: string | Date;
  TIP_DOGODKA: string;
  PODROBNOSTI: string | null;
  UPORABNISKO_IME: string | null;
};

const RULE_TYPE_TO_KEY: Record<string, string> = {
  UPGRADE_SILVER: 'admin.rules.rule.upgrade-silver',
  UPGRADE_GOLD: 'admin.rules.rule.upgrade-gold',
  DOWNGRADE_SILVER: 'admin.rules.rule.downgrade-bronze',
  RESET_BASIC: 'admin.rules.rule.reset-basic',
  MAINTAIN_SILVER: 'admin.rules.rule.maintain-silver',
  MAINTAIN_GOLD: 'admin.rules.rule.maintain-gold',
  RECOVER_BRONZE: 'admin.rules.rule.recover-bronze',
};

const RULE_TYPE_TO_TIER: Record<string, string> = {
  UPGRADE_SILVER: 'Silver',
  UPGRADE_GOLD: 'Gold',
  MAINTAIN_SILVER: 'Silver',
  MAINTAIN_GOLD: 'Gold',
  DOWNGRADE_SILVER: 'Bronze',
  RECOVER_BRONZE: 'Silver',
  RESET_BASIC: 'Basic',
};

const RULE_EVENT_TYPES = new Set(['RULE_CHANGE', 'POINTS_RULES_UPDATED', 'STATUS_RULES_UPDATED']);

function parseNumberInput(value: string, fallback: number): number {
  if (value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapStatusRule(row: DbStatusRule): StatusRule {
  return {
    id: row.ID_PRAVILA,
    description: RULE_TYPE_TO_KEY[row.TIP_PRAVILA] ?? row.POGOJ_OPIS,
    tier: RULE_TYPE_TO_TIER[row.TIP_PRAVILA] ?? 'Basic',
    thresholdAmount: Number(row.PRAG_ZNESEK),
    consecutiveMonths: Number(row.STEVILO_MESECEV),
    ruleType: row.TIP_PRAVILA,
  };
}

function buildPointsTable(rows: DbPointsRule[]): PointsValue[] {
  const tierOrder = ['Basic', 'Bronze', 'Silver', 'Gold'];

  return tierOrder.map((tier) => {
    const tierRows = rows.filter((r) => r.NAZIV_EN === tier);
    const upTo200 = tierRows.find((r) => Number(r.ZNESEK_OD) === 0);
    const mid = tierRows.find((r) => Number(r.ZNESEK_OD) >= 200 && r.ZNESEK_DO != null);
    const over = tierRows.find((r) => r.ZNESEK_DO == null && Number(r.ZNESEK_OD) > 200);

    return {
      tier,
      upTo200: Number(upTo200?.TOCKE ?? 0),
      from200To1000: Number(mid?.TOCKE ?? 0),
      over1000: Number(over?.TOCKE ?? 0),
      ruleIds: {
        upTo200: upTo200?.ID_PRAVILA ?? 0,
        from200To1000: mid?.ID_PRAVILA ?? 0,
        over1000: over?.ID_PRAVILA ?? 0,
      },
    };
  });
}

function formatHistoryTimestamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export function RulesManagement() {
  const { t, tTier } = useLanguage();
  const [statusRules, setStatusRules] = useState<StatusRule[]>([]);
  const [pointsTable, setPointsTable] = useState<PointsValue[]>([]);
  const [savedPointsTable, setSavedPointsTable] = useState<PointsValue[]>([]);
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPoints, setSavingPoints] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [editRuleDialogOpen, setEditRuleDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<StatusRule | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const loadChangeHistory = useCallback(async () => {
    const audit = await api<DbAuditRow[]>('/admin/audit?limit=100');
    const rows = audit
      .filter((row) => RULE_EVENT_TYPES.has(row.TIP_DOGODKA))
      .map((row) => {
        const details = parseAuditDetails(row.PODROBNOSTI);
        const field = details.fieldKey
          ? t(details.fieldKey)
          : details.ruleType
            ? t(RULE_TYPE_TO_KEY[details.ruleType] ?? details.ruleType)
            : details.descriptionKey
              ? t(details.descriptionKey)
              : details.description ?? row.TIP_DOGODKA;

        return {
          timestamp: formatHistoryTimestamp(row.CAS_DOGODKA),
          changedBy: row.UPORABNISKO_IME ?? t('admin.audit.system'),
          field,
          oldValue: details.oldValue ?? '-',
          newValue: details.newValue ?? '-',
        };
      });
    setChangeHistory(rows);
  }, [t]);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRows, pointsRows] = await Promise.all([
        api<DbStatusRule[]>('/admin/rules/status'),
        api<DbPointsRule[]>('/admin/rules/points'),
      ]);
      const mappedPoints = buildPointsTable(pointsRows);
      setStatusRules(statusRows.map(mapStatusRule));
      setPointsTable(mappedPoints);
      setSavedPointsTable(mappedPoints);
      await loadChangeHistory();
    } catch {
      toast.error(t('admin.rules.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [loadChangeHistory, t]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const getRuleDescription = (rule: StatusRule) => {
    if (rule.description.startsWith('admin.')) return t(rule.description);
    return rule.description;
  };

  const handleEditRule = (rule: StatusRule) => {
    setEditingRule({ ...rule });
    setEditRuleDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;

    setSavingRule(true);
    try {
      await api(`/admin/rules/status/${editingRule.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          thresholdAmount: editingRule.thresholdAmount,
          consecutiveMonths: editingRule.consecutiveMonths,
        }),
      });

      setStatusRules((prev) =>
        prev.map((r) => (r.id === editingRule.id ? editingRule : r))
      );
      setEditRuleDialogOpen(false);
      toast.success(t('admin.rules.savedStatus'));
      await loadChangeHistory();
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : t('admin.rules.saveFailed');
      toast.error(message);
    } finally {
      setSavingRule(false);
    }
  };

  const handleSavePointsTable = () => {
    setConfirmDialogOpen(true);
  };

  const confirmSavePointsTable = async () => {
    setConfirmDialogOpen(false);
    setSavingPoints(true);

    try {
      const updates = pointsTable.flatMap((row) => [
        { id: row.ruleIds.upTo200, points: row.upTo200 },
        { id: row.ruleIds.from200To1000, points: row.from200To1000 },
        { id: row.ruleIds.over1000, points: row.over1000 },
      ]);

      const result = await api<{ success: boolean; changes: number }>('/admin/rules/points', {
        method: 'PUT',
        body: JSON.stringify({ rules: updates }),
      });

      if (result.changes === 0) {
        toast.message(t('admin.rules.noChanges'));
      } else {
        toast.success(t('admin.rules.savedPoints'));
      }

      setSavedPointsTable(pointsTable.map((row) => ({ ...row, ruleIds: { ...row.ruleIds } })));
      await loadChangeHistory();
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : t('admin.rules.saveFailed');
      toast.error(message);
    } finally {
      setSavingPoints(false);
    }
  };

  const updatePointsValue = (tier: string, field: keyof Omit<PointsValue, 'tier' | 'ruleIds'>, value: string) => {
    setPointsTable((prev) =>
      prev.map((row) =>
        row.tier === tier
          ? { ...row, [field]: parseNumberInput(value, row[field] as number) }
          : row
      )
    );
  };

  const pointsDirty =
    JSON.stringify(pointsTable) !== JSON.stringify(savedPointsTable);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.rules.title')}</h1>
        <p className="text-gray-600 mt-1">{t('admin.rules.subtitle')}</p>
      </div>

      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">{t('admin.rules.important')}</p>
              <p className="text-sm text-gray-700 mt-1">{t('admin.rules.importantText')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">{t('common.loading')}</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.rules.statusRules')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('admin.rules.ruleDescription')}</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">{t('admin.rules.tier')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('admin.rules.threshold')}</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">{t('admin.rules.consecutiveMonths')}</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusRules.map((rule) => (
                      <tr key={rule.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium">{getRuleDescription(rule)}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            rule.tier === 'Basic' ? 'bg-gray-200 text-gray-700' :
                            rule.tier === 'Bronze' ? 'bg-amber-700 text-white' :
                            rule.tier === 'Silver' ? 'bg-gray-400 text-white' :
                            'bg-yellow-400 text-gray-900'
                          }`}>
                            {tTier(rule.tier)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-semibold">€{rule.thresholdAmount}</td>
                        <td className="py-4 px-4 text-center">{rule.consecutiveMonths}</td>
                        <td className="py-4 px-4 text-center">
                          <Button variant="ghost" size="sm" onClick={() => handleEditRule(rule)}>
                            <Edit className="w-4 h-4" />
                            {t('common.edit')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('admin.rules.pointsTable')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('admin.rules.tier')}</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">{t('admin.rules.upTo200')}</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">{t('admin.rules.range200_1000')}</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">{t('admin.rules.over1000')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointsTable.map((row) => (
                      <tr key={row.tier} className="border-b border-gray-100">
                        <td className="py-4 px-4 font-semibold">{tTier(row.tier)}</td>
                        <td className="py-4 px-4 text-center">
                          <Input
                            type="number"
                            step="0.1"
                            value={row.upTo200}
                            onChange={(e) => updatePointsValue(row.tier, 'upTo200', e.target.value)}
                            className="w-20 mx-auto text-center"
                          />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Input
                            type="number"
                            step="0.1"
                            value={row.from200To1000}
                            onChange={(e) => updatePointsValue(row.tier, 'from200To1000', e.target.value)}
                            className="w-20 mx-auto text-center"
                          />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Input
                            type="number"
                            step="0.1"
                            value={row.over1000}
                            onChange={(e) => updatePointsValue(row.tier, 'over1000', e.target.value)}
                            className="w-20 mx-auto text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <Button onClick={handleSavePointsTable} disabled={savingPoints || !pointsDirty}>
                  {savingPoints ? t('common.loading') : t('admin.rules.savePointsTable')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('admin.rules.changeHistory')}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
                  {showHistory ? t('admin.rules.hideHistory') : t('admin.rules.showHistory')}
                </Button>
              </div>
            </CardHeader>
            {showHistory && (
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('admin.audit.timestamp')}</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('admin.rules.changedBy')}</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('admin.rules.field')}</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('admin.audit.oldValue')}</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('admin.audit.newValue')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changeHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            {t('admin.audit.noEvents')}
                          </td>
                        </tr>
                      ) : (
                        changeHistory.map((change, index) => (
                          <tr key={index} className="border-b border-gray-100 text-sm">
                            <td className="py-3 px-4">{change.timestamp}</td>
                            <td className="py-3 px-4">{change.changedBy}</td>
                            <td className="py-3 px-4 font-medium">{change.field}</td>
                            <td className="py-3 px-4 text-gray-600">{change.oldValue}</td>
                            <td className="py-3 px-4 text-green-600 font-medium">{change.newValue}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}

      <Dialog.Root open={editRuleDialogOpen} onOpenChange={setEditRuleDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-md z-50 shadow-xl">
            <Dialog.Title className="text-xl font-semibold mb-4">{t('admin.rules.editRule')}</Dialog.Title>
            {editingRule && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">{getRuleDescription(editingRule)}</p>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('admin.rules.threshold')}</label>
                  <Input
                    type="number"
                    value={editingRule.thresholdAmount}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        thresholdAmount: parseNumberInput(e.target.value, editingRule.thresholdAmount),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('admin.rules.consecutiveMonths')}</label>
                  <Input
                    type="number"
                    value={editingRule.consecutiveMonths}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        consecutiveMonths: parseNumberInput(e.target.value, editingRule.consecutiveMonths),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setEditRuleDialogOpen(false)} className="flex-1">
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleSaveRule} disabled={savingRule} className="flex-1">
                    {savingRule ? t('common.loading') : t('common.save')}
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

      <Dialog.Root open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-md z-50 shadow-xl">
            <Dialog.Title className="text-xl font-semibold mb-4">{t('admin.rules.confirmChanges')}</Dialog.Title>
            <p className="text-gray-600 mb-6">{t('admin.rules.confirmText')}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button onClick={confirmSavePointsTable} disabled={savingPoints} className="flex-1">
                {savingPoints ? t('common.loading') : t('common.confirm')}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
