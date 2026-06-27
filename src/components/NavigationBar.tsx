'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { provinces } from '@/lib/provinces';
import { StudentInfoBadge } from './student/StudentInfoBadge';

const provinceCodes = new Set(provinces.map(p => p.code));

const navItems = [
  { name: '一分一档', suffix: '/score-rank', provinceScoped: true },
  { name: '志愿填报🔥', suffix: '/match', provinceScoped: true },
  { name: '院校库', suffix: '/universities', provinceScoped: false },
  { name: '投档线', suffix: '/admission-lines', provinceScoped: false },
  { name: '招生计划', suffix: '/enrollment-plan', provinceScoped: false },
  { name: 'AI咨询', suffix: '/chat', provinceScoped: true },
];

// ---------- Province selector (shared) ----------

function ProvinceSelect({ currentCode }: { currentCode: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = provinces.find((p) => p.code === currentCode);

  if (provinces.length <= 1) {
    return (
      <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
        {current?.nameShort || '未知'}
      </span>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const segments = pathname.split('/');
    if (provinceCodes.has(segments[1])) {
      segments[1] = code;
      router.push(segments.join('/'));
    } else {
      router.push(`/${code}`);
    }
  };

  return (
    <select
      value={currentCode}
      onChange={handleChange}
      className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border-0 cursor-pointer hover:bg-slate-200 transition-colors appearance-none pr-6 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[center_right_0.4rem]"
    >
      {provinces.map((p) => (
        <option key={p.code} value={p.code}>
          {p.nameShort}
        </option>
      ))}
    </select>
  );
}

// ---------- Mobile drawer ----------

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  provinceCode: string;
  pathname: string;
}

function MobileDrawer({ open, onClose, provinceCode, pathname }: MobileDrawerProps) {
  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <nav
        className={`fixed top-0 right-0 z-50 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="导航菜单"
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200">
          <span className="text-sm font-semibold text-slate-500">导航</span>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="关闭菜单"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3 space-y-1">
          {navItems.map((item) => {
            const href = item.provinceScoped ? `/${provinceCode}${item.suffix}` : item.suffix;
            const active = item.provinceScoped
              ? pathname.startsWith(href)
              : pathname.startsWith(item.suffix);
            return (
              <Link
                key={item.name}
                href={href}
                onClick={onClose}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Bottom bar: student + province */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <StudentInfoBadge />
            <ProvinceSelect currentCode={provinceCode} />
          </div>
        </div>
      </nav>
    </>
  );
}

// ---------- Main NavigationBar ----------

export function NavigationBar() {
  const pathname = usePathname();
  const segment = pathname.split('/')[1] || '';
  const provinceCode = provinceCodes.has(segment) ? segment : 'hebei';
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row: logo + desktop nav + right side */}
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-indigo-600 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
            </svg>
            <span className="hidden sm:inline">高考志愿助手</span>
          </Link>

          {/* Desktop nav links — hidden below lg */}
          <div className="hidden lg:flex items-center gap-1">
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

          {/* Right side: badge + province + hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 sm:gap-3">
              <StudentInfoBadge />
              <ProvinceSelect currentCode={provinceCode} />
            </div>
            {/* Hamburger — visible below lg */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="打开菜单"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile-only row: badge + province (visible below sm) */}
        <div className="sm:hidden flex items-center gap-2 pb-2">
          <StudentInfoBadge />
          <ProvinceSelect currentCode={provinceCode} />
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        provinceCode={provinceCode}
        pathname={pathname}
      />
    </nav>
  );
}
