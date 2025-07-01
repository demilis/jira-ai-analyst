"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DieFace } from "@/components/die-face";
import { cn } from "@/lib/utils";

export default function Home() {
  const [die1, setDie1] = useState(1);
  const [die2, setDie2] = useState(6);
  const [isRolling, setIsRolling] = useState(false);

  const sum = die1 + die2;

  const rollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    
    // The timeout should be the length of the animation
    setTimeout(() => {
      setDie1(Math.floor(Math.random() * 6) + 1);
      setDie2(Math.floor(Math.random() * 6) + 1);
      setIsRolling(false);
    }, 1000); 
  };

  // Set initial random values on client mount to avoid hydration error
  useEffect(() => {
    setDie1(Math.floor(Math.random() * 6) + 1);
    setDie2(Math.floor(Math.random() * 6) + 1);
  }, []);

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 font-body">
      <div className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold text-primary md:text-5xl font-headline">
          Dice Roller Duo
        </h1>

        <div className="flex gap-4 md:gap-8 [perspective:1000px]">
          <div
            className={cn(
              "w-24 h-24 md:w-32 md:h-32 bg-primary rounded-2xl shadow-lg [transform-style:preserve-3d]",
              isRolling && "animate-roll"
            )}
          >
            <DieFace value={die1} />
          </div>
          <div
            className={cn(
              "w-24 h-24 md:w-32 md:h-32 bg-primary rounded-2xl shadow-lg [transform-style:preserve-3d]",
              isRolling && "animate-roll"
            )}
          >
            <DieFace value={die2} />
          </div>
        </div>

        <div>
          <p className="text-lg text-muted-foreground">Sum</p>
          <p className="text-6xl font-bold text-primary">{sum}</p>
        </div>
        
        <Button
          onClick={rollDice}
          disabled={isRolling}
          size="lg"
          className="px-12 py-8 text-xl bg-accent hover:bg-accent/90 text-accent-foreground rounded-full shadow-lg"
        >
          {isRolling ? "Rolling..." : "Roll Again"}
        </Button>
      </div>
    </main>
  );
}
