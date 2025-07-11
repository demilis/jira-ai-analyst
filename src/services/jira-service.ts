'use server';

/**
 * @fileOverview A service to fetch data from the Jira API.
 * This file contains the function responsible for making the actual network request
 * to the Jira REST API to retrieve issue data.
 *
 * It uses a proxy in the development environment to bypass CORS issues
 * and to allow connections to internal Jira instances.
 * 
 * - fetchJiraIssues - Constructs and sends the request to the Jira search endpoint via the proxy.
 */

export async function fetchJiraIssues(options: {
    instanceUrl: string; 
    email: string;
    apiToken: string;
    projectKey: string;
}): Promise<string[][]> {
    const { instanceUrl, email, apiToken, projectKey } = options;

    if (!instanceUrl || !email || !apiToken || !projectKey) {
        throw new Error('Jira 인스턴스 URL, 이메일, API 토큰, 프로젝트 키를 모두 입력해주세요.');
    }
    
    // Construct the absolute URL for the fetch request.
    // Server-side fetch requires an absolute URL.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const apiUrl = new URL('/api/jira/rest/api/2/search', baseUrl).toString();
    
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const jql = `project = "${projectKey.toUpperCase()}" ORDER BY created DESC`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                jql: jql,
                startAt: 0,
                maxResults: 100, 
                fields: ["summary", "status", "assignee", "created", "resolutiondate"]
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Jira API Error: ${errorBody}`);
            if (response.status === 404 && apiUrl.includes('/api/jira')) {
                 throw new Error(`Jira API 요청 실패 (404 Not Found): Next.js 프록시 설정이 Jira 서버(${instanceUrl})를 찾지 못했습니다. next.config.ts의 프록시 URL이 올바른지, VPN에 연결되어 있는지 확인해주세요.`);
            }
            throw new Error(`Jira API 요청 실패: ${response.status} ${response.statusText}. 프로젝트 키, 인증 정보가 올바른지 확인해주세요.`);
        }

        const data = await response.json();
        
        if (!data.issues || data.issues.length === 0) {
            return []; 
        }

        const header = ["Issue Key", "Summary", "Assignee", "Status", "Created", "Resolved"];
        const rows = data.issues.map((issue: any) => [
            issue.key,
            issue.fields.summary || '',
            issue.fields.assignee ? issue.fields.assignee.displayName : '담당자 없음',
            issue.fields.status ? issue.fields.status.name : '상태 없음',
            issue.fields.created ? new Date(issue.fields.created).toISOString().split('T')[0] : '',
            issue.fields.resolutiondate ? new Date(issue.fields.resolutiondate).toISOString().split('T')[0] : ''
        ]);

        return [header, ...rows];

    } catch (error) {
        console.error("Jira API 연결 중 오류 발생:", error);
        if (error instanceof TypeError && (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND'))) {
            throw new Error(`Jira 서버에 연결하지 못했습니다. next.config.ts에 설정된 프록시 주소(${instanceUrl})가 정확한지, 그리고 VPN 연결이 활성화되어 있는지 확인해주세요.`);
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('알 수 없는 오류로 Jira 서버에 연결하는 중 문제가 발생했습니다.');
    }
}
