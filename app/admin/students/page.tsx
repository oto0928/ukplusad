'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/lib/components/ProtectedRoute';
import { AdminLayout } from '@/lib/components/AdminLayout';
import { AppUser, Enrollment } from '@/lib/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { formatDateJa, toDate } from '@/lib/utils';

export default function StudentsPage() {
  const [students, setStudents] = useState<AppUser[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      // 生徒を取得
      const studentsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'student')
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AppUser[];

      setStudents(studentsData);

      // 各生徒の受講情報を取得
      const enrollmentsData: Record<string, Enrollment[]> = {};
      for (const student of studentsData) {
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('studentId', '==', student.id),
          where('status', '==', 'active')
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        enrollmentsData[student.id] = enrollmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Enrollment[];
      }

      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">生徒管理</h2>
              <p className="mt-1 text-sm text-gray-600">
                登録されている生徒の一覧と受講状況
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              + 生徒を追加
            </button>
          </div>

          {/* 検索バー */}
          <div className="bg-white rounded-lg shadow p-4">
            <input
              type="text"
              placeholder="生徒名またはメールアドレスで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 生徒リスト */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
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
                        生徒名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        メールアドレス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        残り回数
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        有効期限
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
                    {filteredStudents.map((student) => {
                      const studentEnrollments = enrollments[student.id] || [];
                      const activeEnrollment = studentEnrollments[0];

                      return (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                {student.displayName?.[0] || 'U'}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {student.displayName || '名前未設定'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {activeEnrollment ? `${activeEnrollment.remainingCount}回` : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {activeEnrollment
                                ? formatDateJa(toDate(activeEnrollment.validUntil))
                                : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {activeEnrollment ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                アクティブ
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                登録なし
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-4">
                              詳細
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              受講追加
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 統計 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">総生徒数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{students.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">アクティブ生徒</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {students.filter(s => enrollments[s.id]?.length > 0).length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">今月の新規登録</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">5</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
