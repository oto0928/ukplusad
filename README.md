# DefaultSettingWebApp

**Firebase + Vercel** で構築するWebアプリケーション開発用テンプレートです。

## 概要

このプロジェクトは、モダンなWebアプリケーション開発を効率化するための初期設定環境です。
Firebase（認証・データベース・ストレージ）とVercel（ホスティング）を組み合わせた、フルスタックWebアプリを素早く立ち上げられます。

## 技術スタック

- **Next.js 16** - React フレームワーク（App Router）
- **React 19** - UI ライブラリ
- **TypeScript** - 型安全性
- **Tailwind CSS v4** - スタイリング
- **shadcn/ui** - コンポーネントライブラリ
- **Firebase** - バックエンド（Auth, Firestore, Storage, Functions）
- **Vercel** - ホスティング・デプロイ

## 使用開始手順

### 1. プロジェクトのセットアップ

```bash
# リポジトリのクローン
git clone <your-repo-url>
cd <your-project-name>

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認してください。

### 2. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. Webアプリを追加（⚙️ > プロジェクトの設定 > アプリを追加）
4. Firebase設定情報を取得

### 3. 環境変数の設定

`.env.local` ファイルを作成:

```bash
# Firebase Client SDK（クライアント側で使用）
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"

# Firebase Admin SDK（サーバー側で使用）
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 4. Firebaseサービスの有効化

Firebase Consoleで以下を有効化:

```bash
# Authentication
- メール/パスワード認証
- Google認証（オプション）
- GitHub認証（オプション）

# Firestore Database
- テストモードで開始（後でセキュリティルールを設定）

# Storage
- デフォルト設定で開始
```

### 5. Vercelへのデプロイ

```bash
# Vercel CLIのインストール
npm install -g vercel

# デプロイ
vercel

# 本番環境へのデプロイ
vercel --prod
```

または、GitHubリポジトリをVercelに接続して自動デプロイ:
1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. "Import Project" をクリック
3. GitHubリポジトリを選択
4. 環境変数を設定
5. デプロイ

## 主な機能

- ✅ **Firebase Authentication**: メール/パスワード、OAuth認証
- ✅ **Firestore Database**: リアルタイムデータベース
- ✅ **Firebase Storage**: 画像・ファイルアップロード
- ✅ **Server Actions**: フォーム送信やデータ操作
- ✅ **API Routes**: カスタムAPIエンドポイント
- ✅ **レスポンシブ対応**: モバイルファースト設計
- ✅ **型安全性**: TypeScript完全対応
- ✅ **高速ビルド**: Turbopack対応

## ディレクトリ構成

```
DefaultSettingWebApp/
├── app/
│   ├── (auth)/              # 認証関連ページ（ログイン・登録）
│   ├── (dashboard)/         # ダッシュボード（認証後）
│   ├── api/                 # API Routes
│   ├── actions/             # Server Actions
│   ├── components/          # UIコンポーネント
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── firebase/            # Firebase設定
│   │   ├── client.ts       # Client SDK
│   │   └── admin.ts        # Admin SDK
│   └── utils.ts
├── public/                  # 静的ファイル
├── memories/                # 開発ワークフロー・ベストプラクティス
├── .env.local              # 環境変数（Gitにコミットしない）
└── .env.example            # 環境変数のテンプレート
```

## Firebaseパッケージのインストール

```bash
# Firebase SDK
npm install firebase firebase-admin

# 認証管理（オプション: NextAuth + Firebase）
npm install next-auth@beta @auth/firebase-adapter

# フォームバリデーション
npm install react-hook-form zod @hookform/resolvers

# UIコンポーネント
npx simple-shadcn-cli add button input form card dialog toast
```

## 開発ガイドライン

### Firebase Client SDK（クライアント側）

```typescript
// lib/firebase/client.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

### Firebase Admin SDK（サーバー側）

```typescript
// lib/firebase/admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
```

### Server Actionsでのデータ操作

```typescript
// app/actions/todo.actions.ts
'use server';

import { adminDb } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';

export async function createTodo(formData: FormData) {
  const title = formData.get('title') as string;
  
  await adminDb.collection('todos').add({
    title,
    completed: false,
    createdAt: new Date(),
  });
  
  revalidatePath('/dashboard');
  return { success: true };
}
```

### クライアントでのリアルタイムデータ取得

```typescript
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export function TodoList() {
  const [todos, setTodos] = useState([]);
  
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'todos'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTodos(data);
      }
    );
    
    return () => unsubscribe();
  }, []);
  
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
}
```

## Firestoreセキュリティルール

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のドキュメントのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 認証済みユーザーはtodosを読み書き可能
    match /todos/{todoId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Storageセキュリティルール

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // ユーザーは自分のフォルダのみアクセス可能
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Vercelでの環境変数設定

Vercel Dashboardで以下の環境変数を設定:

```bash
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase Admin SDK
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY  # 改行を含む長い文字列
```

## Next.js 16の新機能

### React Compiler（自動最適化）

Next.js 16ではReact Compilerがデフォルトで有効化されています。
`useMemo`、`useCallback`、`React.memo`の手動最適化が不要になりました。

```typescript
// ❌ 以前（手動最適化）
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);

// ✅ Next.js 16（自動最適化）
const value = computeExpensiveValue(a, b);
const callback = () => doSomething(a, b);
```

### Turbopack（高速ビルド）

デフォルトで有効化されています。開発サーバーの起動とHMRが大幅に高速化。

### Server Actions（安定版）

フォーム送信やデータ変更がより簡単に:

```typescript
// app/actions/user.actions.ts
'use server';

export async function updateProfile(formData: FormData) {
  const name = formData.get('name');
  // Firebase Admin SDKでデータ更新
  await adminDb.collection('users').doc(userId).update({ name });
  revalidatePath('/profile');
}
```

## スクリプト

```bash
npm run dev      # 開発サーバー起動（Turbopack）
npm run build    # プロダクションビルド
npm run start    # プロダクションサーバー起動
npm run lint     # ESLint実行
```

## トラブルシューティング

### Firebase Admin SDKのエラー

```bash
Error: Error while making request: getaddrinfo ENOTFOUND firestore.googleapis.com
```

→ サーバー側でFirebase Admin SDKを使用する際は、Vercelの環境変数が正しく設定されているか確認

### 環境変数が読み込まれない

→ `.env.local`ファイルが正しい場所にあるか確認。サーバーを再起動。

### Firestoreのアクセス拒否

→ Firestoreのセキュリティルールを確認。開発中は一時的にテストモードを使用。

## 参考リンク

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

## ライセンス

MIT License

---

**注意**: このテンプレートを使用する際は、必ず新しいFirebaseプロジェクトを作成し、環境変数を適切に設定してください。
