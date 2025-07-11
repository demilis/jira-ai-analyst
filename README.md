# Jira AI Analyst

## 프로젝트 개요

**Jira AI Analyst**는 Jira API를 통해 실시간 데이터를 직접 분석하여, AI가 자동으로 핵심 내용을 요약하고 실행 가능한 조치 항목을 제안해주는 웹 애플리케E이션입니다. 복잡한 이슈 목록을 빠르게 파악하고 프로젝트의 병목 현상이나 중요한 트렌드를 발견하는 데 도움을 줍니다.

## 앱 아키텍처 (동작 방식)

이 애플리케이션은 역할과 책임이 명확하게 분리된 3개의 계층으로 구성됩니다. 이 구조와 함께, AI와 통신하는 방식인 **MCP(Model Context Protocol)** 를 이해하면 전체 시스템을 쉽게 파악할 수 있습니다.

### 1. Client (프론트엔드 - `src/app/page.tsx`)

- **역할:** 사용자와의 모든 상호작용을 담당하는 UI(User Interface) 계층입니다.
- **동작:**
    - 사용자는 웹 브라우저에서 Jira 접속 정보, 프로젝트 키, 분석 관점 등을 입력합니다.
    - '리포트 생성' 버튼을 클릭하면, 입력된 정보를 백엔드(App Server)로 전송하여 분석을 요청합니다.
    - 분석이 완료되면 백엔드로부터 최종 리포트(JSON 형식)를 받아 사용자에게 시각적으로 보여줍니다.

### 2. App Server (백엔드 - Next.js)

- **역할:** Client의 요청을 받아 핵심 로직을 수행하고 외부 서비스와 통신하는 중간 계층입니다.
- **동작:**
    - **Jira 데이터 요청 (`src/services/jira-service.ts`):** Client의 요청에 따라 Jira 서버의 REST API를 호출하여 분석에 필요한 원본 이슈 데이터를 가져옵니다. (내부망 접속 시 Next.js의 프록시 기능을 사용합니다)
    - **AI 분석 요청 및 MCP (`src/ai/flows/jira-report-flow.ts`):** 앱의 가장 핵심적인 부분입니다. Jira에서 가져온 데이터를 AI에게 그냥 던져주는 것이 아니라, **MCP(Model Context Protocol)** 라는 명확한 '문맥 규약'을 사용하여 AI와 통신합니다.

### 3. External Services (외부 서비스)

- **Jira 서버:** 이슈 데이터의 원천 소스입니다. App Server의 요청에 따라 데이터를 제공합니다.
- **Google AI (Genkit):** App Server의 요청을 받아, MCP에 정의된 대로 데이터를 분석하고 결과를 생성하는 지능형 서비스입니다.

---

### AI 통신 규약: Model Context Protocol (MCP) 란?

MCP는 거창한 기술이 아니라, **우리 앱이 AI에게 원하는 작업을 정확하게 전달하기 위한 약속(프로토콜)** 입니다. 이 규약은 `src/ai/flows/jira-report-flow.ts` 파일 내부의 `jiraReportPrompt` 객체를 통해 구체적으로 정의되며, 주로 다음 요소들을 포함합니다.

-   **AI의 역할 (Persona):** AI에게 어떤 전문가 역할을 수행할지 지정합니다. (예: "너는 최고의 프로젝트 관리 전문가야.")
-   **작업 지시 (Instruction):** 분석해야 할 데이터와 수행할 작업을 명시합니다. (예: "이 데이터를 바탕으로 동향과 병목 현상을 요약해줘.")
-   **데이터 문맥 (Data Context):** `jira-service`가 가져온 실제 Jira 데이터를 AI에게 제공합니다.
-   **출력 형식 (Output Schema):** AI가 결과를 어떤 JSON 구조로 반환해야 하는지 Zod 스키마를 통해 명확하게 정의합니다. (예: `{ "summary": "...", "priorityActions": [...] }`)

이 MCP 덕분에 AI는 우리가 원하는 맥락 안에서, 우리가 원하는 형식대로 정확한 결과물을 생성할 수 있습니다.

## 개발 및 실행 워크플로우

이 프로젝트는 **개발 환경**과 **실행 환경**을 의도적으로 분리하여, AI의 강력한 개발 지원과 사내망 데이터 분석이라는 두 가지 목표를 모두 달성합니다.

### 1단계: Firebase Studio에서 개발 (AI와 협업)
- **장소:** Firebase Studio (현재 이 환경)
- **목표:** AI의 코드 생성/수정 능력을 최대한 활용하여 앱의 핵심 로직과 UI를 빠르게 개발하고 프로토타이핑합니다.

### 2단계: Git에 코드 저장 (버전 관리)
- **도구:** Git
- **목표:** 개발이 완료된 코드를 `git push`를 통해 당신의 GitHub 개인 저장소에 안전하게 업로드하고 버전을 관리합니다.

