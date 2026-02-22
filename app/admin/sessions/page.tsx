'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/lib/components/ProtectedRoute';
import { AdminLayout } from '@/lib/components/AdminLayout';
import { Session, ClassModel } from '@/lib/types';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { formatDateTime, toDate } from '@/lib/utils';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // クラスを取得
      const classesSnapshot = await getDocs(collection(db, 'classes'));
      const classesData = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ClassModel[];
      setClasses(classesData);

      // セッションを取得
      const sessionsQuery = query(
        collection(db, 'sessions'),
        orderBy('startAt', 'desc'),
        limit(50)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionsData = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Session[];
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(session => {
    const now = new Date();
    const startDate = toDate(session.startAt);
    
    if (filter === 'upcoming') {
      return startDate >= now;
    } else if (filter === 'past') {
      return startDate < now;
    }
    return true;
  });

  const getClassName = (classId: string) => {
    const classData = classes.find(c => c.id === classId);
    return classData?.title || 'クラス名不明';
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'teacher']}>
      <AdminLayout>
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">授業管理</h2>
              <p className="mt-1 text-sm text-gray-600">
                クラスとセッションの管理
              </p>
            </div>
            <div className="flex space-x-3">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                + クラスを作成
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                + セッションを作成
              </button>
            </div>
          </div>

          {/* フィルター */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex space-x-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                すべて
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'upcoming'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                今後の授業
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'past'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                過去の授業
              </button>
            </div>
          </div>

          {/* クラス一覧 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">クラス一覧</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map(classItem => (
                <div
                  key={classItem.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{classItem.title}</h4>
                    {classItem.active ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        アクティブ
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        非アクティブ
                      </span>
                    )}
                  </div>
                  {classItem.level && (
                    <p className="text-sm text-gray-600 mb-2">レベル: {classItem.level}</p>
                  )}
                  {classItem.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{classItem.description}</p>
                  )}
                  <div className="mt-4 flex space-x-2">
                    <button className="flex-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors">
                      詳細
                    </button>
                    <button className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors">
                      編集
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* セッション一覧 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                セッション一覧 ({filteredSessions.length}件)
              </h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        タイトル
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        クラス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日時
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        形式
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSessions.map(session => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{session.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{getClassName(session.classId)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDateTime(toDate(session.startAt))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              session.modality === 'online'
                                ? 'bg-purple-100 text-purple-800'
                                : session.modality === 'in_person'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {session.modality === 'online'
                              ? 'オンライン'
                              : session.modality === 'in_person'
                              ? '対面'
                              : 'ハイブリッド'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              session.status === 'scheduled'
                                ? 'bg-green-100 text-green-800'
                                : session.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {session.status === 'scheduled'
                              ? '予定'
                              : session.status === 'cancelled'
                              ? 'キャンセル'
                              : '完了'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-4">
                            詳細
                          </button>
                          <button className="text-green-600 hover:text-green-900 mr-4">
                            編集
                          </button>
                          {session.modality === 'online' && session.zoomURL && (
                            <a
                              href={session.zoomURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-900"
                            >
                              Zoom
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
