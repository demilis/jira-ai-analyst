
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DieFace } from "@/components/die-face";
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [die1, setDie1] = useState(6);
  const [die2, setDie2] = useState(6);
  const [sum, setSum] = useState(12);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    // Ensure this runs only on the client after hydration
    rollDice();
  }, []);

  const rollDice = () => {
    if (isRolling) return;

    setIsRolling(true);
    setTimeout(() => {
      const newDie1 = Math.floor(Math.random() * 6) + 1;
      const newDie2 = Math.floor(Math.random() * 6) + 1;
      setDie1(newDie1);
      setDie2(newDie2);
      setSum(newDie1 + newDie2);
      setIsRolling(false);
    }, 500); // Animation duration
  };

  const dieVariants = {
    initial: { rotate: 0, scale: 1 },
    rolling: { 
      rotate: [0, 360, 0, -360, 0], 
      scale: [1, 1.1, 1, 1.1, 1],
      transition: { duration: 0.5, ease: "easeInOut" }
    },
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl md:text-5xl font-bold text-primary">Dice Roller Duo</h1>
        
        <div className="flex gap-4 md:gap-8">
          <motion.div
            className="w-24 h-24 md:w-32 md:h-32 bg-primary rounded-lg shadow-lg flex items-center justify-center"
            variants={dieVariants}
            animate={isRolling ? "rolling" : "initial"}
          >
            <DieFace value={die1} />
          </motion.div>
          <motion.div
            className="w-24 h-24 md:w-32 md:h-32 bg-primary rounded-lg shadow-lg flex items-center justify-center"
            variants={dieVariants}
            animate={isRolling ? "rolling" : "initial"}
          >
            <DieFace value={die2} />
          </motion.div>
        </div>

        <div className="text-center">
            <p className="text-xl text-muted-foreground">Sum</p>
            <AnimatePresence mode="wait">
              <motion.p 
                key={sum}
                className="text-5xl md:text-6xl font-bold text-primary"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {sum}
              </motion.p>
            </AnimatePresence>
        </div>

        <Button 
          onClick={rollDice}
          disabled={isRolling}
          className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-lg rounded-lg shadow-md"
        >
          {isRolling ? 'Rolling...' : 'Re-roll Dice'}
        </Button>
      </div>
       <footer className="absolute bottom-4 text-center text-xs text-muted-foreground">
          <p>Dice Roller Duo</p>
      </footer>
    </main>
  );
}
