import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Vehicle Contact System",
  description: "Technical foundation for the Smart Vehicle Contact System.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
