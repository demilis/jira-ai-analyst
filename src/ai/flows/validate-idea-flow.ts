'use server';
/**
 * @fileOverview A simple chat AI agent that demonstrates a protocol for passing context to a model.
 *
 * - continueConversation - A function that continues a conversation based on history.
 * - ConversationInput - The input type for the continueConversation function.
 * - ConversationMessage - The structure for a single message in the conversation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConversationMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

const ConversationInputSchema = z.object({
  history: z.array(ConversationMessageSchema).describe("The history of the conversation so far."),
  message: z.string().describe("The latest message from the user."),
});
export type ConversationInput = z.infer<typeof ConversationInputSchema>;


export async function continueConversation(input: ConversationInput): Promise<string> {
  const { output } = await ai.generate({
    prompt: input.message,
    history: input.history,
  });

  if (!output) {
      throw new Error("The AI failed to generate a response.");
  }
  return output;
}
