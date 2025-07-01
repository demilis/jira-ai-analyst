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
});
export type JiraReportInput = z.infer<typeof JiraReportInputSchema>;

const IssueBreakdownItemSchema = z.object({
    issueKey: z.string().describe("The issue identifier, e.g., 'HMCCCIC-12345'."),
    summary: z.string().describe("A concise one-sentence summary of the issue title or description."),
    status: z.string().describe("The current status of the issue."),
    assignee: z.string().describe("The person assigned to the issue. If none, state 'Unassigned'."),
    recommendation: z.string().describe("A brief, actionable recommendation from the AI for this specific issue, e.g., 'Follow up with assignee' or 'Clarification needed'."),
});

const JiraReportOutputSchema = z.object({
  summary: z.string().describe("A high-level summary of all the issues provided. It should mention the total number of issues, how many are open, in progress, and done. Mention any noticeable trends or bottlenecks."),
  priorityActions: z.array(z.string()).describe("A bulleted list of the most critical actions to take, based on issue priority, status, and content. Max 3-5 items."),
  issueBreakdown: z.array(IssueBreakdownItemSchema).describe("A detailed breakdown of each individual issue."),
});
export type JiraReportOutput = z.infer<typeof JiraReportOutputSchema>;

// Schema for the output of the FIRST prompt (just the breakdown)
const IssueBreakdownOnlySchema = z.object({
    issueBreakdown: z.array(IssueBreakdownItemSchema).describe("A detailed breakdown of each individual issue."),
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
    prompt: `You are an expert at processing raw Jira data. Your ONLY task is to convert the provided Jira data into a JSON object containing a single key: "issueBreakdown".
For EACH issue in the data, create an object with "issueKey", "summary", "status", "assignee", and "recommendation".
Your entire response MUST be a single JSON object with the "issueBreakdown" array. DO NOT add any other keys like "summary" or "priorityActions".

**Jira Data:**
{{{issuesData}}}

Now, generate the JSON object based on the provided Jira Data.`,
});

// SECOND Prompt: Focuses only on summarizing the breakdown.
const summarizeBreakdownPrompt = ai.definePrompt({
    name: "summarizeBreakdownPrompt",
    input: { schema: z.object({ breakdownString: z.string() }) },
    output: { schema: SummaryAndActionsSchema },
    prompt: `You are a project management expert. Based on the following JSON data of Jira issues, generate a high-level summary and a list of priority actions.

**Issue Breakdown Data:**
{{{breakdownString}}}

**Instructions:**
Your entire response MUST be a single, valid JSON object with ONLY two keys: "summary" and "priorityActions".
1.  **\`summary\` (string):** Write a high-level summary. Count the total issues and break them down by status (e.g., Closed, Resolved, In Progress). Mention any noticeable trends, risks, or bottlenecks.
2.  **\`priorityActions\` (array of strings):** List the top 3-5 most critical, actionable items for the team to focus on.

Now, generate the JSON object based on the provided Issue Breakdown Data.`,
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
            throw new Error('The AI failed to generate the issue breakdown.');
        }

        // Step 2: Generate the summary and actions from the breakdown
        const { output: summaryOutput } = await summarizeBreakdownPrompt({
            breakdownString: JSON.stringify(breakdownOutput.issueBreakdown),
        });
        if (!summaryOutput) {
            throw new Error('The AI failed to generate the summary and actions.');
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
