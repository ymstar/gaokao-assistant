'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { provinces } from '@/lib/provinces';
import { ProvinceSelector } from './ProvinceSelector';

const provinceCodes = new Set(provinces.map(p => p.code));

const navItems = [
  { name: '一分一档', suffix: '/score-rank', provinceScoped: true },
  { name: '等效分', suffix: '/equivalent-score', provinceScoped: true },
  { name: '冲稳保', suffix: '/match', provinceScoped: true },
  { name: '院校库', suffix: '/universities', provinceScoped: false },
  { name: '投档分析', suffix: '/admission-analysis', provinceScoped: false },
];

export function NavigationBar() {
  const pathname = usePathname();
  const segment = pathname.split('/')[1] || '';
  const provinceCode = provinceCodes.has(segment) ? segment : 'hebei';

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
              const href = item.provinceScoped ? `/${provinceCode}${item.suffix}` : item.suffix;
              const active = item.provinceScoped
                ? pathname.startsWith(href)
                : pathname.startsWith(item.suffix);
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

          <ProvinceSelector />
        </div>
      </div>
    </nav>
  );
}
