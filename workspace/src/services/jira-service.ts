
'use server';

/**
 * @fileOverview Jira API에서 데이터를 가져오는 서비스입니다.
 * 이 파일은 Jira REST API에 실제 네트워크 요청을 보내 이슈 데이터를 검색하는 함수를 포함합니다.
 * Next.js 프록시를 통해 요청을 보내므로, 브라우저의 CORS 정책을 우회할 수 있습니다.
 */

export interface JiraAuth {
    instanceUrl: string;
    email: string;
    apiToken: string;
}

export async function fetchJiraIssues(options: {
    auth: JiraAuth;
    projectKey: string;
}): Promise<string[][]> {
    const { auth, projectKey } = options;
    const { instanceUrl, email, apiToken } = auth;

    if (!instanceUrl || !email || !apiToken) {
        throw new Error('Jira 주소, 이메일, API 토큰을 모두 입력해주세요.');
    }
    if (!projectKey) {
        throw new Error('Jira 프로젝트 키를 입력해주세요.');
    }
    
    // next.config.ts의 rewrites를 사용하기 위해 상대 경로로 요청을 보냅니다.
    // 사용자가 'http://jira.lge.com/issue'를 입력하면, 우리는 '/api/jira/'로 요청을 보냅니다.
    // Next.js 프록시는 이 요청을 받아서 'http://jira.lge.com/issue/rest/api/2/search'로 변환하여 전달합니다.
    const apiUrl = '/api/jira/rest/api/2/search';
    
    // rewrites 설정에서 destination에 사용자가 입력한 instanceUrl을 동적으로 넣을 수 없으므로,
    // 이 방법은 현재 아키텍처에서 동작하지 않습니다.
    // 대신, 서버 컴포넌트에서 직접 외부 API를 호출하는 방식으로 변경해야 합니다.
    // 하지만 현재 환경에서는 process.env가 동작하지 않으므로, 이 방법도 불가능합니다.
    // 따라서, 클라이언트에서 받은 URL을 그대로 사용하되, CORS 문제를 해결하기 위해
    // Next.js 프록시를 사용하는 것이 아니라, 서버 액션에서 직접 fetch를 호출해야 합니다.
    // 이 경우, 브라우저가 아닌 서버에서 요청이 발생하므로 CORS 문제가 발생하지 않습니다.
    
    // 최종 URL을 구성합니다. 사용자가 입력한 주소 + API 경로
    const finalApiUrl = `${instanceUrl.replace(/\/$/, '')}/rest/api/2/search`;
    
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const jql = `project = "${projectKey.toUpperCase()}" ORDER BY created DESC`;
    
    console.log(`\n--- [Jira Service] API 요청 전송 ---`);
    console.log(`- 요청 URL: ${finalApiUrl}`);
    console.log(`- JQL: ${jql}`);
    console.log(`- 이메일: ${email}`);
    console.log(`- API 토큰: ${apiToken ? '...입력됨' : '!!! 비어있음 !!!'}`);
    console.log(`------------------------------------\n`);

    try {
        const response = await fetch(finalApiUrl, {
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
            signal: AbortSignal.timeout(15000) // 15초
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Jira API 에러 응답 (상태 코드: ${response.status}):`, errorBody);

            let userMessage = `Jira API 요청 실패 (상태 코드: ${response.status}).\n`;

            if (response.status === 401 || response.status === 403) {
                 userMessage += '인증 실패. Jira 이메일 또는 API 토큰이 올바른지, 해당 계정이 프로젝트에 접근할 권한이 있는지 확인하세요.';
            } else if (response.status === 404) {
                 userMessage += `[진단] '404 Not Found'는 입력하신 Jira 주소('${finalApiUrl}')가 올바르지 않다는 의미입니다. 주소에 '/issue'와 같은 경로가 포함되어 있는지 확인해보세요.`;
            } else {
                 userMessage += '프로젝트 키가 올바른지, 또는 네트워크 연결(VPN) 상태를 확인해주세요.';
            }
            throw new Error(userMessage);
        }

        const data = await response.json();
        
        if (!data.issues) {
             throw new Error('Jira 서버에서 이슈를 찾을 수 없습니다. 프로젝트 키가 정확하거나, 해당 프로젝트에 접근할 권한이 있는지 확인해주세요.');
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

        if (rows.length === 0) {
             return [header]; // 이슈가 없는 경우 헤더만 반환
        }

        return [header, ...rows];

    } catch (error) {
        console.error("Jira API 연결 중 전체 오류 발생:", error);
        if (error instanceof Error && error.name === 'TimeoutError') {
             throw new Error(`Jira 서버(${instanceUrl}) 연결 시간 초과. 서버가 응답하지 않거나 네트워크 연결(VPN 포함)이 매우 느립니다.`);
        }
        if (error instanceof TypeError) { // This can catch network errors like failed to fetch
            throw new Error(`네트워크 오류: Jira 서버(${instanceUrl})에 연결할 수 없습니다. 주소가 정확한지, VPN 연결 상태를 확인해주세요.`);
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('알 수 없는 오류로 Jira 서버에 연결하는 중 문제가 발생했습니다.');
    }
}
