// Centralized employee context for demo mode
// In production, replace with real auth context (Supabase auth → employee lookup)

const STORAGE_KEY = 'hr_selected_emp_id';
const DEFAULT_EMP_ID = 1; // Lê Anh Khoa (CEO) - first employee

export function getSelectedEmpId(): number {
  if (typeof window === 'undefined') return DEFAULT_EMP_ID;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? Number(stored) : DEFAULT_EMP_ID;
}

export function setSelectedEmpId(id: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(id));
  }
}
