import type { Metadata } from "next";
import { ClerkProvider, SignedIn, UserButton } from "@clerk/nextjs";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SyncUser from "../utils/SyncUser";
import Sidenav from "../components/navbar/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Course Roadmap Automation | GitSmart",
  description: "Master Git. Automate Workflows. Code Smarter. AI-powered course roadmap automation platform.",
  keywords: ["AI", "Git", "Course", "Automation", "Learning", "Development"],
  authors: [{ name: "GitSmart Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#0ea5e9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html 
        lang="en" 
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      >
        <body className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
          <div className="relative min-h-screen">
            <SignedIn>
              <div className="absolute top-6 right-6 z-50">
                <div className="glass rounded-2xl p-2 shadow-medium">
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "w-10 h-10 rounded-xl",
                        userButtonPopoverCard: "glass rounded-2xl border-gray-200 dark:border-gray-700 shadow-hard",
                        userButtonPopoverActionButton: "hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl",
                      }
                    }}
                  />
                </div>
              </div>
            </SignedIn>
            <SyncUser />
            <Sidenav />
            <main className=" px-4 md:px-6 lg:px-8 min-h-screen">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
