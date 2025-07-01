"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { generateJiraReport, type JiraReportOutput } from "@/ai/flows/jira-report-flow";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, FileUp, Clipboard, Check, FileText } from "lucide-react";
import * as XLSX from "xlsx";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [analysisPoint, setAnalysisPoint] = useState("");
  const [activeTab, setActiveTab] = useState("file");
  const [report, setReport] = useState<JiraReportOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.includes("sheet") || selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls")) {
        setFile(selectedFile);
        setTextInput(""); // Clear text input when a file is selected
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

    try {
      let stringifiedData: string;

      if (activeTab === 'file') {
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
              let json_data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

              // Filter out rows that are empty or have very little content
              json_data = json_data.filter(row => {
                if (!Array.isArray(row)) return false;
                // Ensure the row has at least 2 non-empty cells to be considered valid
                return row.filter(cell => cell != null && cell.toString().trim() !== '').length >= 2;
              });

              if (!json_data || json_data.length < 2) { // Need at least header + 1 data row
                return reject(new Error("Excel 시트가 비어있거나 유효한 데이터가 없습니다."));
              }
              resolve(JSON.stringify(json_data));
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
        const rows = textInput.trim().split('\n');
        let dataArray = rows.map(row => row.split('\t'));
        
        // Filter out rows that are empty or have very little content
        dataArray = dataArray.filter(row => {
            if (!Array.isArray(row)) return false;
            // Ensure the row has at least 2 non-empty cells to be considered valid
            return row.filter(cell => cell != null && cell.toString().trim() !== '').length >= 2;
        });
        
        if (!dataArray || dataArray.length === 0) {
            toast({ variant: "destructive", title: "입력된 내용이 없습니다", description: "유효한 데이터를 붙여넣어 주세요." });
            setIsLoading(false);
            return;
        }
        stringifiedData = JSON.stringify(dataArray);
      }
      
      const generatedReport = await generateJiraReport({ issuesData: stringifiedData, analysisPoint });
      setReport(generatedReport);

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
          <CardTitle className="text-2xl">Jira Analyzer by BMU</CardTitle>
          <CardDescription>복잡한 Jira 데이터를 AI로 요약하세요. 엑셀 파일을 업로드하거나 붙여넣기만 하면 리포트가 완성됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file"><FileUp className="mr-2 h-4 w-4"/>파일 업로드</TabsTrigger>
              <TabsTrigger value="text"><FileText className="mr-2 h-4 w-4"/>텍스트 입력</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="mt-4">
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
            <TabsContent value="text" className="mt-4">
                <Textarea
                    placeholder="여기에 Excel/시트에서 복사한 이슈 데이터를 붙여넣으세요."
                    className="h-40"
                    value={textInput}
                    onChange={(e) => {
                        setTextInput(e.target.value);
                        setFile(null); // Clear file input when text is entered
                    }}
                />
            </TabsContent>
          </Tabs>
          <div className="mt-6 space-y-2">
            <Label htmlFor="analysis-point">분석 관점 (선택 사항)</Label>
            <Input
              id="analysis-point"
              placeholder="예: 리포터별 진행상황, 특정 키워드('결함') 관련 이슈"
              value={analysisPoint}
              onChange={(e) => setAnalysisPoint(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              분석 리포트의 요약 및 조치 항목에 적용할 특정 관점을 입력하세요.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleGenerateReport}
            disabled={isLoading || (activeTab === 'file' && !file) || (activeTab === 'text' && !textInput.trim())}
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
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">📊 전체 요약</h3>
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
                       <p className="text-primary"><strong>AI 추천:</strong> {issue.recommendation}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
