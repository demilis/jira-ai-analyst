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
    prompt: `You are an expert at analyzing Jira issues and generating structured JSON reports. Your task is to process the raw Jira data provided below and create a complete JSON report with three sections: 'summary', 'priorityActions', and 'issueBreakdown'.

**Jira Data:**
{{{issuesData}}}

**Instructions:**
Based on the Jira Data above, generate a single, valid JSON object that strictly follows this structure. DO NOT output any text before or after the JSON.

1.  **\`summary\` (string):** Write a high-level summary. Count the total issues and break them down by status. Mention any trends.
2.  **\`priorityActions\` (array of strings):** List the top 3-5 most critical actions to take.
3.  **\`issueBreakdown\` (array of objects):** For EVERY issue in the data, create an object containing:
    *   \`issueKey\`: The issue ID.
    *   \`summary\`: A short summary of the issue.
    *   \`status\`: The current status.
    *   \`assignee\`: The assigned person (use "Unassigned" if empty).
    *   \`recommendation\`: A brief, actionable recommendation.

Your entire response MUST be a single JSON object.

**Example of the required output format:**
{
  "summary": "Total of 55 issues analyzed. 30 are Closed, 20 are Resolved, 5 are In Progress. A bottleneck seems to be in the 'In Progress' state for over 2 weeks.",
  "priorityActions": [
    "Address the blocker in HMCCCIC-12345 immediately.",
    "Follow up with 'John Doe' on overdue tasks.",
    "Review all 'In Progress' issues to identify a common cause for delay."
  ],
  "issueBreakdown": [
    {
      "issueKey": "HMCCCIC-109124",
      "summary": "Issue with the main dashboard loading slowly.",
      "status": "In Progress",
      "assignee": "Jane Doe",
      "recommendation": "Investigate the database query performance."
    }
  ]
}

Now, generate the JSON object based on the provided Jira Data.`,
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
