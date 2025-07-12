
'use server';

/**
 * @fileOverview Jira API에서 데이터를 가져오는 서비스입니다.
 * 이 파일은 서버 액션으로 실행되며, 클라이언트에서 직접 전달받은 인증 정보를 사용하여
 * Jira REST API에 네트워크 요청을 보냅니다. 서버에서 실행되므로 CORS 문제가 발생하지 않습니다.
 */

export interface JiraAuth {
    instanceUrl: string;
    email: string;
    apiToken: string;
}

export async function fetchJiraIssues(options: {
    auth: JiraAuth;
    projectKey: string;
    components?: string;
}): Promise<string[][]> {
    const { auth, projectKey, components } = options;
    const { instanceUrl, email, apiToken } = auth;

    if (!instanceUrl || !email || !apiToken) {
        throw new Error('Jira 주소, 이메일, API 토큰을 모두 입력해주세요.');
    }
    if (!projectKey) {
        throw new Error('Jira 프로젝트 키를 입력해주세요.');
    }
    
    const finalApiUrl = `${instanceUrl.replace(/\/$/, '')}/rest/api/2/search`;
    
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    
    // 쉼표로 구분된 프로젝트 키를 배열로 변환하고 JQL의 'IN' 절에 맞게 포맷팅합니다.
    const projectKeys = projectKey.split(',').map(key => `"${key.trim().toUpperCase()}"`).join(',');
    let jql = `project IN (${projectKeys})`;

    // 컴포넌트 값이 있으면 JQL에 AND 조건 추가
    if (components && components.trim()) {
        const componentNames = components.split(',').map(c => `"${c.trim()}"`).join(',');
        jql += ` AND component IN (${componentNames})`;
    }

    jql += ' ORDER BY created DESC';

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
                fields: ["summary", "status", "assignee", "created", "resolutiondate", "components"]
            }),
            signal: AbortSignal.timeout(15000) // 15초
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Jira API 에러 응답 (상태 코드: ${response.status}):`, errorBody);

            let userMessage = `Jira API 요청 실패 (상태 코드: ${response.status}).\n`;

            if (response.status === 400 && errorBody.includes("does not exist for the field")) {
                 userMessage += `잘못된 프로젝트 키 또는 컴포넌트 이름이 포함되어 있습니다. 입력 값을 확인해주세요.`;
            } else if (response.status === 401 || response.status === 403) {
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

        const header = ["Issue Key", "Summary", "Assignee", "Status", "Components", "Created", "Resolved"];
        const rows = data.issues.map((issue: any) => [
            issue.key,
            issue.fields.summary || '',
            issue.fields.assignee ? issue.fields.assignee.displayName : '담당자 없음',
            issue.fields.status ? issue.fields.status.name : '상태 없음',
            issue.fields.components.map((c: any) => c.name).join(', ') || '컴포넌트 없음',
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
