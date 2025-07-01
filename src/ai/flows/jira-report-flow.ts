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
    prompt: `You are a JSON generation machine. Your sole purpose is to analyze the provided Jira issue data and output a valid JSON object. Nothing else.

**MANDATORY OUTPUT FORMAT**:
Your entire response MUST be a single, valid JSON object. Do not output any text, markdown, or explanations before or after the JSON.
The JSON object must contain these exact three top-level keys: \`summary\`, \`priorityActions\`, \`issueBreakdown\`. All keys are required.

**DATA ANALYSIS INSTRUCTIONS**:
Use the following Jira data to populate the JSON object:
{{{issuesData}}}

1.  **\`summary\` (string)**: Analyze all issues. Provide a high-level summary including total issue count, a breakdown of statuses (Resolved, Closed, In Progress, etc.), and any notable trends.
2.  **\`priorityActions\` (array of strings)**: Identify 3-5 of the most critical action items based on the issues.
3.  **\`issueBreakdown\` (array of objects)**: For each issue, create an object with \`issueKey\`, \`summary\`, \`status\`, \`assignee\`, and a brief \`recommendation\`. If an assignee is missing, use "Unassigned".

Now, generate the complete and valid JSON object as instructed.`,
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
