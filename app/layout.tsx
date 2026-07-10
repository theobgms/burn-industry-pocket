import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Burn Industry Pocket",
  description: "Bookkeeping for Burn Industry and The OBGMs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Mono:wght@400;700&family=Press+Start+2P&display=swap" rel="stylesheet" />
        <style>{`
          *{box-sizing:border-box}
          html,body{margin:0;padding:0;background:#0D0D0D;color:#F2F2F2}
          input,textarea,button,select{font-family:'Space Mono',monospace}
          input:focus,textarea:focus{outline:none}
          @keyframes biShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
