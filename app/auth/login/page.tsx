'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useAuth } from '@/lib/hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { role } = useAuth();

  // すでにログイン済みの場合はリダイレクト
  if (role === 'admin') {
    router.push('/admin');
    return null;
  }
  if (role === 'teacher') {
    router.push('/teacher');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // IDトークンを取得してカスタムクレームをチェック
      const idTokenResult = await user.getIdTokenResult();
      const userRole = idTokenResult.claims.role as string | undefined;

      // 管理者または教師のみログイン可能
      if (userRole === 'admin') {
        router.push('/admin');
      } else if (userRole === 'teacher') {
        router.push('/teacher');
      } else {
        setError('このアカウントは管理者または教師としてログインできません。');
        await auth.signOut();
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        if ('code' in err) {
          const firebaseError = err as { code: string };
          if (firebaseError.code === 'auth/invalid-credential') {
            setError('メールアドレスまたはパスワードが正しくありません。');
          } else if (firebaseError.code === 'auth/user-not-found') {
            setError('ユーザーが見つかりません。');
          } else if (firebaseError.code === 'auth/wrong-password') {
            setError('パスワードが正しくありません。');
          } else {
            setError('ログインに失敗しました。もう一度お試しください。');
          }
        } else {
          setError('ログインに失敗しました。もう一度お試しください。');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            UKPLUS Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            管理者・教師用ログイン
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
