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
        // --- 404 Not Found 오류가 발생하나요? ---
        // 많은 Jira 서버는 'http://서버주소/jira' 와 같이 하위 경로에 설치됩니다.
        // 브라우저에서 접속하는 주소를 확인하고, 만약 '/issue'와 같은 경로가 있다면
        // destination 값에도 반드시 포함시켜야 합니다.
        //
        // --- 예시 ---
        // destination: 'https://my-jira.my-company.com:8080/jira/:path*',
        // destination: 'http://192.168.1.100/jira/:path*',
        // destination: 'https://your-team.atlassian.net/:path*',
        destination: 'http://jira.lge.com/issue/:path*', 
      },
    ]
  },
};

export default nextConfig;
