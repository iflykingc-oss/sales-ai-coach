import { useState, useEffect } from 'react';
import { X, Shield, Cookie } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ConsentPreferences {
  necessary: boolean;     // Always true
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const CONSENT_KEY = 'sales-ai-coach-consent';
const CONSENT_VERSION = '2024-01-15';

function getStoredConsent(): { version: string; preferences: ConsentPreferences } | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return null; // Re-consent on version change
    return parsed;
  } catch {
    return null;
  }
}

function storeConsent(preferences: ConsentPreferences) {
  localStorage.setItem(
    CONSENT_KEY,
    JSON.stringify({ version: CONSENT_VERSION, preferences, timestamp: new Date().toISOString() }),
  );
}

// Detect if user is likely in China for compliance variant
function detectRegion(): 'china' | 'international' {
  const lang = navigator.language || '';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (lang.startsWith('zh') || tz.includes('Asia/Shanghai') || tz.includes('Asia/Chongqing')) {
    return 'china';
  }
  return 'international';
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: true,
  });
  const region = detectRegion();

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const all = { necessary: true, analytics: true, marketing: true, functional: true };
    storeConsent(all);
    syncConsentToServer(all);
    setVisible(false);
  };

  const handleRejectOptional = () => {
    const minimal = { necessary: true, analytics: false, marketing: false, functional: false };
    storeConsent(minimal);
    syncConsentToServer(minimal);
    setVisible(false);
  };

  const handleSavePreferences = () => {
    storeConsent(preferences);
    syncConsentToServer(preferences);
    setVisible(false);
  };

  const syncConsentToServer = async (prefs: ConsentPreferences) => {
    try {
      const consents = [
        { type: 'PRIVACY_POLICY', version: CONSENT_VERSION, accepted: true },
        { type: 'TERMS_OF_SERVICE', version: CONSENT_VERSION, accepted: true },
        { type: 'DATA_PROCESSING', version: CONSENT_VERSION, accepted: true },
        { type: 'MARKETING', version: CONSENT_VERSION, accepted: prefs.marketing },
      ];
      await fetch('/api/compliance/consent/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ consents, version: CONSENT_VERSION }),
      });
    } catch {
      // Silent fail — consent is stored locally regardless
    }
  };

  if (!visible) return null;

  const isChina = region === 'china';

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {isChina ? 'Cookie 使用说明' : 'Cookie Notice'}
              </h3>
              <button
                onClick={() => setVisible(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-xs text-gray-600">
              {isChina
                ? '我们使用 Cookie 和类似技术来提供和改善服务。必要 Cookie 是服务正常运行所必需的。根据《个人信息保护法》，您有权选择是否允许我们使用非必要 Cookie。'
                : 'We use cookies and similar technologies to provide and improve our services. Necessary cookies are required for the service to function. Under GDPR, you have the right to choose which optional cookies you allow.'}
            </p>

            {showDetails && (
              <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                {[
                  {
                    key: 'necessary' as const,
                    label: isChina ? '必要 Cookie' : 'Necessary Cookies',
                    desc: isChina ? '登录、安全、基本功能' : 'Login, security, basic functionality',
                    disabled: true,
                  },
                  {
                    key: 'functional' as const,
                    label: isChina ? '功能 Cookie' : 'Functional Cookies',
                    desc: isChina ? '记住偏好设置' : 'Remember your preferences',
                    disabled: false,
                  },
                  {
                    key: 'analytics' as const,
                    label: isChina ? '分析 Cookie' : 'Analytics Cookies',
                    desc: isChina ? '帮助我们了解使用情况' : 'Help us understand usage patterns',
                    disabled: false,
                  },
                  {
                    key: 'marketing' as const,
                    label: isChina ? '营销 Cookie' : 'Marketing Cookies',
                    desc: isChina ? '用于个性化推荐' : 'Used for personalized recommendations',
                    disabled: false,
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 rounded-md bg-white px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={preferences[item.key]}
                      disabled={item.disabled}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="text-xs font-medium text-gray-800">{item.label}</span>
                      <p className="text-[10px] text-gray-500">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={handleAcceptAll}
                className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
              >
                {isChina ? '全部接受' : 'Accept All'}
              </button>
              <button
                onClick={handleRejectOptional}
                className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {isChina ? '仅必要' : 'Necessary Only'}
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                {showDetails
                  ? isChina ? '收起' : 'Hide Details'
                  : isChina ? '自定义' : 'Customize'}
              </button>
              {showDetails && (
                <button
                  onClick={handleSavePreferences}
                  className="rounded-lg border border-primary-300 bg-primary-50 px-4 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
                >
                  {isChina ? '保存偏好' : 'Save Preferences'}
                </button>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400">
              <Shield className="h-3 w-3" />
              {isChina
                ? '依据《网络安全法》《数据安全法》《个人信息保护法》保护您的数据权利'
                : 'Your data rights are protected under GDPR. '}
              <a href="/privacy" className="underline hover:text-gray-600">
                {isChina ? '隐私政策' : 'Privacy Policy'}
              </a>
              <span className="mx-1">·</span>
              <a href="/terms" className="underline hover:text-gray-600">
                {isChina ? '服务条款' : 'Terms'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
