import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeWork MCP",
  description: "Connect WeWork bookings to Claude through remote MCP."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
