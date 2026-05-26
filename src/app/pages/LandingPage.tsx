import { Link } from 'react-router';
import { Button } from '../components/ui/Button';
import { Users, Shield } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2E86C1] to-[#1a5f8f] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Maestro</h1>
          <p className="text-xl text-gray-600 mb-12">Loyalty Program</p>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Link to="/member/login" className="block">
              <div className="p-8 border-2 border-gray-200 rounded-xl hover:border-[#2E86C1] hover:shadow-lg transition-all cursor-pointer group">
                <Users className="w-16 h-16 mx-auto mb-4 text-[#2E86C1] group-hover:scale-110 transition-transform" />
                <h2 className="text-2xl font-semibold mb-2">Member Portal</h2>
                <p className="text-gray-600 mb-4">Access your account, view rewards, and track your loyalty status</p>
                <Button variant="primary" className="w-full">
                  Member Sign In
                </Button>
              </div>
            </Link>

            <Link to="/admin/login" className="block">
              <div className="p-8 border-2 border-gray-200 rounded-xl hover:border-[#2E86C1] hover:shadow-lg transition-all cursor-pointer group">
                <Shield className="w-16 h-16 mx-auto mb-4 text-[#2E86C1] group-hover:scale-110 transition-transform" />
                <h2 className="text-2xl font-semibold mb-2">Admin Portal</h2>
                <p className="text-gray-600 mb-4">Manage members, rewards, rules, and view analytics</p>
                <Button variant="outline" className="w-full">
                  Admin Sign In
                </Button>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
