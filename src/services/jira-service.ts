
'use server';

/**
 * @fileOverview A service to fetch data from the Jira API.
 * 
 * - fetchJiraIssues - Fetches issues from a Jira instance using the REST API.
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

    const cleanedUrl = instanceUrl.endsWith('/') ? instanceUrl.slice(0, -1) : instanceUrl;
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const jql = `project = "${projectKey.toUpperCase()}" ORDER BY created DESC`;
    const apiUrl = `${cleanedUrl}/rest/api/2/search`;

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
                maxResults: 100, // Fetch up to 100 recent issues
                fields: ["summary", "status", "assignee", "created", "resolutiondate"]
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Jira API Error: ${errorBody}`);
            throw new Error(`Jira API 요청 실패: ${response.status} ${response.statusText}. URL, 프로젝트 키, 인증 정보가 올바른지 확인해주세요.`);
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
        if (error instanceof Error && error.name === 'FetchError') {
             throw new Error(`Jira 서버에 연결할 수 없습니다. URL('${apiUrl}')이 정확하고, 네트워크에서 접근 가능한지 확인해주세요.`);
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('알 수 없는 오류로 Jira 서버에 연결할 수 없습니다.');
    }
}
