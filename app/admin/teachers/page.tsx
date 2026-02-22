'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/lib/components/ProtectedRoute';
import { AdminLayout } from '@/lib/components/AdminLayout';
import { TeacherProfile, AppUser } from '@/lib/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<(AppUser & { profile?: TeacherProfile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      // 教師ユーザーを取得
      const teachersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['teacher', 'admin'])
      );
      const teachersSnapshot = await getDocs(teachersQuery);
      const teachersData = teachersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AppUser[];

      // 各教師のプロフィールを取得
      const teachersWithProfiles = await Promise.all(
        teachersData.map(async (teacher) => {
          try {
            const profileSnapshot = await getDocs(
              query(collection(db, 'teacherProfiles'), where('__name__', '==', teacher.id))
            );
            const profile = profileSnapshot.docs[0]?.data() as TeacherProfile | undefined;
            return { ...teacher, profile };
          } catch (error) {
            console.error(`Error loading profile for ${teacher.id}:`, error);
            return teacher;
          }
        })
      );

      setTeachers(teachersWithProfiles);
    } catch (error) {
      console.error('Error loading teachers:', error);
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
              <h2 className="text-3xl font-bold text-gray-900">教師管理</h2>
              <p className="mt-1 text-sm text-gray-600">
                登録されている教師の一覧とプロフィール
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              + 教師を追加
            </button>
          </div>

          {/* 教師リスト */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              teachers.map((teacher) => (
                <TeacherCard key={teacher.id} teacher={teacher} />
              ))
            )}
          </div>

          {/* 統計 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">総教師数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{teachers.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">管理者</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {teachers.filter(t => t.role === 'admin').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">教師</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {teachers.filter(t => t.role === 'teacher').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">今週の授業数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">48</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

interface TeacherCardProps {
  teacher: AppUser & { profile?: TeacherProfile };
}

function TeacherCard({ teacher }: TeacherCardProps) {
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-24"></div>

      {/* プロフィール */}
      <div className="px-6 pb-6">
        <div className="flex flex-col items-center -mt-12">
          <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-blue-600">
            {teacher.profile?.name?.[0] || teacher.displayName?.[0] || 'T'}
          </div>
          <h3 className="mt-4 text-xl font-bold text-gray-900">
            {teacher.profile?.name || teacher.displayName || '名前未設定'}
          </h3>
          <p className="text-sm text-gray-600">{teacher.email}</p>
          
          {teacher.role === 'admin' && (
            <span className="mt-2 px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
              管理者
            </span>
          )}
        </div>

        {/* 専門分野 */}
        {teacher.profile?.specialties && teacher.profile.specialties.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">専門分野</p>
            <div className="flex flex-wrap gap-2">
              {teacher.profile.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 自己紹介 */}
        {teacher.profile?.bio && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-1">自己紹介</p>
            <p className="text-sm text-gray-700 line-clamp-3">{teacher.profile.bio}</p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="mt-6 flex space-x-2">
          <button className="flex-1 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
            詳細を見る
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            編集
          </button>
        </div>
      </div>
    </div>
  );
}
