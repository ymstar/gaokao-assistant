'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getProvince } from '@/lib/provinces';

const navItems = [
  { name: '一分一档', suffix: '/score-rank' },
  { name: '等效分', suffix: '/equivalent-score' },
  { name: '院校库', suffix: '/universities' },
];

export function NavigationBar() {
  const pathname = usePathname();
  const provinceCode = pathname.split('/')[1] || 'hebei';
  const province = getProvince(provinceCode);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-indigo-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
            </svg>
            高考志愿助手
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const href = `/${provinceCode}${item.suffix}`;
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={item.name}
                  href={href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          {province && (
            <div className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {province.nameShort}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
