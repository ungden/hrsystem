export const deptSlugMap: Record<string, string> = {
  'ke-toan': 'Phòng Kế toán',
  'cntt': 'Phòng CNTT',
  'kinh-doanh': 'Phòng Kinh doanh',
  'nhan-su': 'Phòng Nhân sự',
  'hanh-chinh': 'Phòng Hành chính',
  'marketing': 'Phòng Marketing',
};

export const deptNameToSlug: Record<string, string> = Object.fromEntries(
  Object.entries(deptSlugMap).map(([slug, name]) => [name, slug])
);

export function getDeptFromSlug(slug: string): string | undefined {
  return deptSlugMap[slug];
}

export function getSlugFromDept(dept: string): string {
  return deptNameToSlug[dept] || dept.toLowerCase().replace(/\s+/g, '-');
}

export const deptColors: Record<string, { bg: string; text: string; border: string; chart: string }> = {
  'Phòng Kế toán': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', chart: '#3b82f6' },
  'Phòng CNTT': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', chart: '#10b981' },
  'Phòng Kinh doanh': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', chart: '#f59e0b' },
  'Phòng Nhân sự': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', chart: '#8b5cf6' },
  'Phòng Hành chính': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', chart: '#ef4444' },
  'Phòng Marketing': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', chart: '#ec4899' },
};
