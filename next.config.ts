import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/jira/:path*',
        // 중요: 이 주소는 로컬 개발 환경에서만 사용되는 프록시 설정입니다.
        // 당신의 내부 Jira 서버 주소로 변경해야 합니다.
        // 예: 'https://your-company.atlassian.net/:path*'
        destination: 'http://jira.lge.com/:path*', 
      },
    ]
  },
};

export default nextConfig;
