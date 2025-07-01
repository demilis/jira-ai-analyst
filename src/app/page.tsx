"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { generateJiraReport, type JiraReportOutput } from "@/ai/flows/jira-report-flow";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, FileUp, Clipboard, Check } from "lucide-react";
import * as XLSX from "xlsx";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
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
        setReport(null);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a valid Excel file (.xlsx, .xls).",
        });
      }
    }
  };

  const handleGenerateReport = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select an Excel file to generate a report.",
      });
      return;
    }

    setIsLoading(true);
    setReport(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json_data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (json_data.length === 0) {
            throw new Error("Excel sheet is empty or invalid.");
          }

          const stringifiedData = JSON.stringify(json_data);
          
          const generatedReport = await generateJiraReport({ issuesData: stringifiedData });
          setReport(generatedReport);

        } catch (error) {
           console.error("Error processing file:", error);
           toast({
             variant: "destructive",
             title: "Oh no! Something went wrong.",
             description: error instanceof Error ? error.message : "Failed to process the Excel file.",
           });
        } finally {
           setIsLoading(false);
        }
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast({
          variant: "destructive",
          title: "File Read Error",
          description: "There was a problem reading your file.",
        });
        setIsLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
       console.error("Error generating report:", error);
       toast({
         variant: "destructive",
         title: "Oh no! Something went wrong.",
         description: "There was a problem generating the report.",
       });
       setIsLoading(false);
    }
  };

  const generatePlainTextReport = () => {
    if (!report) return "";
    let plainText = `Jira 이슈 요약 리포트\n\n`;
    plainText += `[전체 요약]\n${report.summary}\n\n`;
    plainText += `[주요 조치 항목]\n${report.priorityActions.join("\n- ")}\n\n`;
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
        toast({ title: "Copied to clipboard!" });
    }, (err) => {
        console.error('Failed to copy: ', err);
        toast({ variant: "destructive", title: "Failed to copy report."});
    });
  }

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Jira 이슈 리포트 생성기</CardTitle>
          <CardDescription>Jira에서 내보낸 Excel 파일을 업로드하여 AI 요약 리포트를 받아보세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleGenerateReport}
            disabled={!file || isLoading}
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
              <span className="sr-only">Copy for Teams</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">📊 전체 요약</h3>
              <p className="text-sm text-foreground/80 bg-muted p-3 rounded-md">{report.summary}</p>
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
