import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
const imageUrl = new URL(`${basePath}/og.png`, metadataBase).toString();

export const metadata: Metadata = {
  metadataBase,
  title: "Circuit Interpretability",
  description:
    "Trace a circuit hypothesis, replay a stored intervention, and validate the result.",
  icons: {
    icon: `${basePath}/favicon.svg`,
    shortcut: `${basePath}/favicon.svg`,
  },
  openGraph: {
    title: "Circuit Interpretability",
    description:
      "An intervention-first notebook for circuit hypotheses.",
    images: [{ url: imageUrl, width: 1672, height: 941, alt: "Circuit Interpretability model circuit explorer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Circuit Interpretability",
    description:
      "Trace a circuit hypothesis, intervene, and validate the result.",
    images: [imageUrl],
  },
};

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
