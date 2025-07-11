
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateJiraReport, type JiraReportOutput } from "@/ai/flows/jira-report-flow";
import { fetchJiraIssues } from "@/services/jira-service";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Clipboard, Check, AlertTriangle, ChevronsUpDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [analysisPoint, setAnalysisPoint] = useState("");
  const [inputValue, setInputValue] = useState(analysisPoint);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [jiraProjectKey, setJiraProjectKey] = useState("");

  const [report, setReport] = useState<JiraReportOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // When a selection is made, update the input field's value
    if (analysisPoint) {
      setInputValue(analysisPoint);
    }
  }, [analysisPoint]);


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

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReport(null);

    let stringifiedData: string;

    try {
        const issueDataArray = await fetchJiraIssues({
            projectKey: jiraProjectKey,
        });

        if (issueDataArray.length < 2) { // header + at least one row
            toast({
                variant: 'destructive',
                title: 'Jira에서 이슈를 가져오지 못했습니다.',
                description: '프로젝트 키가 올바른지, 또는 서버에 설정된 인증 정보로 해당 프로젝트에 접근 가능한지 확인해주세요.',
            });
            setIsLoading(false);
            return;
        }

        stringifiedData = JSON.stringify(issueDataArray);

        const finalAnalysisPoint = analysisPoint || inputValue;
        const generatedReport = await generateJiraReport({ issuesData: stringifiedData, analysisPoint: finalAnalysisPoint });

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
              <CardDescription>Jira API를 통해 실시간 데이터를 분석하고 AI 요약 리포트를 받아보세요.</CardDescription>
            </div>
            <div className="text-right text-xs text-muted-foreground pt-1 whitespace-nowrap">
              <p>Ver. 2.0.0, Jul 2025</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    이 앱은 서버에 미리 설정된 인증 정보를 사용하여 Jira 데이터를 가져옵니다. 분석할 프로젝트 키를 입력하고 리포트 생성을 시작하세요.
                </AlertDescription>
            </Alert>
            <div className="space-y-4 mt-6">
                 <div className="space-y-2">
                    <Label htmlFor="jira-project-key">Jira 프로젝트 키</Label>
                    <Input
                        id="jira-project-key"
                        placeholder="분석할 프로젝트의 키를 입력하세요 (예: PROJ)"
                        value={jiraProjectKey}
                        onChange={(e) => setJiraProjectKey(e.target.value)}
                    />
                </div>
            </div>
          <div className="mt-6 space-y-2">
            <Label htmlFor="analysis-point">분석 관점 (선택 사항)</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between font-normal text-left"
                  onClick={() => setPopoverOpen(true)}
                >
                  <span className="truncate">
                    {inputValue || "예시를 선택하거나 직접 입력하세요..."}
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
                    onBlur={() => setAnalysisPoint(inputValue)}
                  />
                  <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {analysisExamples.map((example) => (
                        <CommandItem
                          key={example.value}
                          value={example.value}
                          onSelect={(currentValue) => {
                            setAnalysisPoint(currentValue);
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
                isLoading || !jiraProjectKey
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
