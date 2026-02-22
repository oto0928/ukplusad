'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/lib/components/ProtectedRoute';
import { AdminLayout } from '@/lib/components/AdminLayout';
import { getWeekDates, formatDate, getDayName, formatTime } from '@/lib/utils';
import { PrivateSlot, PrivateBooking } from '@/lib/types';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export default function CalendarPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [slots, setSlots] = useState<PrivateSlot[]>([]);
  const [bookings, setBookings] = useState<PrivateBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');

  const weekDates = getWeekDates(currentWeek);

  const teachers = [
    { id: 'all', name: 'すべて' },
    { id: 'tony_w', name: 'Tony W' },
    { id: 'trina', name: 'Trina' },
    { id: 'mark', name: 'Mark' },
    { id: 'vee', name: 'Vee' },
  ];

  useEffect(() => {
    loadWeekData();
  }, [currentWeek, selectedTeacher]);

  const loadWeekData = async () => {
    setLoading(true);
    try {
      const startOfWeek = weekDates[0];
      const endOfWeek = new Date(weekDates[6]);
      endOfWeek.setHours(23, 59, 59, 999);

      // スロットを取得
      let slotsQuery = query(
        collection(db, 'privateSlots'),
        where('startAt', '>=', Timestamp.fromDate(startOfWeek)),
        where('startAt', '<=', Timestamp.fromDate(endOfWeek))
      );

      const slotsSnapshot = await getDocs(slotsQuery);
      const slotsData = slotsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PrivateSlot[];

      // 教師でフィルタ
      const filteredSlots = selectedTeacher === 'all' 
        ? slotsData 
        : slotsData.filter(slot => slot.teacherId === selectedTeacher);

      setSlots(filteredSlots);

      // 予約を取得
      let bookingsQuery = query(
        collection(db, 'privateBookings'),
        where('status', '==', 'booked')
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PrivateBooking[];

      setBookings(bookingsData);
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

  return (
    <ProtectedRoute allowedRoles={['admin', 'teacher']}>
      <AdminLayout>
        <div className="space-y-4">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">予約カレンダー</h2>
              <p className="mt-1 text-sm text-gray-600">
                プライベートレッスンの予約状況
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              + 新規予約
            </button>
          </div>

          {/* コントロール */}
          <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPreviousWeek}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                ←
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                今週
              </button>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                →
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
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>

          {/* カレンダーグリッド */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  {/* ヘッダー行（曜日） */}
                  <div className="grid grid-cols-8 border-b border-gray-200">
                    <div className="p-4 text-sm font-medium text-gray-500 border-r border-gray-200">
                      時間
                    </div>
                    {weekDates.map((date, index) => (
                      <div
                        key={index}
                        className={`p-4 text-center border-r border-gray-200 last:border-r-0 ${
                          formatDate(date) === formatDate(new Date())
                            ? 'bg-blue-50'
                            : ''
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {getDayName(date)}
                        </div>
                        <div className={`text-2xl font-bold mt-1 ${
                          formatDate(date) === formatDate(new Date())
                            ? 'text-blue-600'
                            : 'text-gray-900'
                        }`}>
                          {date.getDate()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* タイムスロット */}
                  <div className="relative">
                    {Array.from({ length: 13 }, (_, i) => i + 9).map((hour) => (
                      <div key={hour} className="grid grid-cols-8 border-b border-gray-200">
                        <div className="p-2 text-xs text-gray-500 border-r border-gray-200">
                          {`${hour}:00`}
                        </div>
                        {weekDates.map((date, dayIndex) => (
                          <div
                            key={dayIndex}
                            className={`relative h-20 border-r border-gray-200 last:border-r-0 hover:bg-gray-50 transition-colors ${
                              formatDate(date) === formatDate(new Date())
                                ? 'bg-blue-50/30'
                                : ''
                            }`}
                          >
                            {/* ここにスロットと予約を表示 */}
                            <div className="p-1 space-y-1">
                              {slots
                                .filter((slot) => {
                                  const slotDate = slot.startAt.toDate();
                                  return (
                                    formatDate(slotDate) === formatDate(date) &&
                                    slotDate.getHours() === hour
                                  );
                                })
                                .map((slot) => (
                                  <div
                                    key={slot.id}
                                    className={`text-xs p-1 rounded ${
                                      slot.status === 'open'
                                        ? 'bg-green-100 text-green-800'
                                        : slot.status === 'booked'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {formatTime(slot.startAt.toDate())}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 凡例 */}
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
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span className="text-gray-700">クローズ</span>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
