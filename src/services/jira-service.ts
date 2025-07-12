
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
    
    // 사용자가 입력한 URL의 마지막 '/'를 제거하고, Jira API의 정식 경로를 붙여 최종 URL을 생성합니다.
    const finalApiUrl = `${instanceUrl.replace(/\/$/, '')}/rest/api/2/search`;
    
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    
    const projectKeys = projectKey.split(',').map(key => `"${key.trim().toUpperCase()}"`).join(',');
    let jql = `project IN (${projectKeys})`;

    if (components && components.trim()) {
        const componentNames = components.split(',').map(c => `"${c.trim()}"`).join(',');
        jql += ` AND component IN (${componentNames})`;
    }

    jql += ' ORDER BY created DESC';

    // 사용자가 요청한 디버깅 로그: 최종 조합된 URL과 JQL을 터미널에 출력합니다.
    console.log(`\n--- [Jira Service] 최종 API 요청 정보 ---`);
    console.log(`[요청 URL]: ${finalApiUrl}`);
    console.log(`[JQL 쿼리]: ${jql}`);
    console.log(`--------------------------------------\n`);

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
                 userMessage += `[진단] '400 잘못된 요청' 오류가 발생했습니다. 입력하신 프로젝트 키 또는 컴포넌트 이름 중 존재하지 않는 값이 포함되어 있습니다. 오타가 없는지 확인해주세요.`;
            } else if (response.status === 401 || response.status === 403) {
                 userMessage += '[진단] \'401 인증 실패\' 오류입니다. Jira 이메일 또는 API 토큰 값이 정확하지 않습니다. Jira 사이트에서 새 API 토큰을 발급받아 공백 없이 붙여넣어 보세요.';
            } else if (response.status === 404) {
                 userMessage += `[진단] '404 Not Found' 오류가 발생했습니다. 입력하신 Jira 주소('${instanceUrl}')가 정확한지, 특히 주소 끝에 '/issue'와 같은 경로(Context Path)가 포함되어 있는지 반드시 확인해보세요.`;
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
        const rows = data.issues.map((issue: any) => {
            const issueComponents = (issue.fields.components && Array.isArray(issue.fields.components))
                ? issue.fields.components.map((c: any) => c.name).join(', ')
                : '컴포넌트 없음';

            return [
                issue.key,
                issue.fields.summary || '',
                issue.fields.assignee ? issue.fields.assignee.displayName : '담당자 없음',
                issue.fields.status ? issue.fields.status.name : '상태 없음',
                issueComponents,
                issue.fields.created ? new Date(issue.fields.created).toISOString().split('T')[0] : '',
                issue.fields.resolutiondate ? new Date(issue.fields.resolutiondate).toISOString().split('T')[0] : ''
            ];
        });

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
