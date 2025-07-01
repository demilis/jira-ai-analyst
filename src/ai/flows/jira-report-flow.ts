'use server';
/**
 * @fileOverview An AI agent that analyzes Jira issues from an Excel export and generates a summary report.
 *
 * - generateJiraReport - A function that takes Jira issue data and returns a structured report.
 * - JiraReportInput - The input type for the generateJiraReport function.
 * - JiraReportOutput - The return type for the generateJiraReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const JiraReportInputSchema = z.object({
  issuesData: z.string().describe("A stringified JSON array of arrays representing the Jira issues from an Excel sheet. The first inner array is the header row."),
  analysisPoint: z.string().optional().describe("An optional user-provided focus point for the analysis, e.g., 'Reporter', 'Priority', or specific keywords."),
});
export type JiraReportInput = z.infer<typeof JiraReportInputSchema>;

const IssueBreakdownItemSchema = z.object({
    issueKey: z.string(),
    summary: z.string(),
    status: z.string(),
    assignee: z.string(),
    recommendation: z.string(),
});

const JiraReportOutputSchema = z.object({
  summary: z.string().describe("A high-level summary of all the issues provided. It should mention the total number of issues, how many are open, in progress, and done. Mention any noticeable trends or bottlenecks."),
  priorityActions: z.array(z.string()).describe("A bulleted list of the most critical actions to take, based on issue priority, status, and content. Max 3-5 items."),
  issueBreakdown: z.array(IssueBreakdownItemSchema).describe("A detailed breakdown of each individual issue."),
});
export type JiraReportOutput = z.infer<typeof JiraReportOutputSchema>;

// Schema for the output of the FIRST prompt (just the breakdown)
const IssueBreakdownOnlySchema = z.object({
    issueBreakdown: z.array(IssueBreakdownItemSchema),
});

// Schema for the input of the SECOND prompt
const SummarizeInputSchema = z.object({
    breakdownString: z.string(),
    analysisPoint: z.string().optional(),
});

// Schema for the output of the SECOND prompt (summary + actions)
const SummaryAndActionsSchema = z.object({
    summary: z.string().describe("A high-level summary of all the issues provided. It should mention the total number of issues, how many are open, in progress, and done. Mention any noticeable trends or bottlenecks."),
    priorityActions: z.array(z.string()).describe("A bulleted list of the most critical actions to take, based on issue priority, status, and content. Max 3-5 items."),
});

// FIRST Prompt: Focuses only on creating the issue breakdown.
const createBreakdownPrompt = ai.definePrompt({
    name: "createBreakdownPrompt",
    input: { schema: JiraReportInputSchema },
    output: { schema: IssueBreakdownOnlySchema },
    prompt: `You are a machine that converts raw Jira data into a JSON object with a single "issueBreakdown" key.
For EACH issue in the data, create an object with "issueKey", "summary", "status", "assignee", and "recommendation".

**CRITICAL RULES to prevent errors:**
1.  **'summary'**: MUST be a VERY SHORT summary of the original issue title, **under 15 words**. DO NOT copy the full original title.
2.  **'recommendation'**: MUST be a VERY SHORT, actionable recommendation in **KOREAN**, **under 10 words**.
3.  **VALID JSON**: Your entire response MUST be a single, valid JSON object. It is critical that you complete the JSON structure without being cut off.
4.  **IGNORE EMPTY ROWS**: If you see an empty row or a row with no useful information in the Jira Data, simply ignore it and DO NOT create a JSON object for it.

**Jira Data:**
{{{issuesData}}}

Now, generate the JSON object based on the provided Jira Data, following all rules strictly.`,
});

// SECOND Prompt: Focuses only on summarizing the breakdown.
const summarizeBreakdownPrompt = ai.definePrompt({
    name: "summarizeBreakdownPrompt",
    input: { schema: SummarizeInputSchema },
    output: { schema: SummaryAndActionsSchema },
    prompt: `You are a project management expert who writes reports in KOREAN.
Based on the following JSON data of Jira issues, generate a high-level summary and a list of priority actions in KOREAN.

{{#if analysisPoint}}
The user wants you to specifically focus on '{{{analysisPoint}}}'. Pay close attention to this when creating the summary and priority actions. For example, if the analysis point is 'Priority', group issues by priority in your summary. If it's a specific keyword, highlight issues containing that keyword.
{{/if}}

**Issue Breakdown Data (JSON):**
{{{breakdownString}}}

**Instructions:**
Your entire response MUST be a single, valid JSON object with ONLY two keys: "summary" and "priorityActions".
The entire response MUST be in KOREAN.
1.  **\`summary\` (string, in Korean):** Write a high-level summary. Count the total issues and break them down by status. {{#if analysisPoint}}Incorporate the user's analysis point '{{{analysisPoint}}}' into your summary.{{else}}Mention any noticeable trends, risks, or bottlenecks.{{/if}}
2.  **\`priorityActions\` (array of strings, in Korean):** List the top 3-5 most critical, actionable items for the team to focus on. {{#if analysisPoint}}These actions should be heavily influenced by the analysis point '{{{analysisPoint}}}'.{{/if}}

Now, generate the KOREAN JSON object based on the provided Issue Breakdown Data.`,
});

const jiraReportFlow = ai.defineFlow(
    {
        name: 'jiraReportFlow',
        inputSchema: JiraReportInputSchema,
        outputSchema: JiraReportOutputSchema,
    },
    async (input) => {
        // Step 1: Generate the issue breakdown
        const { output: breakdownOutput } = await createBreakdownPrompt(input);
        if (!breakdownOutput || !breakdownOutput.issueBreakdown) {
            throw new Error('AI가 이슈 세부 항목을 생성하는 데 실패했습니다.');
        }

        // Step 2: Generate the summary and actions from the breakdown
        const { output: summaryOutput } = await summarizeBreakdownPrompt({
            breakdownString: JSON.stringify(breakdownOutput.issueBreakdown),
            analysisPoint: input.analysisPoint,
        });
        if (!summaryOutput) {
            throw new Error('AI가 요약 및 조치 항목을 생성하는 데 실패했습니다.');
        }

        // Step 3: Combine the results
        return {
            summary: summaryOutput.summary,
            priorityActions: summaryOutput.priorityActions,
            issueBreakdown: breakdownOutput.issueBreakdown,
        };
    }
);

export async function generateJiraReport(input: JiraReportInput): Promise<JiraReportOutput> {
  return jiraReportFlow(input);
}
