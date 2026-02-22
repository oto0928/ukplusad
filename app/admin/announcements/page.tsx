'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/lib/components/ProtectedRoute';
import { AdminLayout } from '@/lib/components/AdminLayout';
import { Announcement, UserRole, AnnouncementImportance } from '@/lib/types';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { formatDateTime, toDate } from '@/lib/utils';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const announcementsQuery = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const announcementsSnapshot = await getDocs(announcementsQuery);
      const announcementsData = announcementsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Announcement[];
      setAnnouncements(announcementsData);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">お知らせ管理</h2>
              <p className="mt-1 text-sm text-gray-600">
                生徒・教師へのお知らせの作成と管理
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + お知らせを作成
            </button>
          </div>

          {/* 統計 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="総お知らせ数"
              value={announcements.length.toString()}
              color="blue"
            />
            <StatCard
              title="ピン留め"
              value={announcements.filter(a => a.pinned).length.toString()}
              color="yellow"
            />
            <StatCard
              title="重要"
              value={announcements.filter(a => a.importance === 'important').length.toString()}
              color="orange"
            />
            <StatCard
              title="緊急"
              value={announcements.filter(a => a.importance === 'urgent').length.toString()}
              color="red"
            />
          </div>

          {/* お知らせ一覧 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {announcements.map(announcement => (
                  <AnnouncementItem
                    key={announcement.id}
                    announcement={announcement}
                  />
                ))}
                {announcements.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-500">お知らせがまだありません</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 作成モーダル（簡易版） */}
        {showCreateModal && (
          <CreateAnnouncementModal onClose={() => setShowCreateModal(false)} />
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  color: 'blue' | 'yellow' | 'orange' | 'red';
}

function StatCard({ title, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    orange: 'bg-orange-50 border-orange-200',
    red: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${colorClasses[color]}`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

interface AnnouncementItemProps {
  announcement: Announcement;
}

function AnnouncementItem({ announcement }: AnnouncementItemProps) {
  const importanceColors = {
    normal: 'bg-gray-100 text-gray-700',
    important: 'bg-yellow-100 text-yellow-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const importanceLabels = {
    normal: '通常',
    important: '重要',
    urgent: '緊急',
  };

  const roleLabels: Record<UserRole, string> = {
    student: '生徒',
    teacher: '教師',
    admin: '管理者',
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            {announcement.pinned && (
              <span className="text-yellow-500 text-lg" title="ピン留め">
                📌
              </span>
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              {announcement.title}
            </h3>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                importanceColors[announcement.importance]
              }`}
            >
              {importanceLabels[announcement.importance]}
            </span>
          </div>
          
          <p className="text-sm text-gray-700 mb-3">{announcement.body}</p>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>{formatDateTime(toDate(announcement.createdAt))}</span>
            <span>•</span>
            <span>
              対象: {announcement.audienceRoles.map(role => roleLabels[role]).join(', ')}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2 ml-4">
          <button className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors">
            編集
          </button>
          <button className="px-3 py-1 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors">
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateAnnouncementModalProps {
  onClose: () => void;
}

function CreateAnnouncementModal({ onClose }: CreateAnnouncementModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [importance, setImportance] = useState<AnnouncementImportance>('normal');
  const [pinned, setPinned] = useState(false);
  const [audienceRoles, setAudienceRoles] = useState<UserRole[]>(['student']);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Firestore への保存処理
    console.log({ title, body, importance, pinned, audienceRoles });
    onClose();
  };

  const toggleRole = (role: UserRole) => {
    if (audienceRoles.includes(role)) {
      setAudienceRoles(audienceRoles.filter(r => r !== role));
    } else {
      setAudienceRoles([...audienceRoles, role]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">新しいお知らせを作成</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 本文 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              本文
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 重要度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              重要度
            </label>
            <select
              value={importance}
              onChange={(e) => setImportance(e.target.value as AnnouncementImportance)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="normal">通常</option>
              <option value="important">重要</option>
              <option value="urgent">緊急</option>
            </select>
          </div>

          {/* ピン留め */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="pinned"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="pinned" className="ml-2 text-sm text-gray-700">
              トップにピン留めする
            </label>
          </div>

          {/* 対象 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              配信対象
            </label>
            <div className="space-y-2">
              {(['student', 'teacher', 'admin'] as UserRole[]).map(role => (
                <div key={role} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`role-${role}`}
                    checked={audienceRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`role-${role}`} className="ml-2 text-sm text-gray-700">
                    {role === 'student' ? '生徒' : role === 'teacher' ? '教師' : '管理者'}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
