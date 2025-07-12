
**제목: [문의] Node.js 환경에서 Jira REST API 호출 시 401 Unauthorized 오류 발생**

**안녕하세요, IT 지원팀.**

자체 개발한 Node.js 기반 애플리케이션에서 Jira REST API를 통해 이슈 데이터를 조회하려고 시도하는 중, 지속적으로 `401 Unauthorized` 오류가 발생하여 문의드립니다.

사내망 접속을 위해 VPN에 연결된 상태이며, API 요청에 필요한 정보는 아래와 같습니다. 내부 방화벽이나 보안 정책, 또는 Jira 서버 측의 특정 설정으로 인해 API 요청이 차단되고 있는지 확인을 부탁드립니다.

---

### **1. 시스템 환경 및 목표**

*   **실행 환경:** 개인 PC의 Node.js (v18 이상) 스크립트 환경
*   **목표:** Jira REST API (`/rest/api/2/search`)를 호출하여 특정 프로젝트의 이슈 데이터를 조회

---

### **2. 문제 현상**

*   API 호출 시, 항상 `401 Unauthorized` 상태 코드와 함께 Jira 로그인 페이지 HTML이 응답으로 반환됩니다.
*   이는 서버가 API 요청으로 인지하지 않고, 일반 브라우저의 비로그인 접근으로 처리하는 것으로 보입니다.

---

### **3. 요청 정보 (저희가 Jira 서버로 보내는 데이터)**

저희 애플리케이션이 Jira 서버로 전송하는 HTTP 요청의 상세 내역입니다.

*   **HTTP Method:** `POST`
*   **Request URL:** `[여기에 분석하려는 실제 Jira API URL을 붙여넣으세요. 예: http://jira.lge.com/issue/rest/api/2/search]`
*   **Request Headers:**
    ```json
    {
      "Authorization": "Basic [여기에 Base64로 인코딩된 인증 토큰 값을 붙여넣으세요]",
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
    ```
    *   참고: `Authorization` 헤더의 값은 `사용자이름:API토큰` 문자열을 Base64로 인코딩한 것입니다.
*   **Request Body (Payload):**
    ```json
    {
      "jql": "project IN (\"HMCCCIC\", \"HKMCCCIC\") AND component IN (\"AVN - Vibe\") ORDER BY created DESC",
      "startAt": 0,
      "maxResults": 100,
      "fields": [
        "summary",
        "status",
        "assignee",
        "created",
        "resolutiondate",
        "components"
      ]
    }
    ```

---

### **4. 응답 정보 (Jira 서버에서 받은 데이터)**

*   **Status Code:** `401 Unauthorized`
*   **Response Body:** 정상적인 JSON 데이터가 아닌, Jira 로그인 페이지의 전체 HTML 코드가 반환됩니다. (첨부 또는 아래 일부 내용 참고)
    ```html
    <!-- 
    window.WRM=window.WRM||{};window.WRM._unparsedData=window.WRM._unparsedData||{};
    ... (중략) ...
    WRM._unparsedData["com.atlassian.plugins.atlassian-plugins-webresource-plugin:context-path.context-path"]="\"/issue\"";
    ... (후략) ...
    -->
    ```

---

### **5. 확인 요청 사항**

1.  **방화벽/네트워크 정책:** 사내 네트워크 보안 정책(방화벽, 프록시 등)이 외부 스크립트(Node.js) 환경에서 생성된 `Basic` 인증 방식의 API 요청을 차단하고 있는지 확인 부탁드립니다.
2.  **Jira 서버 설정:** Jira 서버 자체에 특정 IP 대역이나 User-Agent를 기반으로 접근을 제한하는 설정이 있는지 확인 부탁드립니다.
3.  **계정/토큰 유효성:** 사용 중인 계정(`[당신의 Jira 계정 이메일 또는 사용자 이름을 입력하세요]`)과 API 토큰은 Jira 웹사이트에서 정상적으로 동작함을 확인했으나, 만약 서버 측에서 해당 토큰의 API 사용 권한에 문제가 있는지 확인 가능하시다면 부탁드립니다.

문제 해결에 필요한 추가 정보가 있다면 언제든지 말씀해주십시오.

감사합니다.

**담당자:** `[당신의 이름]`
**연락처:** `[당신의 연락처]`
