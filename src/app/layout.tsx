import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dice Roller Duo',
  description: 'Simulate rolling two dice.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