### 3단계: 로컬 PC로 코드 가져오기 (실행 환경 준비)
- **장소:** 당신의 개인 PC 또는 노트북
- **목표:** `git clone` 또는 `git pull` 명령어를 사용하여 GitHub에 저장된 최신 소스 코드를 로컬 환경으로 다운로드합니다.

### 4단계: 로컬 PC에서 실행 (내부망 Jira 접속)
- **장소:** 당신의 개인 PC 또는 노트북 (회사 VPN 연결 필수)
- **목표:** `npm run dev` 명령어로 앱을 실행하여, `next.config.ts`의 프록시를 통해 회사 내부망에 있는 Jira 서버의 데이터를 실제로 분석하고 결과를 확인합니다.

> **중요:** Firebase에 배포된 앱은 공개 인터넷에 위치하므로, 보안 정책상 회사 내부망에 있는 Jira 서버에는 절대 직접 접속할 수 없습니다. **내부망 접속은 반드시 4단계와 같이 로컬 PC 환경에서 실행해야 합니다.**

## 주요 기술 스택

- **프레임워크:** Next.js (App Router), React
- **UI:** ShadCN, Tailwind CSS
- **AI:** Genkit, Google Gemini

## 로컬 개발 환경 설정

### 1단계: Git 및 Node.js 설치
- **Git:** 아직 없다면, [Git 공식 웹사이트](https://git-scm.com/downloads)에서 설치하세요.
- **Node.js:** 버전 18 이상이 필요합니다. [Node.js 공식 웹사이트](https://nodejs.org/)에서 LTS 버전을 설치하세요.

### 2단계: 프로젝트 소스 코드 다운로드 (Clone)
터미널을 열고 코드를 저장할 폴더로 이동한 뒤, 아래 명령어를 실행하여 원격 저장소의 코드를 복제합니다. (아래 URL은 예시입니다.)

```bash
git clone https://github.com/your-username/jira-ai-analyst.git
cd jira-ai-analyst
```

### 3단계: 필수 패키지 설치
프로젝트 폴더 안에서 다음 명령어를 실행하여 필요한 모든 라이브러리를 설치합니다.

```bash
npm install
```

### 4단계: 환경 변수 설정
로컬 환경에서 앱을 실행하려면, Jira 접속 정보와 Google AI API 키를 설정해야 합니다.

1.  프로젝트의 최상위 폴더에 `.env.local` 이라는 파일을 새로 만드세요.
2.  아래 내용을 복사하여 파일에 붙여넣고, 각 항목에 맞는 실제 값으로 변경하세요.

    ```
    # Google AI API 키
    # Google AI Studio에서 발급받으세요: https://aistudio.google.com/app/apikey
    GOOGLE_API_KEY=여기에_당신의_API_키를_붙여넣으세요

    # 로컬 개발 서버 주소 (보통 이 값을 수정할 필요는 없습니다)
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```
    **중요:** `.env.local` 파일은 민감한 정보를 담고 있으므로, Git에 절대 업로드하면 안 됩니다. (`.gitignore` 파일에 이미 등록되어 있습니다.)

## 로컬에서 실행하기 (내부망 Jira 접속용)

사내망/VPN 등 내부 네트워크에서만 접속 가능한 Jira 서버를 분석하려면, **반드시 아래 2단계를 먼저 완료해야 합니다.**

### 1단계: VPN 연결
가장 먼저, 분석하려는 Jira 서버에 접속할 수 있도록 회사 VPN에 연결하세요.

### 2단계: 프록시 설정 수정 (가장 중요!)
Next.js의 프록시 기능은 우리 앱을 위한 '똑똑한 비서'처럼 작동합니다. 우리 앱이 `/api/jira/...` 라는 주소로 요청을 보내면, 이 비서가 실제 Jira 서버 주소로 요청을 대신 전달해주는 역할을 합니다.

**오류가 나는 이유는 이 비서의 행동 지침에 적힌 주소가 당신의 실제 Jira 서버 주소와 다르기 때문입니다.**

1.  `next.config.ts` 파일을 여세요.
2.  `rewrites` 설정 부분을 찾으세요.
3.  `destination` 값을 **당신이 접속하려는 실제 Jira 서버 주소로 반드시 수정해야 합니다.**

```typescript
// next.config.ts 예시

// ...
  async rewrites() {
    return [
      {
        source: '/api/jira/:path*',
        // 중요: 아래 주소를 당신의 실제 Jira 서버 주소로 변경하세요!
        // 예시 1: https://my-jira.my-company.com:8080/:path*
        // 예시 2: http://192.168.1.100/jira/:path*
        destination: 'http://jira.lge.com/:path*', 
      },
    ]
  },
// ...
```
> **팁:** `destination` 값의 끝에 `:path*`를 붙이는 것을 잊지 마세요. 이것은 비서에게 "원본 요청의 뒷부분 경로를 그대로 붙여서 전달해줘" 라고 알려주는 중요한 규칙입니다.

### 3단계: 개발 서버 실행
터미널에서 아래 명령어를 실행하면 로컬 개발 서버가 시작됩니다.

```bash
npm run dev
```

이제 웹 브라우저에서 `http://localhost:3000` 주소로 접속하여 앱을 사용할 수 있습니다.

### 문제 해결: 상세 오류 메시지 확인
만약 여전히 연결 오류가 발생한다면, 앱은 최대한 자세한 오류 메시지를 보여줄 것입니다. 이 메시지는 문제의 원인을 찾는 데 결정적인 단서가 될 것입니다.

-   **"네트워크 오류: ... 연결할 수 없습니다"**: 가장 먼저 확인할 문제입니다.
    -   **원인:** 당신의 PC가 Jira 서버 주소를 아예 찾지 못하는 상태입니다.
    -   **해결책:**
        1.  **VPN에 확실히 연결되었는지** 다시 확인하세요.
        2.  `next.config.ts`의 `destination` 주소에 **오타가 없는지** (http, https, 도메인 이름 등) 다시 한번 꼼꼼히 확인하세요.

-   **"401/403 ... 인증 실패"**:
    -   **원인:** Jira 서버에 연결은 되었지만, 인증 정보가 틀렸습니다.
    -   **해결책:** 앱 화면에 입력한 Jira 이메일과 API 토큰이 정확한지 확인하세요.

-   **"404 ... Not Found"**:
    -   **원인:** 서버에 연결은 되었지만, 서버가 해당 주소를 모릅니다.
    -   **해결책:** `destination` 주소는 맞지만 그 뒤의 경로가 잘못되었을 수 있습니다. 주소가 정확한지 다시 확인하세요.

-   **"시간 초과(Timeout) 오류"**:
    -   **원인:** `destination` 주소는 맞지만 서버가 응답이 없거나 네트워크가 매우 느린 경우입니다.
    -   **해결책:** 잠시 후 다시 시도하거나, 회사 네트워크 관리자에게 문의하세요.

## Git 저장소에 업로드하기

만약 이 프로젝트를 당신의 GitHub 계정에 새로운 저장소로 만들고 싶다면, 아래 절차를 따르세요.

1.  **GitHub에서 새 저장소 생성:**
    *   [GitHub](https://github.com/new)로 이동하여 `jira-ai-analyst`와 같은 이름으로 새로운 저장소(repository)를 만듭니다. **"Add a README file" 옵션은 선택하지 마세요.**
2.  **로컬 프로젝트와 원격 저장소 연결:**
    *   터미널에서 프로젝트 폴더로 이동한 뒤, 아래 명령어들을 순서대로 실행하세요. `your-username`과 `your-repository-name`은 당신의 정보에 맞게 수정해야 합니다.
    ```bash
    # 1. 로컬 저장소 초기화 (아직 Git 저장소가 아니라면)
    git init -b main

    # 2. 모든 파일을 Staging 영역에 추가
    git add -A

    # 3. 첫 번째 커밋 생성
    git commit -m "Initial commit"

    # 4. 원격 저장소 주소 등록
    git remote add origin https://github.com/your-username/your-repository-name.git

    # 5. 원격 저장소로 코드 푸시(업로드)
    git push -u origin main
    ```

이제 당신의 코드가 GitHub 저장소에 안전하게 보관되었습니다.

## 배포 가이드 (Firebase App Hosting)

이 애플리케이션은 Firebase App Hosting을 사용하여 쉽게 웹에 배포할 수 있습니다. (단, 배포된 앱은 공개 인터넷에서 접근 가능한 Jira 서버만 분석할 수 있습니다.)

### 사전 준비

1.  **Firebase 프로젝트 생성:** 아직 없다면 [Firebase 콘솔](https://console.firebase.google.com/)에서 새 프로젝트를 생성하세요.
2.  **Google AI API 키 발급:** [Google AI Studio](https://aistudio.google.com/app/apikey?hl=ko)에서 API 키를 발급받으세요.

### 배포 절차

1.  **API 키를 Secret으로 등록:**
    *   **가장 중요한 단계입니다.** 발급받은 Google AI API 키는 코드에 직접 넣으면 안 됩니다. Firebase App Hosting의 Secret Manager에 안전하게 저장해야 합니다.
    *   Firebase 콘솔에서 App Hosting 대시보드로 이동한 후, '설정' 탭에서 `GOOGLE_API_KEY`라는 이름으로 당신의 API 키 값을 Secret으로 추가하세요.

2.  **GitHub 리포지토리 연결:**
    *   Firebase App Hosting 대시보드에서 앱의 GitHub 리포지토리를 연결합니다.
    *   배포할 브랜치(예: `main` 또는 `master`)를 선택합니다.

3.  **자동 배포:**
    *   리포지토리가 연결되면, 해당 브랜치에 코드를 푸시(push)할 때마다 Firebase가 자동으로 앱을 빌드하고 새로운 버전을 배포합니다.

이제 당신의 Jira AI Analyst가 전 세계 어디서든 접속할 수 있는 웹 앱으로 탄생했습니다!

