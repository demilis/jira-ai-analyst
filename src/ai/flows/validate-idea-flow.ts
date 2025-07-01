'use server';
/**
 * @fileOverview An AI agent for validating business ideas.
 *
 * - validateIdea - A function that handles the idea validation process.
 * - IdeaInput - The input type for the validateIdea function.
 * - IdeaOutput - The return type for the validateIdea function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdeaInputSchema = z.object({
  problem: z.string().describe('The problem the user is trying to solve.'),
  solution: z.string().describe('The proposed solution to the problem.'),
});
export type IdeaInput = z.infer<typeof IdeaInputSchema>;

const IdeaOutputSchema = z.object({
  problemSolutionFit: z.object({
      score: z.number().min(1).max(10).describe('A score from 1-10 indicating how well the solution solves the problem.'),
      reasoning: z.string().describe('A brief explanation for the problem-solution fit score.'),
  }),
  marketPotential: z.object({
      score: z.number().min(1).max(10).describe('A score from 1-10 indicating the potential market size and viability.'),
      reasoning: z.string().describe('A brief explanation for the market potential score.'),
  }),
  mvpRecommendation: z.string().describe('A recommendation for the most critical feature to build for an MVP.'),
  concerns: z.array(z.string()).describe('A list of potential risks or concerns about the idea.'),
});
export type IdeaOutput = z.infer<typeof IdeaOutputSchema>;

export async function validateIdea(input: IdeaInput): Promise<IdeaOutput> {
  return validateIdeaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'validateIdeaPrompt',
  input: {schema: IdeaInputSchema},
  output: {schema: IdeaOutputSchema},
  prompt: `You are a world-class startup mentor and business analyst. Your task is to evaluate a new business idea based on the problem and solution provided.

Analyze the following idea:
Problem Statement: {{{problem}}}
Proposed Solution: {{{solution}}}

Provide a critical and honest evaluation.

1.  **Problem-Solution Fit**: How well does the proposed solution address the stated problem? Is the problem a significant one for a specific target audience? Provide a score from 1 (poor fit) to 10 (perfect fit) and explain your reasoning.
2.  **Market Potential**: Is there a potentially large market for this solution? Is it a "nice-to-have" or a "must-have"? Provide a score from 1 (niche, low potential) to 10 (massive potential) and explain your reasoning.
3.  **MVP Recommendation**: Based on the idea, what is the absolute single most important feature that should be built for a Minimum Viable Product (MVP) to test the core hypothesis? Be specific and concise.
4.  **Potential Concerns**: List the top 2-3 critical risks or concerns for this business idea (e.g., competition, technical feasibility, market adoption).

Structure your response strictly according to the output schema.`,
});

const validateIdeaFlow = ai.defineFlow(
  {
    name: 'validateIdeaFlow',
    inputSchema: IdeaInputSchema,
    outputSchema: IdeaOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI failed to generate a response.");
    }
    return output;
  }
);
