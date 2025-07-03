
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { generateJiraReport, type JiraReportOutput } from "@/ai/flows/jira-report-flow";
import { fetchJiraIssues } from "@/services/jira-service";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, FileUp, Clipboard, Check, FileText, Server, AlertTriangle, ChevronsUpDown, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from "xlsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, Tooltip } from "recharts";


export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [jiraInstanceUrl, setJiraInstanceUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraProjectKey, setJiraProjectKey] = useState("");
  
  const [analysisPoint, setAnalysisPoint] = useState(""); 
  const [inputValue, setInputValue] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("file");
  const [report, setReport] = useState<JiraReportOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedUrl = localStorage.getItem('jiraInstanceUrl');
    const savedEmail = localStorage.getItem('jiraEmail');
    const savedToken = localStorage.getItem('jiraToken');
    const savedProjectKey = localStorage.getItem('jiraProjectKey');

    if (savedUrl) setJiraInstanceUrl(savedUrl);
    if (savedEmail) setJiraEmail(savedEmail);
    if (savedToken) setJiraToken(savedToken);
    if (savedProjectKey) setJiraProjectKey(savedProjectKey);
  }, []);

  useEffect(() => {
    localStorage.setItem('jiraInstanceUrl', jiraInstanceUrl);
    localStorage.setItem('jiraEmail', jiraEmail);
    localStorage.setItem('jiraToken', jiraToken);
    localStorage.setItem('jiraProjectKey', jiraProjectKey);
  }, [jiraInstanceUrl, jiraEmail, jiraToken, jiraProjectKey]);


  const analysisExamples = [
    { value: "5월에 해결된 이슈", label: "5월에 해결된 이슈" },
    { value: "담당자별 진행상황", label: "담당자별 진행상황" },
    { value: "'결함' 관련 이슈", label: "'결함' 관련 이슈" },
    { value: "지난 주에 생성된 이슈", label: "지난 주에 생성된 이슈" },
    { value: "우선순위 'High' 이슈", label: "우선순위 'High' 이슈" },
    { value: "총 이슈 수", label: "총 이슈 수" },
    { value: "오픈 이슈", label: "오픈 이슈" },
    { value: "해결된 이슈", label: "해결된 이슈" },
    { value: "주요 병목 구간", label: "주요 병목 구간" },
    { value: "이슈많은담당자", label: "이슈많은담당자" },
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.includes("sheet") || selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls")) {
        setFile(selectedFile);
        setTextInput("");
        setReport(null);
      } else {
        toast({
          variant: "destructive",
          title: "유효하지 않은 파일 형식",
          description: "올바른 Excel 파일(.xlsx, .xls)을 업로드해주세요.",
        });
      }
    }
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReport(null);

    let stringifiedData: string;
    const jiraKeyRegex = /[A-Z][A-Z0-9_]+-\d+/;

    const filterData = (data: any[][]) => {
        if (!data || data.length === 0) return [];
        
        const dataStartIndex = data.findIndex(row => 
            Array.isArray(row) && row.some(cell => typeof cell === 'string' && jiraKeyRegex.test(cell.toString()))
        );

        if (dataStartIndex === -1) {
             return [];
        }
        
        const headerRow = data.find((row, index) => index < dataStartIndex && Array.isArray(row) && row.length > 2) || data[0];
        const dataRows = data.slice(dataStartIndex);
        
        const filteredRows = dataRows.filter(row => 
          Array.isArray(row) && row.some(cell => typeof cell === 'string' && jiraKeyRegex.test(cell.toString())) && row.join('').trim() !== ''
        );

        if (filteredRows.length === 0) {
            return [];
        }

        return [headerRow, ...filteredRows];
    };

    try {
      if (activeTab === 'system') {
          const issueDataArray = await fetchJiraIssues({
              instanceUrl: jiraInstanceUrl,
              email: jiraEmail,
              apiToken: jiraToken,
              projectKey: jiraProjectKey,
          });

          if (issueDataArray.length < 2) { // header + at least one row
              toast({
                  variant: 'destructive',
                  title: 'Jira에서 이슈를 가져오지 못했습니다.',
                  description: '프로젝트 키가 올바른지, 해당 프로젝트에 접근 권한이 있는지 확인해주세요.',
              });
              setIsLoading(false);
              return;
          }

          stringifiedData = JSON.stringify(issueDataArray);

      } else if (activeTab === 'file') {
        if (!file) {
          toast({ variant: "destructive", title: "파일이 선택되지 않았습니다", description: "리포트를 생성할 Excel 파일을 선택해주세요." });
          setIsLoading(false);
          return;
        }
        stringifiedData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              let json_data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

              const final_data = filterData(json_data);

              if (final_data.length < 2) {
                return reject(new Error("Excel 시트가 비어있거나 유효한 데이터가 없습니다. 이슈 키를 포함한 데이터가 있는지 확인해주세요."));
              }
              resolve(JSON.stringify(final_data));
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error("파일을 읽는 중 문제가 발생했습니다."));
          reader.readAsArrayBuffer(file);
        });
      } else { // text input
        if (!textInput.trim()) {
          toast({ variant: "destructive", title: "입력된 내용이 없습니다", description: "텍스트 영역에 데이터를 붙여넣어 주세요." });
          setIsLoading(false);
          return;
        }
        let dataArray = textInput.trim().split('\n').map(row => row.split('\t'));
        
        const final_data = filterData(dataArray);
        
        if (final_data.length < 2) {
            toast({ variant: "destructive", title: "유효한 데이터를 붙여넣어 주세요.", description: "이슈 키를 포함한 데이터가 있는지 확인해주세요." });
            setIsLoading(false);
            return;
        }
        stringifiedData = JSON.stringify(final_data);
      }
      
      const generatedReport = await generateJiraReport({ issuesData: stringifiedData, analysisPoint });

      const processedReport = {
          ...generatedReport,
          issueBreakdown: generatedReport.issueBreakdown.map(issue => ({
              ...issue,
              summary: issue.summary.length > 50 ? issue.summary.substring(0, 50) + '...' : issue.summary,
              recommendation: issue.recommendation || "추천 없음",
              assignee: issue.assignee || "담당자 없음",
              status: issue.status || "상태 없음"
          }))
      };

      setReport(processedReport);

    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        variant: "destructive",
        title: "이런! 문제가 발생했습니다.",
        description: error instanceof Error ? error.message : "리포트를 생성하는 중 문제가 발생했습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const generatePlainTextReport = () => {
    if (!report) return "";
    let plainText = `Jira 이슈 요약 리포트\n\n`;
    plainText += `[전체 요약]\n${report.summary}\n\n`;
    plainText += `[주요 조치 항목]\n- ${report.priorityActions.join("\n- ")}\n\n`;
    plainText += `[개별 이슈 상세]\n`;
    report.issueBreakdown.forEach(issue => {
        plainText += `------------------------------------\n`;
        plainText += `이슈 키: ${issue.issueKey}\n`;
        plainText += `요약: ${issue.summary}\n`;
        plainText += `상태: ${issue.status}\n`;
        plainText += `담당자: ${issue.assignee}\n`;
        if (issue.createdDate) plainText += `생성일: ${issue.createdDate}\n`;
        if (issue.resolvedDate) plainText += `해결일: ${issue.resolvedDate}\n`;
        plainText += `AI 추천: ${issue.recommendation}\n`;
    });
    return plainText;
  }

  const copyToClipboard = () => {
    const reportText = generatePlainTextReport();
    navigator.clipboard.writeText(reportText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({ title: "클립보드에 복사되었습니다!" });
    }, (err) => {
        console.error('Failed to copy: ', err);
        toast({ variant: "destructive", title: "복사에 실패했습니다."});
    });
  }

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center">
      <Card className="w-full max-w-3xl">
        <CardHeader>
           <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Jira AI Analyst</CardTitle>
              <CardDescription>Jira에서 내보낸 Excel 파일을 업로드하거나 내용을 붙여넣어 AI 요약 리포트를 받아보세요.</CardDescription>
            </div>
            <div className="text-right text-xs text-muted-foreground pt-1 whitespace-nowrap">
              <p>Ver. 1.4.0, Jul 2025</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs 
            value={activeTab} 
            onValueChange={(newTab) => {
              setActiveTab(newTab);
              setFile(null);
              setTextInput('');
              setReport(null);
            }} 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file"><FileUp className="mr-2 h-4 w-4"/>파일 업로드</TabsTrigger>
              <TabsTrigger value="text"><FileText className="mr-2 h-4 w-4"/>텍스트 입력</TabsTrigger>
              <TabsTrigger value="system"><Server className="mr-2 h-4 w-4"/>시스템 접근</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="mt-4">
                <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                    회사 보안에 유의하세요.
                    </AlertDescription>
                </Alert>
                <div
                    className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <FileUp className="w-12 h-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">
                    {file ? file.name : "클릭하거나 파일을 여기로 드래그하세요"}
                    </p>
                    <p className="text-xs text-muted-foreground/80">(.xlsx, .xls)</p>
                </div>
                <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".xlsx, .xls, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                />
            </TabsContent>
            <TabsContent value="text" className="mt-4 space-y-2">
                <Textarea
                    placeholder="여기에 Excel/시트에서 복사한 이슈 데이터를 붙여넣으세요."
                    className="h-40"
                    value={textInput}
                    onChange={(e) => {
                        setTextInput(e.target.value);
                        setFile(null);
                    }}
                />
                {textInput && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTextInput('')}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      내용 지우기
                    </Button>
                  </div>
                )}
            </TabsContent>
            <TabsContent value="system" className="mt-4 space-y-4">
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Jira API 토큰을 사용하여 실시간 데이터를 분석합니다. 입력된 정보는 브라우저에 저장되어 다음 방문 시 자동으로 불러옵니다.
                    </AlertDescription>
                </Alert>
                <div className="space-y-2">
                    <Label htmlFor="jira-instance-url">Jira 인스턴스 URL</Label>
                    <Input
                        id="jira-instance-url"
                        placeholder="https://your-company.atlassian.net"
                        value={jiraInstanceUrl}
                        onChange={(e) => setJiraInstanceUrl(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="jira-email">Jira 이메일 (토큰 발급 계정)</Label>
                    <Input
                        id="jira-email"
                        placeholder="user@example.com"
                        value={jiraEmail}
                        onChange={(e) => setJiraEmail(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="jira-token">Jira API 토큰</Label>
                    <Input
                        id="jira-token"
                        type="password"
                        placeholder="API 토큰을 입력하세요"
                        value={jiraToken}
                        onChange={(e) => setJiraToken(e.target.value)}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="jira-project-key">Jira 프로젝트 키</Label>
                    <Input
                        id="jira-project-key"
                        placeholder="예: PROJ"
                        value={jiraProjectKey}
                        onChange={(e) => setJiraProjectKey(e.target.value)}
                    />
                </div>
            </TabsContent>
          </Tabs>
          <div className="mt-6 space-y-2">
            <Label htmlFor="analysis-point">분석 관점 (선택 사항)</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between font-normal text-left"
                >
                  <span className="truncate">
                    {analysisPoint || "예시를 선택하거나 직접 입력하세요..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command
                  filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                    return 0;
                  }}
                >
                  <CommandInput
                    placeholder="관점 검색 또는 직접 입력..."
                    value={inputValue}
                    onValueChange={setInputValue}
                  />
                  <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {analysisExamples.map((example) => (
                        <CommandItem
                          key={example.value}
                          value={example.value}
                          onSelect={(currentValue) => {
                            setAnalysisPoint(analysisPoint === currentValue ? "" : currentValue);
                            setInputValue(analysisPoint === currentValue ? "" : currentValue);
                            setPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              analysisPoint === example.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {example.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              분석 리포트의 요약 및 조치 항목에 적용할 특정 관점을 입력하세요.
            </p>
          </div>

        </CardContent>
        <CardFooter>
          <Button
            onClick={handleGenerateReport}
            disabled={
                isLoading || 
                (activeTab === 'file' && !file) || 
                (activeTab === 'text' && !textInput.trim()) ||
                (activeTab === 'system' && (!jiraInstanceUrl || !jiraEmail || !jiraToken || !jiraProjectKey))
            }
            className="w-full"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? "리포트 생성 중..." : "리포트 생성하기"}
          </Button>
        </CardFooter>
      </Card>

      {isLoading && (
        <Card className="w-full max-w-3xl mt-6">
          <CardContent className="p-6 flex flex-col items-center justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
             <p className="text-muted-foreground">AI가 이슈를 분석하고 있습니다. 잠시만 기다려주세요...</p>
          </CardContent>
        </Card>
      )}

      {report && !isLoading && (
        <Card className="w-full max-w-3xl mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>AI 요약 리포트</CardTitle>
              <CardDescription>분석이 완료되었습니다.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
              <span className="sr-only">리포트 복사하기</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {report.statusDistribution && report.statusDistribution.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-center">📊 이슈 상태 분포</h3>
                <ChartContainer config={{}} className="mx-auto aspect-square h-[250px]">
                  <PieChart>
                    <Tooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                     <Pie
                        data={report.statusDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        strokeWidth={5}
                      >
                        {report.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} className="focus:outline-none" />
                        ))}
                      </Pie>
                    <ChartLegend
                      content={<ChartLegendContent nameKey="name" />}
                      className="-translate-y-[20px] flex-wrap justify-center"
                    />
                  </PieChart>
                </ChartContainer>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg mb-2">📄 전체 요약</h3>
              <p className="text-sm text-foreground/80 bg-muted p-3 rounded-md whitespace-pre-wrap">{report.summary}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">⚡️ 주요 조치 항목</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 bg-muted p-3 rounded-md">
                {report.priorityActions.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">📋 개별 이슈 상세</h3>
              <Accordion type="single" collapsible className="w-full">
                {report.issueBreakdown.map((issue, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger>{issue.issueKey}: {issue.summary}</AccordionTrigger>
                    <AccordionContent className="space-y-2 pl-2">
                       <p><strong>상태:</strong> {issue.status}</p>
                       <p><strong>담당자:</strong> {issue.assignee}</p>
                       {issue.createdDate && <p><strong>생성일:</strong> {issue.createdDate}</p>}
                       {issue.resolvedDate && <p><strong>해결일:</strong> {issue.resolvedDate}</p>}
                       <p className="text-primary"><strong>AI 추천:</strong> {issue.recommendation}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </CardContent>
        </Card>
      )}
       <footer className="text-center text-xs text-muted-foreground mt-8">
          <p>Copyright © 2025 BMU. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
