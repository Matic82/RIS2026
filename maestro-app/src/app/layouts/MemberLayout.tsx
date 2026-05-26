import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth, tokenMatchesRole } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { Badge } from '../components/ui/Badge';
import { LogOut, LayoutDashboard, ShoppingBag, Gift, User } from 'lucide-react';
import { useEffect } from 'react';

export function MemberLayout() {
  const { memberData, logout, loading } = useAuth();
  const { t, tTier } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const isMemberSession = !!memberData && tokenMatchesRole('member');

  useEffect(() => {
    if (!loading && !isMemberSession) {
      navigate('/member/login', { replace: true });
    }
  }, [isMemberSession, loading, navigate]);

  if (loading || !isMemberSession) {
    return null;
  }

  const handleLogout = () => {
    logout('member');
    navigate('/member/login');
  };

  const navItems = [
    { path: '/member', icon: LayoutDashboard, label: t('member.dashboard.title') },
    { path: '/member/purchases', icon: ShoppingBag, label: t('member.purchases.title') },
    { path: '/member/rewards', icon: Gift, label: t('member.rewards.title') },
    { path: '/member/profile', icon: User, label: t('member.profile.title') },
  ];

  const tierVariant = memberData.tier.toLowerCase() as 'basic' | 'bronze' | 'silver' | 'gold';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="text-2xl font-bold text-[#2E86C1]">Maestro</div>
              <nav className="flex gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#2E86C1] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {memberData.firstName} {memberData.lastName}
                </span>
                <Badge variant={tierVariant}>{tTier(memberData.tier)}</Badge>
              </div>
              <LanguageToggle />
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('common.signOut')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
