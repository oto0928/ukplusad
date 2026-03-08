'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/lib/components/ProtectedRoute';
import { AdminLayout } from '@/lib/components/AdminLayout';
import { getWeekDates, formatDate, getDayName, formatTime, formatDuration, calculateOverlapLayout } from '@/lib/utils';
import { PrivateSlot, PrivateBooking, AppUser } from '@/lib/types';
import { collection, query, where, getDocs, Timestamp, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { X, ChevronLeft, ChevronRight, Clock, User, Video, FileText, Trash2, XCircle, RotateCcw, Lock, Unlock } from 'lucide-react';

const HOUR_HEIGHT = 80;
const START_HOUR = 9;
const END_HOUR = 22;

export default function CalendarPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [slots, setSlots] = useState<PrivateSlot[]>([]);
  const [bookings, setBookings] = useState<PrivateBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PrivateSlot | null>(null);
  const [teacherList, setTeacherList] = useState<AppUser[]>([]);
  const [studentList, setStudentList] = useState<AppUser[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  const weekDates = getWeekDates(currentWeek);

  const userMap = useMemo(() => {
    const map: Record<string, AppUser> = {};
    allUsers.forEach(u => { map[u.id] = u; });
    return map;
  }, [allUsers]);

  const filterTeachers = useMemo(() => [
    { id: 'all', name: 'すべて' },
    ...teacherList.map(t => ({ id: t.id, name: t.displayName || t.email || '名前未設定' })),
  ], [teacherList]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!db) return;
    try {
      const snap = await getDocs(collection(db, 'users'));
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser));
      setAllUsers(users);
      setTeacherList(users.filter(u => u.role === 'teacher'));
      setStudentList(users.filter(u => u.role === 'student'));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  useEffect(() => {
    loadWeekData();
  }, [currentWeek, selectedTeacher]);

  const loadWeekData = async () => {
    setLoading(true);
    try {
      const startOfWeek = weekDates[0];
      const endOfWeek = new Date(weekDates[6]);
      endOfWeek.setHours(23, 59, 59, 999);

      const slotsQuery = query(
        collection(db, 'privateSlots'),
        where('startAt', '>=', Timestamp.fromDate(startOfWeek)),
        where('startAt', '<=', Timestamp.fromDate(endOfWeek))
      );
      const slotsSnapshot = await getDocs(slotsQuery);
      const slotsData = slotsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as PrivateSlot[];

      const filteredSlots = selectedTeacher === 'all'
        ? slotsData
        : slotsData.filter(slot => slot.teacherId === selectedTeacher);
      setSlots(filteredSlots);

      const bookingsSnapshot = await getDocs(collection(db, 'privateBookings'));
      setBookings(bookingsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as PrivateBooking[]);
    } catch (error) {
      console.error('Error loading week data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeek(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeek(newWeek);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const getSlotsForDate = (date: Date) => {
    return slots.filter(slot => {
      const slotDate = slot.startAt.toDate();
      return formatDate(slotDate) === formatDate(date);
    });
  };

  const getBookingForSlot = (slotId: string) => {
    return bookings.find(b => b.slotId === slotId);
  };

  const getSlotPosition = (slot: PrivateSlot) => {
    const start = slot.startAt.toDate();
    const end = slot.endAt.toDate();
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 24);
    return { top, height };
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!db) return;
    if (!confirm('この空き枠を削除しますか？')) return;
    try {
      await deleteDoc(doc(db, 'privateSlots', slotId));
      setSelectedSlot(null);
      loadWeekData();
    } catch (error) {
      console.error('Error deleting slot:', error);
      alert('削除に失敗しました');
    }
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

  return (
    <ProtectedRoute allowedRoles={['admin', 'teacher']}>
      <AdminLayout>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">予約カレンダー</h2>
              <p className="mt-1 text-sm text-gray-600">プライベートレッスンの予約状況</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-[6px] hover:bg-blue-700 transition-colors min-h-[44px]"
            >
              + 空き枠を追加
            </button>
          </div>

          <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPreviousWeek}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                今週
              </button>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="text-lg font-semibold text-gray-900">
                {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
              </span>
            </div>

            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filterTeachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-auto max-h-[calc(100vh-280px)]">
                <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="p-3 text-sm font-medium text-gray-500 border-r border-gray-200">時間</div>
                  {weekDates.map((date, index) => (
                    <div
                      key={index}
                      className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                        formatDate(date) === formatDate(new Date()) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">{getDayName(date)}</div>
                      <div className={`text-2xl font-bold mt-1 ${
                        formatDate(date) === formatDate(new Date()) ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {date.getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[64px_repeat(7,1fr)]">
                  <div>
                    {hours.map(hour => (
                      <div key={hour} className="h-20 border-b border-r border-gray-200 p-2 text-xs text-gray-500">
                        {hour}:00
                      </div>
                    ))}
                  </div>

                  {weekDates.map((date, dayIndex) => {
                    const daySlots = getSlotsForDate(date);
                    const layoutItems = daySlots.map(slot => {
                      const start = slot.startAt.toDate();
                      const end = slot.endAt.toDate();
                      return {
                        id: slot.id,
                        startMinutes: start.getHours() * 60 + start.getMinutes(),
                        endMinutes: end.getHours() * 60 + end.getMinutes(),
                      };
                    });
                    const overlapLayout = calculateOverlapLayout(layoutItems);

                    return (
                      <div key={dayIndex} className="relative border-r border-gray-200 last:border-r-0">
                        {hours.map(hour => (
                          <div
                            key={hour}
                            className={`h-20 border-b border-gray-200 ${
                              formatDate(date) === formatDate(new Date()) ? 'bg-blue-50/30' : ''
                            }`}
                          />
                        ))}

                        {daySlots.map(slot => {
                          const { top, height } = getSlotPosition(slot);
                          const layout = overlapLayout[slot.id];
                          const colIndex = layout?.columnIndex ?? 0;
                          const totalCols = layout?.totalColumns ?? 1;
                          const colWidthPct = 100 / totalCols;
                          const leftPct = colIndex * colWidthPct;

                          const booking = getBookingForSlot(slot.id);
                          const teacher = userMap[slot.teacherId];
                          const student = booking ? userMap[booking.studentId] : null;
                          const isCancelled = booking && (booking.status === 'cancelled_consumed' || booking.status === 'rescheduled');

                          const slotColor = isCancelled
                            ? 'bg-orange-100 border-orange-300 text-orange-800'
                            : slot.status === 'open'
                            ? 'bg-green-100 border-green-300 text-green-800'
                            : slot.status === 'booked'
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-gray-100 border-gray-300 text-gray-600';

                          return (
                            <div
                              key={slot.id}
                              className={`absolute rounded cursor-pointer overflow-hidden border transition-opacity hover:opacity-90 ${slotColor}`}
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${colWidthPct}% - 4px)`,
                                zIndex: 5 + colIndex,
                              }}
                              onClick={() => setSelectedSlot(slot)}
                            >
                              <div className="p-1 h-full flex flex-col text-xs">
                                <div className="font-semibold whitespace-nowrap truncate">
                                  {formatTime(slot.startAt.toDate())}{totalCols === 1 ? ` - ${formatTime(slot.endAt.toDate())}` : ''}
                                </div>
                                {slot.title && height > 28 && (
                                  <div className="truncate font-medium">{slot.title}</div>
                                )}
                                {height > 44 && teacher && (
                                  <div className="truncate opacity-80">{teacher.displayName || teacher.email}</div>
                                )}
                                {height > 64 && (
                                  isCancelled
                                    ? <div className="truncate mt-auto opacity-70">キャンセル済</div>
                                    : booking && student && <div className="truncate mt-auto opacity-70">{student.displayName}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-gray-700">空き</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span className="text-gray-700">予約済み</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
              <span className="text-gray-700">キャンセル済</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span className="text-gray-700">クローズ</span>
            </div>
          </div>

          {showAddModal && (
            <AddBookingModal
              teachers={teacherList}
              onClose={() => setShowAddModal(false)}
              onSuccess={() => {
                setShowAddModal(false);
                loadWeekData();
              }}
            />
          )}

          {selectedSlot && (
            <SlotDetailModal
              slot={selectedSlot}
              booking={getBookingForSlot(selectedSlot.id) || null}
              userMap={userMap}
              onClose={() => setSelectedSlot(null)}
              onDelete={handleDeleteSlot}
              onRefresh={loadWeekData}
            />
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

interface AddBookingModalProps {
  teachers: AppUser[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddBookingModal({ teachers, onClose, onSuccess }: AddBookingModalProps) {
  const { user } = useAuth();
  const [teacherId, setTeacherId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const timeOptions = Array.from({ length: 52 }, (_, i) => {
    const hour = Math.floor(i / 4) + 9;
    const min = (i % 4) * 15;
    return `${hour}:${min.toString().padStart(2, '0')}`;
  }).filter(t => {
    const h = parseInt(t.split(':')[0]);
    return h >= 9 && h <= 21;
  });

  const durationOptions = Array.from({ length: 17 }, (_, i) => (i + 1) * 15).filter(d => d <= 240);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!db) {
      setError('Firebaseの接続設定が正しくありません。');
      return;
    }
    if (!teacherId || !date) {
      setError('教師と日付を選択してください。');
      return;
    }

    setSubmitting(true);

    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const [year, month, dayNum] = date.split('-').map(Number);
      const startAt = new Date(year, month - 1, dayNum, hours, minutes, 0, 0);

      const endAt = new Date(startAt);
      endAt.setMinutes(endAt.getMinutes() + duration);

      const weekDay = startAt.getDay();
      const diff = startAt.getDate() - weekDay + (weekDay === 0 ? -6 : 1);
      const monday = new Date(startAt);
      monday.setDate(diff);
      const weekKey = formatDate(monday);

      const slotRef = doc(collection(db, 'privateSlots'));
      const slotData = {
        id: slotRef.id,
        teacherId,
        title: title.trim() || null,
        startAt: Timestamp.fromDate(startAt),
        endAt: Timestamp.fromDate(endAt),
        status: 'open' as const,
        source: 'admin_managed' as const,
        note: null,
        weekKey,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await setDoc(slotRef, slotData);

      onSuccess();
    } catch (err: unknown) {
      console.error('Error creating booking:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`空き枠の作成に失敗しました: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-none border border-gray-200 w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">空き枠を追加</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="booking-teacher" className="block text-sm font-medium text-gray-700">
              教師
            </label>
            <select
              id="booking-teacher"
              required
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm min-h-[44px]"
            >
              <option value="">選択してください</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.displayName || t.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="booking-title" className="block text-sm font-medium text-gray-700">
              授業名
            </label>
            <input
              id="booking-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：英会話レッスン、IELTS対策"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="booking-date" className="block text-sm font-medium text-gray-700">
              日付
            </label>
            <input
              id="booking-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="booking-time" className="block text-sm font-medium text-gray-700">
                開始時間
              </label>
              <select
                id="booking-time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm min-h-[44px]"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="booking-duration" className="block text-sm font-medium text-gray-700">
                時間（分）
              </label>
              <select
                id="booking-duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm min-h-[44px]"
              >
                {durationOptions.map((d) => (
                  <option key={d} value={d}>{d}分</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

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
              className="flex-1 py-3 px-4 text-sm font-medium rounded-[6px] text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            >
              {submitting ? '作成中...' : '空き枠を作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SlotDetailModalProps {
  slot: PrivateSlot;
  booking: PrivateBooking | null;
  userMap: Record<string, AppUser>;
  onClose: () => void;
  onDelete: (slotId: string) => void;
  onRefresh: () => void;
}

function SlotDetailModal({ slot, booking, userMap, onClose, onDelete, onRefresh }: SlotDetailModalProps) {
  const [processing, setProcessing] = useState(false);
  const [editingZoom, setEditingZoom] = useState(false);
  const [zoomURL, setZoomURL] = useState(booking?.zoomURL || '');
  const teacher = userMap[slot.teacherId];
  const student = booking ? userMap[booking.studentId] : null;
  const startDate = slot.startAt.toDate();
  const endDate = slot.endAt.toDate();
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
  const isCancelled = booking && (booking.status === 'cancelled_consumed' || booking.status === 'rescheduled');

  const slotStatusConfig: Record<string, { label: string; className: string }> = {
    open: { label: '空き', className: 'bg-green-100 text-green-800' },
    booked: { label: '予約済み', className: 'bg-blue-100 text-blue-800' },
    closed: { label: 'クローズ', className: 'bg-gray-100 text-gray-600' },
  };
  const status = slotStatusConfig[slot.status] || slotStatusConfig.open;

  const bookingStatusLabels: Record<string, string> = {
    booked: '確定',
    completed: '完了',
    cancelled_consumed: 'キャンセル済（消化）',
    rescheduled: '振替済',
    no_show_consumed: '欠席（消化）',
  };

  const handleCancelBooking = async () => {
    if (!db || !booking) return;
    if (!confirm('この予約をキャンセルしますか？スロットは空き状態に戻ります。')) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'privateBookings', booking.id), {
        status: 'cancelled_consumed',
        cancelledAt: Timestamp.now(),
        cancellationReason: '管理者によるキャンセル',
        updatedAt: Timestamp.now(),
      });
      await updateDoc(doc(db, 'privateSlots', slot.id), {
        status: 'open',
        updatedAt: Timestamp.now(),
      });
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('キャンセルに失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestoreSlotToOpen = async () => {
    if (!db) return;
    if (!confirm('このスロットを「空き」状態に戻しますか？')) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'privateSlots', slot.id), {
        status: 'open',
        updatedAt: Timestamp.now(),
      });
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error restoring slot:', error);
      alert('更新に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseSlot = async () => {
    if (!db) return;
    if (!confirm('このスロットを「クローズ」にしますか？生徒は予約できなくなります。')) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'privateSlots', slot.id), {
        status: 'closed',
        updatedAt: Timestamp.now(),
      });
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error closing slot:', error);
      alert('更新に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-none border border-gray-200 w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">予約詳細</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isCancelled ? 'bg-orange-100 text-orange-800' : status.className
            }`}>
              {isCancelled ? 'キャンセル済' : status.label}
            </span>
            <span className="text-sm text-gray-500">{formatDuration(durationMinutes)}</span>
          </div>

          <div className="border border-gray-200 rounded p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {startDate.getFullYear()}年{startDate.getMonth() + 1}月{startDate.getDate()}日（{getDayName(startDate)}）
                </div>
                <div className="text-sm text-gray-600">
                  {formatTime(startDate)} - {formatTime(endDate)}
                </div>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded p-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">教師</div>
                <div className="text-sm font-medium text-gray-900">
                  {teacher?.displayName || teacher?.email || '不明'}
                </div>
                {teacher?.email && (
                  <div className="text-xs text-gray-500">{teacher.email}</div>
                )}
              </div>
            </div>
          </div>

          {booking ? (
            <div className={`border rounded p-4 space-y-3 ${
              isCancelled ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'
            }`}>
              <div className={`text-sm font-medium ${isCancelled ? 'text-orange-800' : 'text-blue-800'}`}>
                予約情報
              </div>

              <div className="flex items-center gap-3">
                <User className={`w-5 h-5 flex-shrink-0 ${isCancelled ? 'text-orange-400' : 'text-blue-400'}`} />
                <div>
                  <div className={`text-xs ${isCancelled ? 'text-orange-600' : 'text-blue-600'}`}>生徒</div>
                  <div className={`text-sm font-medium ${isCancelled ? 'text-orange-900' : 'text-blue-900'}`}>
                    {student?.displayName || '不明'}
                  </div>
                  {student?.email && (
                    <div className={`text-xs ${isCancelled ? 'text-orange-600' : 'text-blue-600'}`}>{student.email}</div>
                  )}
                </div>
              </div>

              <div className={`space-y-1 text-xs ${isCancelled ? 'text-orange-600' : 'text-blue-600'}`}>
                <div>予約ステータス: {bookingStatusLabels[booking.status] || booking.status}</div>
                {booking.bookedAt && (
                  <div>予約日時: {booking.bookedAt.toDate().toLocaleString('ja-JP')}</div>
                )}
                {booking.cancelledAt && (
                  <div>キャンセル日時: {booking.cancelledAt.toDate().toLocaleString('ja-JP')}</div>
                )}
                {booking.cancellationReason && (
                  <div>キャンセル理由: {booking.cancellationReason}</div>
                )}
              </div>

              {!isCancelled && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    {editingZoom ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="url"
                          value={zoomURL}
                          onChange={e => setZoomURL(e.target.value)}
                          placeholder="https://zoom.us/j/..."
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={async () => {
                            if (!db || !booking) return;
                            try {
                              await updateDoc(doc(db, 'privateBookings', booking.id), { zoomURL: zoomURL || null, updatedAt: Timestamp.now() });
                              setEditingZoom(false);
                              onRefresh();
                            } catch { alert('保存に失敗しました'); }
                          }}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >保存</button>
                        <button onClick={() => { setEditingZoom(false); setZoomURL(booking?.zoomURL || ''); }} className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800">取消</button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        {booking?.zoomURL ? (
                          <a href={booking.zoomURL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline truncate max-w-[240px]">{booking.zoomURL}</a>
                        ) : (
                          <span className="text-sm text-blue-500">Zoom URL: 未設定</span>
                        )}
                        <button onClick={() => setEditingZoom(true)} className="text-xs text-blue-600 hover:text-blue-800 ml-2 whitespace-nowrap">編集</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded p-4 text-center text-sm text-gray-500">
              まだ予約はありません
            </div>
          )}

          {slot.note && (
            <div className="border border-gray-200 rounded p-4">
              <div className="text-xs text-gray-500 mb-1">メモ</div>
              <div className="text-sm text-gray-700">{slot.note}</div>
            </div>
          )}

          <div className="space-y-2 pt-2">
            {/* 開放 / クローズ切り替え */}
            {!booking && slot.status === 'open' && (
              <button
                onClick={handleCloseSlot}
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[6px] transition-colors min-h-[44px] disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                {processing ? '処理中...' : 'クローズする'}
              </button>
            )}

            {!booking && slot.status === 'closed' && (
              <button
                onClick={handleRestoreSlotToOpen}
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-[6px] transition-colors min-h-[44px] disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                {processing ? '処理中...' : '開放する'}
              </button>
            )}

            {/* 予約キャンセル */}
            {booking && booking.status === 'booked' && (
              <button
                onClick={handleCancelBooking}
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-[6px] transition-colors min-h-[44px] disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {processing ? '処理中...' : '予約をキャンセル'}
              </button>
            )}

            {/* キャンセル済スロットを空きに戻す */}
            {isCancelled && (
              <button
                onClick={handleRestoreSlotToOpen}
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-[6px] transition-colors min-h-[44px] disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {processing ? '処理中...' : 'スロットを空きに戻す'}
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => onDelete(slot.id)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-[6px] transition-colors min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                削除
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 text-sm font-medium rounded-[6px] text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
