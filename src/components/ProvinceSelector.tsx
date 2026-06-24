'use client';

import { useRouter, usePathname } from 'next/navigation';
import { provinces } from '@/lib/provinces';

export function ProvinceSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const segment = pathname.split('/')[1] || '';
  const provinceCodes = new Set(provinces.map(p => p.code));
  const currentCode = provinceCodes.has(segment) ? segment : (provinces[0]?.code || 'hebei');
  const current = provinces.find((p) => p.code === currentCode);

  // 只有单省份时显示为只读标签
  if (provinces.length <= 1) {
    return (
      <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
        {current?.nameShort || '未知'}
      </span>
    );
  }

  const handleChange = (code: string) => {
    if (provinceCodes.has(segment)) {
      // 当前在省份路由下，替换省份段
      const segments = pathname.split('/');
      segments[1] = code;
      router.push(segments.join('/'));
    } else {
      // 当前在全局页面（如 /universities），跳到省份主页
      router.push(`/${code}`);
    }
  };

  return (
    <select
      value={currentCode}
      onChange={(e) => handleChange(e.target.value)}
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
