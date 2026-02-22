'use client';

import { ProtectedRoute } from '@/lib/components/ProtectedRoute';
import { AdminLayout } from '@/lib/components/AdminLayout';

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">ダッシュボード</h2>
            <p className="mt-1 text-sm text-gray-600">
              本日の予約状況と重要な情報を確認できます
            </p>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="本日の予約"
              value="12"
              subtitle="件"
              icon="📅"
              color="blue"
            />
            <StatCard
              title="今週の予約"
              value="48"
              subtitle="件"
              icon="📊"
              color="green"
            />
            <StatCard
              title="アクティブ生徒"
              value="145"
              subtitle="人"
              icon="👨‍🎓"
              color="purple"
            />
            <StatCard
              title="教師数"
              value="4"
              subtitle="人"
              icon="👨‍🏫"
              color="orange"
            />
          </div>

          {/* 本日の予約リスト */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              本日の予約
            </h3>
            <div className="space-y-3">
              <BookingItem
                time="10:00 - 11:00"
                student="山田 太郎"
                teacher="Tony W"
                type="プライベート"
              />
              <BookingItem
                time="11:30 - 12:30"
                student="佐藤 花子"
                teacher="Trina"
                type="プライベート"
              />
              <BookingItem
                time="14:00 - 15:00"
                student="鈴木 一郎"
                teacher="Mark"
                type="プライベート"
              />
            </div>
          </div>

          {/* 最近のお知らせ */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              最近のお知らせ
            </h3>
            <div className="space-y-3">
              <AnnouncementItem
                title="年末年始の営業について"
                date="2026-02-20"
                importance="important"
              />
              <AnnouncementItem
                title="新しい教材の追加"
                date="2026-02-18"
                importance="normal"
              />
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline mt-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <span className="ml-2 text-sm text-gray-600">{subtitle}</span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface BookingItemProps {
  time: string;
  student: string;
  teacher: string;
  type: string;
}

function BookingItem({ time, student, teacher, type }: BookingItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center space-x-4">
        <div className="w-20 text-sm font-medium text-gray-900">{time}</div>
        <div>
          <p className="text-sm font-medium text-gray-900">{student}</p>
          <p className="text-xs text-gray-600">
            {teacher} • {type}
          </p>
        </div>
      </div>
      <button className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100">
        詳細
      </button>
    </div>
  );
}

interface AnnouncementItemProps {
  title: string;
  date: string;
  importance: 'normal' | 'important' | 'urgent';
}

function AnnouncementItem({ title, date, importance }: AnnouncementItemProps) {
  const badgeColors = {
    normal: 'bg-gray-100 text-gray-700',
    important: 'bg-yellow-100 text-yellow-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const badgeLabels = {
    normal: '通常',
    important: '重要',
    urgent: '緊急',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-600 mt-1">{date}</p>
      </div>
      <span className={`px-2 py-1 text-xs font-medium rounded ${badgeColors[importance]}`}>
        {badgeLabels[importance]}
      </span>
    </div>
  );
}
