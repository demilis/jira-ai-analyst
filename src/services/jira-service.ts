
'use server';

/**
 * @fileOverview Jira API에서 데이터를 가져오는 서비스입니다.
 * 이 파일은 Jira REST API에 실제 네트워크 요청을 보내 이슈 데이터를 검색하는 함수를 포함합니다.
 */

export interface JiraAuth {
    instanceUrl: string;
    email: string;
    apiToken: string;
}

export async function fetchJiraIssues(options: {
    auth: JiraAuth;
    projectKey: string;
    component?: string;
}): Promise<string[][]> {
    const { auth, projectKey, component } = options;
    const { instanceUrl, email, apiToken } = auth;

    if (!instanceUrl || !email || !apiToken) {
        throw new Error('Jira 주소, 이메일(또는 사용자 이름), API 토큰을 모두 입력해주세요.');
    }
    if (!projectKey) {
        throw new Error('Jira 프로젝트 키를 입력해주세요.');
    }
    
    const finalApiUrl = `${instanceUrl.replace(/\/$/, '')}/rest/api/2/search`;
    
    // 1. 이메일과 API 토큰을 콜론으로 합친 후, Base64로 인코딩합니다.
    // 이것이 HTTP Basic Authentication의 표준 방식입니다.
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    
    // Base JQL query for projects
    const projectKeys = projectKey.split(',').map(key => `"${key.trim().toUpperCase()}"`).join(',');
    let jql = `project IN (${projectKeys})`;

    // Add component query if provided
    if (component) {
        const components = component.split(',').map(c => `"${c.trim()}"`).join(',');
        jql += ` AND component IN (${components})`;
    }

    jql += ` ORDER BY created DESC`;
    
    console.log(`\n--- [Jira Service] 최종 API 요청 정보 ---`);
    console.log(`[요청 URL]: ${finalApiUrl}`);
    console.log(`[JQL 쿼리]: ${jql}`);
    console.log(`--------------------------------------\n`);

    try {
        const response = await fetch(finalApiUrl, {
            method: 'POST',
            headers: {
                // 2. HTTP 요청 헤더의 'Authorization' 필드에 "Basic " 접두사와 함께
                //    인코딩된 인증 정보를 담아 보냅니다.
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
            signal: AbortSignal.timeout(20000) // 20초
        });

        if (!response.ok) {
            const errorBodyText = await response.text();
            console.error(`Jira API 에러 응답 (상태 코드: ${response.status}):`, errorBodyText);

            let userMessage = `Jira API 요청 실패 (상태 코드: ${response.status}).\n`;

            if (response.status === 401 || response.status === 403) {
                 userMessage += `[진단] '401 인증 실패' 오류입니다. Jira 이메일 또는 API 토큰 값이 정확하지 않습니다. Jira 사이트에서 새 API 토큰을 발급받아 공백 없이 붙여넣어 보세요.`;
            } else if (response.status === 404) {
                 userMessage += `[진단] '404 Not Found'는 입력하신 Jira 주소('${finalApiUrl}')가 올바르지 않다는 의미입니다. 주소에 '/issue'와 같은 경로가 포함되어 있는지 확인해보세요.`;
            } else if (response.status === 400) {
                userMessage += `[진단] '400 Bad Request'는 JQL 쿼리가 잘못되었을 가능성이 높습니다. 입력하신 프로젝트 키나 컴포넌트 이름이 정확한지 확인해주세요.`;
            } else {
                 userMessage += '자세한 내용은 개발자 콘솔(F12)을 확인하거나, 네트워크 연결(VPN) 상태를 점검해주세요.';
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
            // 'components' 필드가 없는 경우를 대비한 안전 장치
            issue.fields.components && issue.fields.components.length > 0
                ? issue.fields.components.map((c: any) => c.name).join(', ')
                : '컴포넌트 없음',
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
        if (error instanceof TypeError) { 
            throw new Error(`네트워크 오류: Jira 서버(${instanceUrl})에 연결할 수 없습니다. 주소가 정확한지, VPN 연결 상태를 확인해주세요.`);
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('알 수 없는 오류로 Jira 서버에 연결하는 중 문제가 발생했습니다.');
    }
}
