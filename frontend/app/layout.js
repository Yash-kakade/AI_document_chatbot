import "./globals.css";

export const metadata = {
  title: "DocuMind AI — Intelligent Document Chat",
  description:
    "Upload documents and ask questions powered by AI. Get instant, accurate answers from your PDFs using advanced RAG technology.",
  keywords: ["AI", "document", "chat", "RAG", "PDF", "question answering"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
