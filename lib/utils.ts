import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Timestamp型をDateに変換
 */
export function toDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  return new Date(timestamp);
}

/**
 * 日付を"YYYY-MM-DD"形式に変換
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * 日付を"YYYY年MM月DD日"形式に変換
 */
export function formatDateJa(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 時刻を"HH:mm"形式に変換
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

/**
 * 日時を"YYYY年MM月DD日 HH:mm"形式に変換
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDateJa(date)} ${formatTime(date)}`;
}

/**
 * 週の月曜日を取得（週は月曜始まり）
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * 週キー（YYYY-MM-DD形式の月曜日）を取得
 */
export function getWeekKey(date: Date): string {
  const monday = getMonday(date);
  return formatDate(monday);
}

/**
 * 週の日付配列を取得（月曜～日曜）
 */
export function getWeekDates(date: Date): Date[] {
  const monday = getMonday(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/**
 * 曜日名を取得
 */
export function getDayName(date: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
}

/**
 * 時間範囲が重複しているかチェック
 */
export function isTimeOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * 分を時間表記に変換（例: 90 → "1時間30分"）
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}分`;
  if (mins === 0) return `${hours}時間`;
  return `${hours}時間${mins}分`;
}
