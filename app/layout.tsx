import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BranchTrace — Model Circuit Explorer",
  description:
    "Branch neural-network computations, intervene on influential features, and compare deterministic counterfactual executions.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "BranchTrace — Model Circuit Explorer",
    description:
      "Interactive, intervention-first circuit hypotheses for public-model-style activation traces.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "BranchTrace — Model Circuit Explorer",
    description:
      "Branch neural-network computations and inspect the first meaningful divergence.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
