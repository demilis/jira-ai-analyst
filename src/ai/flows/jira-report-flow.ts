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
    prompt: `You are a Jira analysis expert. Your primary and only task is to create a JSON report based on the provided Jira issue data.

**CRITICAL INSTRUCTION**: Your entire response MUST be a single, valid JSON object. Do not add any other text, explanation, or formatting. The JSON object must strictly adhere to this structure:
{
  "summary": "string",
  "priorityActions": ["string", "string", ...],
  "issueBreakdown": [ { "issueKey": "string", "summary": "string", "status": "string", "assignee": "string", "recommendation": "string" }, ... ]
}

All three top-level keys ('summary', 'priorityActions', 'issueBreakdown') are mandatory and MUST be present in your response.

Here is the Jira issue data, provided as a stringified JSON array of arrays:
{{{issuesData}}}

Now, analyze the data and generate the JSON object with the following content:

1.  **For the \`summary\` key**: Write a high-level summary. Include the total number of issues, a count by status (e.g., Resolved, Closed, In Progress), and identify any trends or bottlenecks.
2.  **For the \`priorityActions\` key**: Create a list of 3-5 critical, actionable items based on the issues.
3.  **For the \`issueBreakdown\` key**: Fill the array with details for each individual issue. For the 'assignee' field, if it is blank in the source data, use the string 'Unassigned'.

Construct the final JSON object. Ensure it is complete, valid, and contains all three mandatory keys.`,
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
