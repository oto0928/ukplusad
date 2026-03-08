'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ProtectedRoute } from '@/lib/components/ProtectedRoute';
import { TeacherLayout } from '@/lib/components/TeacherLayout';
import { useAuth } from '@/lib/hooks/useAuth';
import { PrivateSlot, PrivateBooking, AppUser, BookingStatus } from '@/lib/types';
import {
  collection, getDocs, query, where, Timestamp,
  doc, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import {
  toDate, formatDateJa, formatTime, formatDuration,
  formatDate, getWeekDates, getDayName, calculateOverlapLayout,
} from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, User,
  CheckCircle2, AlertTriangle, XCircle, Trash2, Eye,
} from 'lucide-react';

const HOUR_HEIGHT = 64;
const START_HOUR = 9;
const END_HOUR = 22;

const statusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: 'bg-green-100', text: 'text-green-800' },
  booked: { bg: 'bg-blue-100', text: 'text-blue-800' },
  closed: { bg: 'bg-gray-200', text: 'text-gray-600' },
};

export default function TeacherSchedulePage() {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [slots, setSlots] = useState<PrivateSlot[]>([]);
  const [bookings, setBookings] = useState<PrivateBooking[]>([]);
  const [studentList, setStudentList] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PrivateSlot | null>(null);

  const weekDates = getWeekDates(currentWeek);

  const studentMap = useMemo(() => {
    const map: Record<string, AppUser> = {};
    studentList.forEach(s => { map[s.id] = s; });
    return map;
  }, [studentList]);

  const loadData = useCallback(async () => {
    if (!db || !user) return;
    setLoading(true);
    try {
      const [slotsSnap, bookingsSnap, usersSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'privateSlots'),
          where('teacherId', '==', user.uid),
        )),
        getDocs(query(
          collection(db, 'privateBookings'),
          where('teacherId', '==', user.uid),
        )),
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
      ]);

      setSlots(slotsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PrivateSlot)));
      setBookings(bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PrivateBooking)));
      setStudentList(usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser)));
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const getBookingForSlot = (slotId: string) => {
    return bookings.find(b => b.slotId === slotId && !['cancelled_consumed', 'rescheduled'].includes(b.status));
  };

  const getSlotsForDate = (date: Date) => {
    return slots.filter(slot => {
      const d = toDate(slot.startAt);
      return formatDate(d) === formatDate(date);
    });
  };

  return (
    <ProtectedRoute allowedRoles={['teacher']}>
      <TeacherLayout>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">マイスケジュール</h2>
              <p className="mt-1 text-sm text-gray-600">自分の空き枠と予約を管理</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-[6px] hover:bg-blue-700 transition-colors min-h-[44px] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              空き枠を追加
            </button>
          </div>

          {/* 週ナビゲーション */}
          <div className="flex items-center justify-between bg-white border border-gray-200 p-4">
            <button onClick={() => { const d = new Date(currentWeek); d.setDate(d.getDate() - 7); setCurrentWeek(d); }} className="p-2 hover:bg-gray-100 rounded min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-gray-900">
                {formatDateJa(weekDates[0])} - {formatDateJa(weekDates[6])}
              </span>
              <button onClick={() => setCurrentWeek(new Date())} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-[6px] transition-colors min-h-[44px]">
                今週
              </button>
            </div>
            <button onClick={() => { const d = new Date(currentWeek); d.setDate(d.getDate() + 7); setCurrentWeek(d); }} className="p-2 hover:bg-gray-100 rounded min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 凡例 */}
          <div className="flex gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-300 rounded" /> 空き</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded" /> 予約済み</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 border border-gray-300 rounded" /> 閉鎖</span>
          </div>

          {/* カレンダー */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="bg-white border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  {/* ヘッダー */}
                  <div className="grid grid-cols-8 border-b border-gray-200">
                    <div className="p-2 text-xs text-gray-500 border-r border-gray-200" />
                    {weekDates.map((date, i) => {
                      const isToday = formatDate(date) === formatDate(new Date());
                      return (
                        <div key={i} className={`p-2 text-center border-r border-gray-200 last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}>
                          <p className="text-xs text-gray-500">{getDayName(date)}</p>
                          <p className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                            {date.getDate()}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* 時間グリッド */}
                  <div className="grid grid-cols-8">
                    {/* 時間列 */}
                    <div className="border-r border-gray-200">
                      {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                        <div key={i} className="border-b border-gray-100 text-xs text-gray-400 text-right pr-2 pt-1" style={{ height: HOUR_HEIGHT }}>
                          {START_HOUR + i}:00
                        </div>
                      ))}
                    </div>

                    {/* 日ごとの列 */}
                    {weekDates.map((date, dayIdx) => {
                      const daySlots = getSlotsForDate(date);
                      const isToday = formatDate(date) === formatDate(new Date());
                      const layoutItems = daySlots.map(slot => {
                        const start = toDate(slot.startAt);
                        const end = toDate(slot.endAt);
                        return {
                          id: slot.id,
                          startMinutes: start.getHours() * 60 + start.getMinutes(),
                          endMinutes: end.getHours() * 60 + end.getMinutes(),
                        };
                      });
                      const overlapLayout = calculateOverlapLayout(layoutItems);

                      return (
                        <div key={dayIdx} className={`relative border-r border-gray-200 last:border-r-0 ${isToday ? 'bg-blue-50/30' : ''}`} style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
                          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                            <div key={i} className="border-b border-gray-100" style={{ height: HOUR_HEIGHT }} />
                          ))}

                          {daySlots.map(slot => {
                            const start = toDate(slot.startAt);
                            const end = toDate(slot.endAt);
                            const startMin = start.getHours() * 60 + start.getMinutes();
                            const endMin = end.getHours() * 60 + end.getMinutes();
                            const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                            const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24);
                            const layout = overlapLayout[slot.id];
                            const colIndex = layout?.columnIndex ?? 0;
                            const totalCols = layout?.totalColumns ?? 1;
                            const colWidthPct = 100 / totalCols;
                            const leftPct = colIndex * colWidthPct;

                            const booking = getBookingForSlot(slot.id);
                            const effectiveStatus = booking ? 'booked' : slot.status;
                            const colors = statusColors[effectiveStatus] || statusColors.open;

                            return (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(slot)}
                                className={`absolute ${colors.bg} ${colors.text} rounded text-xs p-1 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity text-left`}
                                style={{
                                  top,
                                  height,
                                  left: `calc(${leftPct}% + 2px)`,
                                  width: `calc(${colWidthPct}% - 4px)`,
                                  zIndex: 5 + colIndex,
                                }}
                              >
                                <span className="font-semibold truncate block">
                                  {formatTime(start)}{totalCols === 1 ? ` - ${formatTime(end)}` : ''}
                                </span>
                                {slot.title && height > 28 && (
                                  <span className="block truncate font-medium">{slot.title}</span>
                                )}
                                {booking && height > 44 && (
                                  <span className="block truncate opacity-80">
                                    {studentMap[booking.studentId]?.displayName || '生徒'}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {showAddModal && (
          <AddSlotModal
            teacherId={user?.uid || ''}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => { setShowAddModal(false); loadData(); }}
          />
        )}

        {selectedSlot && (
          <SlotDetailModal
            slot={selectedSlot}
            booking={getBookingForSlot(selectedSlot.id) || null}
            student={getBookingForSlot(selectedSlot.id) ? studentMap[getBookingForSlot(selectedSlot.id)!.studentId] : undefined}
            onClose={() => setSelectedSlot(null)}
            onRefresh={loadData}
          />
        )}
      </TeacherLayout>
    </ProtectedRoute>
  );
}

/* ==================== 空き枠追加モーダル ==================== */

interface AddSlotModalProps {
  teacherId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddSlotModal({ teacherId, onClose, onSuccess }: AddSlotModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(formatDate(new Date()));
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const timeOptions = useMemo(() => {
    return Array.from({ length: 52 }, (_, i) => {
      const hour = Math.floor(i / 4) + 9;
      const min = (i % 4) * 15;
      return `${hour}:${min.toString().padStart(2, '0')}`;
    }).filter(t => parseInt(t.split(':')[0]) <= 21);
  }, []);

  const durationOptions = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => (i + 1) * 15);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setError('');
    setSubmitting(true);

    try {
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = startTime.split(':').map(Number);
      const startDate = new Date(year, month - 1, day, hour, minute);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      const weekStart = new Date(startDate);
      const d = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - d + (d === 0 ? -6 : 1));
      const weekKey = formatDate(weekStart);

      const slotRef = doc(collection(db, 'privateSlots'));
      await setDoc(slotRef, {
        id: slotRef.id,
        teacherId,
        title: title.trim() || null,
        startAt: Timestamp.fromDate(startDate),
        endAt: Timestamp.fromDate(endDate),
        status: 'open',
        source: 'teacher_managed',
        note: null,
        weekKey,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      onSuccess();
    } catch (err: unknown) {
      console.error('Error creating slot:', err);
      const firebaseErr = err as { code?: string; message?: string };
      setError(`作成に失敗しました: ${firebaseErr.code || firebaseErr.message || '不明なエラー'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-none border border-gray-200 w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">空き枠を追加</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">授業名</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例：英会話レッスン、IELTS対策"
              className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
              <select value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]">
                {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">時間（分）</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]">
                {durationOptions.map(d => <option key={d} value={d}>{d}分</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 text-sm font-medium rounded-[6px] text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors min-h-[44px]"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-[6px] hover:bg-blue-700 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {submitting ? '作成中...' : '空き枠を作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==================== スロット詳細モーダル ==================== */

interface SlotDetailModalProps {
  slot: PrivateSlot;
  booking: PrivateBooking | null;
  student?: AppUser;
  onClose: () => void;
  onRefresh: () => void;
}

function SlotDetailModal({ slot, booking, student, onClose, onRefresh }: SlotDetailModalProps) {
  const [processing, setProcessing] = useState(false);
  const start = toDate(slot.startAt);
  const end = toDate(slot.endAt);
  const dur = Math.round((end.getTime() - start.getTime()) / 60000);

  const handleComplete = async () => {
    if (!db || !booking) return;
    if (!confirm('この授業を「完了」にしますか？')) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'privateBookings', booking.id), {
        status: 'completed' as BookingStatus,
        'consumption.consumedCount': 1,
        'consumption.consumedAt': Timestamp.now(),
        'consumption.consumedReason': 'booking_completed',
        updatedAt: Timestamp.now(),
      });
      onRefresh(); onClose();
    } catch (e) { console.error(e); alert('更新に失敗しました'); }
    finally { setProcessing(false); }
  };

  const handleNoShow = async () => {
    if (!db || !booking) return;
    if (!confirm('ノーショーとして記録しますか？回数は消化されます。')) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'privateBookings', booking.id), {
        status: 'no_show_consumed' as BookingStatus,
        'consumption.consumedCount': 1,
        'consumption.consumedAt': Timestamp.now(),
        'consumption.consumedReason': 'no_show',
        updatedAt: Timestamp.now(),
      });
      onRefresh(); onClose();
    } catch (e) { console.error(e); alert('更新に失敗しました'); }
    finally { setProcessing(false); }
  };

  const handleDeleteSlot = async () => {
    if (!db) return;
    if (booking) { alert('予約済みのスロットは削除できません'); return; }
    if (!confirm('この空き枠を削除しますか？')) return;
    setProcessing(true);
    try {
      await deleteDoc(doc(db, 'privateSlots', slot.id));
      onRefresh(); onClose();
    } catch (e) { console.error(e); alert('削除に失敗しました'); }
    finally { setProcessing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-none border border-gray-200 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">スロット詳細</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* ステータス */}
          <div>
            {booking ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                <User className="w-4 h-4" /> 予約済み
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-full ${statusColors[slot.status].bg} ${statusColors[slot.status].text}`}>
                <Clock className="w-4 h-4" /> {slot.status === 'open' ? '空き' : '閉鎖'}
              </span>
            )}
            {booking && booking.status === 'completed' && (
              <span className="ml-2 inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                <CheckCircle2 className="w-4 h-4" /> 完了
              </span>
            )}
            {booking && booking.status === 'no_show_consumed' && (
              <span className="ml-2 inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-full bg-orange-100 text-orange-800">
                <AlertTriangle className="w-4 h-4" /> ノーショー
              </span>
            )}
          </div>

          {/* 日時 */}
          <div className="border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-900">{formatDateJa(start)}</p>
            <p className="text-sm text-gray-600">{formatTime(start)} - {formatTime(end)}（{formatDuration(dur)}）</p>
          </div>

          {/* 生徒情報 */}
          {booking && student && (
            <div className="border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">生徒</p>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{student.displayName || '不明'}</p>
                  <p className="text-xs text-gray-500">{student.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* アクション */}
          {booking && booking.status === 'booked' && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-gray-500 font-medium">授業ステータスの変更</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleComplete} disabled={processing} className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-[6px] hover:bg-green-700 transition-colors disabled:opacity-50 min-h-[44px]">
                  <CheckCircle2 className="w-4 h-4" /> 完了
                </button>
                <button onClick={handleNoShow} disabled={processing} className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white text-sm font-medium rounded-[6px] hover:bg-orange-700 transition-colors disabled:opacity-50 min-h-[44px]">
                  <AlertTriangle className="w-4 h-4" /> ノーショー
                </button>
              </div>
            </div>
          )}

          {!booking && slot.status === 'open' && (
            <button onClick={handleDeleteSlot} disabled={processing} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white text-sm font-medium rounded-[6px] hover:bg-red-700 transition-colors disabled:opacity-50 min-h-[44px]">
              <Trash2 className="w-4 h-4" /> 空き枠を削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
