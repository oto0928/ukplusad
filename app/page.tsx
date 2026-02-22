import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Webアプリ開発を
          <br />
          <span className="text-blue-600">今すぐ始めよう</span>
        </h1>
        
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Next.js 15 + TypeScript + Tailwind CSS v4 で構築された
          <br />
          モダンなWebアプリケーション開発テンプレート
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/api"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            API Routes を見る
          </Link>
          <a
            href="https://github.com/yourusername/your-repo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-lg transition-colors"
          >
            GitHub で見る
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <FeatureCard
            title="🚀 高速開発"
            description="Turbopack対応で爆速のHMR。開発体験が劇的に向上します。"
          />
          <FeatureCard
            title="🔒 型安全"
            description="TypeScriptによる完全な型安全性。バグを事前に防ぎます。"
          />
          <FeatureCard
            title="🎨 モダンUI"
            description="Tailwind CSS v4 + shadcn/ui で美しいUIを素早く構築。"
          />
          <FeatureCard
            title="📱 レスポンシブ"
            description="モバイルファースト設計。あらゆるデバイスで最適表示。"
          />
          <FeatureCard
            title="🔌 API統合"
            description="Route HandlersとServer Actionsで簡単にAPI構築。"
          />
          <FeatureCard
            title="⚡ 最適化済み"
            description="パフォーマンスとSEOを考慮した設定が最初から完備。"
          />
        </div>

        <div className="mt-16 p-8 bg-white rounded-lg border-2 border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            次のステップ
          </h2>
          <div className="text-left max-w-2xl mx-auto space-y-3 text-gray-700">
            <p>✅ <code className="bg-gray-100 px-2 py-1 rounded">app/page.tsx</code> を編集してこのページをカスタマイズ</p>
            <p>✅ <code className="bg-gray-100 px-2 py-1 rounded">app/api/</code> に新しいAPI Routeを追加</p>
            <p>✅ <code className="bg-gray-100 px-2 py-1 rounded">npx simple-shadcn-cli add button</code> でUIコンポーネントを追加</p>
            <p>✅ <code className="bg-gray-100 px-2 py-1 rounded">memories/</code> フォルダのワークフローを確認</p>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-8 text-center text-gray-500">
        <p>Built with ❤️ using Next.js 15</p>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
