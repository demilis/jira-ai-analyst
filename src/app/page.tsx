"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Lightbulb, AlertTriangle, Target } from "lucide-react";
import {
  validateIdea,
  type IdeaInput,
  type IdeaOutput,
} from "@/ai/flows/validate-idea-flow";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  problem: z.string().min(20, "Please describe the problem in at least 20 characters."),
  solution: z.string().min(20, "Please describe your solution in at least 20 characters."),
});

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IdeaOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      problem: "",
      solution: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const ideaResult = await validateIdea(values as IdeaInput);
      setResult(ideaResult);
    } catch (error) {
      console.error("Error validating idea:", error);
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: "There was a problem with your request. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary md:text-5xl font-headline mb-2">
            MVP Idea Validator
          </h1>
          <p className="text-lg text-muted-foreground">
            Got a startup idea? Let's see if it's viable.
          </p>
        </div>

        <Card className="w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Your Big Idea</CardTitle>
                <CardDescription>
                  Describe the problem you're solving and your proposed solution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="problem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg">The Problem</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., 'Finding a trustworthy house sitter is difficult and stressful for pet owners.'"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="solution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg">Your Solution</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., 'A mobile app that connects pet owners with vetted, reviewed, and insured local sitters.'"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Validate My Idea"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {isLoading && (
          <div className="text-center p-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">The AI is thinking...</p>
          </div>
        )}

        {result && (
          <div className="mt-12 space-y-8">
            <h2 className="text-3xl font-bold text-center">Validation Results</h2>
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-3 bg-secondary rounded-full"><Target className="h-6 w-6 text-primary" /></div>
                        <div>
                            <CardTitle>Problem-Solution Fit</CardTitle>
                            <CardDescription>How well the solution fits the problem.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-primary mb-2">{result.problemSolutionFit.score}/10</p>
                        <p className="text-muted-foreground">{result.problemSolutionFit.reasoning}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-3 bg-secondary rounded-full"><Lightbulb className="h-6 w-6 text-primary" /></div>
                        <div>
                            <CardTitle>Market Potential</CardTitle>
                            <CardDescription>The potential market size and viability.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-primary mb-2">{result.marketPotential.score}/10</p>
                        <p className="text-muted-foreground">{result.marketPotential.reasoning}</p>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>MVP Recommendation</CardTitle>
                    <CardDescription>The single most important feature for your MVP.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>{result.mvpRecommendation}</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                     <AlertTriangle className="h-6 w-6 text-destructive" />
                     <CardTitle>Potential Concerns</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        {result.concerns.map((concern, index) => (
                            <li key={index}>{concern}</li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
