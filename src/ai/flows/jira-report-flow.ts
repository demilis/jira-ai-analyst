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

const JiraReportOutputSchema = z.object({
  summary: z.string().describe("A high-level summary of all the issues provided. It should mention the total number of issues, how many are open, in progress, and done. Mention any noticeable trends or bottlenecks."),
  priorityActions: z.array(z.string()).describe("A bulleted list of the most critical actions to take, based on issue priority, status, and content. Max 3-5 items."),
  issueBreakdown: z.array(z.object({
    issueKey: z.string().describe("The issue identifier, e.g., 'HMCCCIC-12345'."),
    summary: z.string().describe("A concise one-sentence summary of the issue title or description."),
    status: z.string().describe("The current status of the issue."),
    assignee: z.string().describe("The person assigned to the issue. If none, state 'Unassigned'."),
    recommendation: z.string().describe("A brief, actionable recommendation from the AI for this specific issue, e.g., 'Follow up with assignee' or 'Clarification needed'."),
  })).describe("A detailed breakdown of each individual issue."),
});
export type JiraReportOutput = z.infer<typeof JiraReportOutputSchema>;

const prompt = ai.definePrompt({
    name: "jiraReportPrompt",
    input: { schema: JiraReportInputSchema },
    output: { schema: JiraReportOutputSchema },
    prompt: `You are a highly efficient project manager. Your task is to analyze a list of Jira issues and generate a summary report. The issues are provided as a stringified JSON array of arrays, where the first inner array is the header row.

Here is the data:
{{{issuesData}}}

After analyzing all the issues, generate a clear, concise, and actionable summary report.

Your response MUST be a JSON object that strictly adheres to the defined output schema.
The JSON object MUST contain all three of these top-level keys: 'summary', 'priorityActions', and 'issueBreakdown'. Do not omit any keys.

1.  **summary**: Provide a high-level summary of the overall situation. Mention total issues, statuses (e.g., open, in progress, done), and any noticeable trends or bottlenecks.
2.  **priorityActions**: Provide a short, prioritized list of 3-5 critical actions to take based on issue priority, status, and content.
3.  **issueBreakdown**: Provide a detailed breakdown of each individual issue, including its key, summary, status, assignee, and an AI-powered recommendation.
`,
});

const jiraReportFlow = ai.defineFlow(
    {
        name: 'jiraReportFlow',
        inputSchema: JiraReportInputSchema,
        outputSchema: JiraReportOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        if (!output) {
            throw new Error('The AI failed to generate a report.');
        }
        return output;
    }
);

export async function generateJiraReport(input: JiraReportInput): Promise<JiraReportOutput> {
  return jiraReportFlow(input);
}
