import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth, tokenMatchesRole } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import {
  LogOut,
  LayoutDashboard,
  Users,
  Gift,
  Settings,
  Database,
  FileText,
} from 'lucide-react';
import { useEffect } from 'react';

export function AdminLayout() {
  const { adminData, loading, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminSession = !!adminData && tokenMatchesRole('admin');

  useEffect(() => {
    if (!loading && !isAdminSession) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAdminSession, loading, navigate]);

  if (loading || !isAdminSession) {
    return null;
  }

  const handleLogout = () => {
    logout('admin');
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: t('admin.dashboard.title') },
    { path: '/admin/customers', icon: Users, label: t('admin.customers.title') },
    { path: '/admin/rewards', icon: Gift, label: t('admin.rewards.title') },
    { path: '/admin/rules', icon: Settings, label: t('admin.rules.title') },
    { path: '/admin/sql', icon: Database, label: t('admin.sql.title') },
    { path: '/admin/audit', icon: FileText, label: t('admin.audit.title') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="text-2xl font-bold text-[#2E86C1]">Maestro</div>
          <div className="text-xs text-gray-500 mt-1">{t('admin.login.title')}</div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2E86C1] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">{adminData.name}</span>
            <LanguageToggle />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('common.signOut')}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
