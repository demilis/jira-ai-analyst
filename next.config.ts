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
        // 중요: 아래 destination 값을 당신의 실제 Jira 서버 주소로 반드시 변경해야 합니다.
        // 이것은 앱이 로컬에서 실행될 때만 사용되는 프록시 설정입니다.
        // --- 예시 ---
        // destination: 'https://my-jira.my-company.com:8080/:path*',
        // destination: 'http://192.168.1.100/jira/:path*',
        // destination: 'https://your-team.atlassian.net/:path*',
        destination: 'http://jira.lge.com/:path*', 
      },
    ]
  },
};

export default nextConfig;
