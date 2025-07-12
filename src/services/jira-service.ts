
'use server';

/**
 * @fileOverview Jira API에서 데이터를 가져오는 서비스입니다.
 * 이 파일은 Jira REST API에 실제 네트워크 요청을 보내 이슈 데이터를 검색하는 함수를 포함합니다.
 *
 * --- process.env는 어디서 오나요? ---
 * `process.env`는 Node.js 환경의 전역 객체입니다. Next.js 서버는 시작될 때
 * 프로젝트 루트에 있는 `.env.local` 파일의 내용을 자동으로 읽어 `process.env` 객체에 채워줍니다.
 * 따라서 이 파일('use server'로 실행됨)은 해당 값들에 접근할 수 있습니다.
 * 
 * - fetchJiraIssues - Jira 검색 엔드포인트에 프록시를 통해 요청을 구성하고 보냅니다.
 */

export async function fetchJiraIssues(options: {
    projectKey: string;
}): Promise<string[][]> {
    const { projectKey } = options;

    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    const instanceUrl = process.env.JIRA_INSTANCE_URL;

    // --- 서버 측 환경 변수 검증을 위한 최종 디버깅 로그 ---
    // 이 로그는 서버가 .env.local 파일을 성공적으로 읽었는지 확인하는 데 매우 중요합니다.
    console.log("\n--- [Jira Service] 서버 메모리에 로드된 환경 변수 확인 ---");
    console.log(`- JIRA_INSTANCE_URL: ${instanceUrl ? '로드됨' : '!!! 로드 실패 (undefined) !!!'}`);
    console.log(`- JIRA_EMAIL: ${email ? '로드됨' : '!!! 로드 실패 (undefined) !!!'}`);
    console.log(`- JIRA_API_TOKEN: ${apiToken ? '로드됨' : '!!! 로드 실패 (undefined) !!!'}`);
    console.log(`- UI에서 받은 프로젝트 키: ${projectKey}`);
    console.log("-------------------------------------------------------------\n");
    // --- 로그 끝 ---

    if (!instanceUrl || !email || !apiToken) {
        throw new Error('서버 환경 변수(JIRA_INSTANCE_URL, JIRA_EMAIL, JIRA_API_TOKEN)가 설정되지 않았습니다. .env.local 파일을 확인하고 서버를 재시작하세요.');
    }

    if (!projectKey) {
        throw new Error('Jira 프로젝트 키를 입력해주세요.');
    }
    
    // 서버 측 fetch는 절대 URL이 필요합니다.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const apiUrl = new URL('/api/jira/rest/api/2/search', baseUrl).toString();
    
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    
    // 쉼표로 구분된 프로젝트 키를 배열로 변환하고 JQL의 'IN' 절에 맞게 포맷팅합니다.
    const projectKeys = projectKey.split(',').map(key => `"${key.trim().toUpperCase()}"`).join(',');
    const jql = `project IN (${projectKeys}) ORDER BY created DESC`;

    console.log(`Executing JQL: ${jql}`);
    
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
            signal: AbortSignal.timeout(15000) // 15초
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Jira API 에러 응답 (상태 코드: ${response.status}):`, errorBody);

            let userMessage = `Jira API 요청 실패 (상태 코드: ${response.status}).\n`;

            if (response.status === 401 || response.status === 403) {
                 userMessage += '인증 실패. 서버에 설정된 Jira 이메일 또는 API 토큰이 올바른지, 해당 계정이 프로젝트에 접근할 권한이 있는지 확인하세요.';
            } else if (response.status === 404) {
                 userMessage += `[진단] '404 Not Found'는 다음을 의미할 수 있습니다:\n1. next.config.ts의 프록시 주소(destination)가 정확하지 않음. (특히 '/issue' 같은 경로가 빠졌는지 확인!)\n2. VPN에 연결되지 않아 서버를 찾을 수 없음.\n3. Jira 서버 내에서 해당 API 경로를 찾을 수 없음.`;
            } else {
                 userMessage += '프로젝트 키가 올바른지, 또는 서버에 다른 문제가 있는지 확인해주세요.';
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
        if (error instanceof TypeError && (error.cause as any)?.code === 'UND_ERR_REQ_TIMEOUT') {
             throw new Error(`Jira 서버(${instanceUrl}) 연결 시간 초과. 서버가 응답하지 않거나 네트워크 연결(VPN 포함)이 매우 느립니다.`);
        }
        if (error instanceof TypeError) {
            throw new Error(`네트워크 오류: Jira 서버(${instanceUrl})에 연결할 수 없습니다. next.config.ts의 주소가 정확한지, VPN 연결 상태를 확인해주세요.`);
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('알 수 없는 오류로 Jira 서버에 연결하는 중 문제가 발생했습니다.');
    }
}
