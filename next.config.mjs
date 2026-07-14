/** @type {import('next').NextConfig} */
const nextConfig = {
  // 学習報告・理解度チェック後にダッシュボードへ戻った際、Next.jsのクライアント側
  // ルーターキャッシュ（動的ページのデフォルト30秒キャッシュ）で更新前のデータが
  // 表示されてしまう問題を回避するため、動的ページのキャッシュを無効化する。
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
