import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/Button';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-300 p-1">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
          language === 'en' ? 'bg-[#2E86C1] text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('sl')}
        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
          language === 'sl' ? 'bg-[#2E86C1] text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        SL
      </button>
    </div>
  );
}
