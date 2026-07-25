import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const candidateHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const safeHost = /^[a-z0-9.-]+(?::\d+)?$/i.test(candidateHost)
    ? candidateHost
    : "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : safeHost.startsWith("localhost")
        ? "http"
        : "https";
  const metadataBase = new URL(`${protocol}://${safeHost}`);
  const imageUrl = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
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
      images: [{ url: imageUrl, width: 1672, height: 941, alt: "BranchTrace model circuit explorer" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "BranchTrace — Model Circuit Explorer",
      description:
        "Branch neural-network computations and inspect the first meaningful divergence.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{const t=localStorage.getItem("branchtrace-theme");const v=t==="light"||t==="dark"?t:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v}catch{document.documentElement.dataset.theme="light"}',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
