"use client";

import { useState, useRef, useEffect } from "react";

const API_BASE = "http://localhost:8000";

const SUGGESTED_QUESTIONS = [
  "Summarize this document in key points",
  "What are the main findings?",
  "What conclusions does the author draw?",
  "List the key topics covered",
];

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentInfo, setDocumentInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Health check
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        if (res.ok) setBackendConnected(true);
      } catch {
        setBackendConnected(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // ── Upload Handler ───────────────────────────────────────────────────────
  const handleUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a valid PDF file.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    // Simulate progress stages
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Upload failed");
      }

      const data = await res.json();
      setUploadProgress(100);

      setTimeout(() => {
        setDocumentInfo(data);
        setIsUploading(false);
        setMessages([]);
        setMessages([
          {
            role: "ai",
            content: `I've processed **"${data.filename}"** successfully! It has ${data.pages} pages split into ${data.chunks} searchable chunks. Ask me anything about the document.`,
            time: new Date().toLocaleTimeString(),
          },
        ]);
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message);
      setIsUploading(false);
    }
  };

  // ── Query Handler ────────────────────────────────────────────────────────
  const handleSend = async (questionOverride) => {
    const question = questionOverride || input.trim();
    if (!question || isLoading) return;

    const userMsg = {
      role: "user",
      content: question,
      time: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Query failed");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: data.answer,
          sources: data.sources,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleUpload(file);
  };

  // ── Render Helpers ───────────────────────────────────────────────────────
  const renderMessage = (msg, idx) => (
    <div key={idx} className={`message ${msg.role}`}>
      <div className="message-avatar">
        {msg.role === "ai" ? "🤖" : "👤"}
      </div>
      <div>
        <div className="message-content">
          {msg.content.split("**").map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
          )}
        </div>
        <div className="message-meta">
          <span>{msg.time}</span>
          {msg.sources && (
            <span className="source-badge">{msg.sources} sources</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">📄</div>
            <div>
              <span className="logo-text">DocuMind AI</span>
            </div>
            <span className="logo-badge">RAG Powered</span>
          </div>
          <div className="header-status">
            <div
              className={`status-dot ${backendConnected ? "" : "disconnected"}`}
            />
            <span>{backendConnected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="main-content">
        {/* ── Upload Panel ──────────────────────────────────────────────── */}
        <div className="glass-card upload-panel">
          <div className="card-header">
            <div className="card-header-icon">📁</div>
            <div>
              <h2>Upload Document</h2>
              <p>PDF files supported</p>
            </div>
          </div>

          {/* Upload Zone */}
          <div
            className={`upload-zone ${isDragOver ? "drag-over" : ""} ${isUploading ? "uploading" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">
              {isUploading ? "⏳" : "☁️"}
            </div>
            <div className="upload-text">
              <h3>
                {isUploading
                  ? "Processing document..."
                  : "Drag & drop your PDF here"}
              </h3>
              <p>
                {isUploading
                  ? "Extracting text and creating embeddings"
                  : "or click to browse files"}
              </p>
            </div>
            {!isUploading && (
              <button className="upload-btn" onClick={(e) => e.stopPropagation()}>
                Browse Files
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="file-input"
              onChange={(e) => handleUpload(e.target.files[0])}
            />
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="upload-progress">
              <div className="progress-header">
                <span>Processing...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Document Info */}
          {documentInfo && !isUploading && (
            <div className="document-info">
              <div className="doc-header">
                <span className="doc-icon">✅</span>
                <span className="doc-name">{documentInfo.filename}</span>
              </div>
              <div className="doc-stats">
                <div className="stat-item">
                  <span className="stat-value">{documentInfo.pages}</span>
                  <span className="stat-label">Pages</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{documentInfo.chunks}</span>
                  <span className="stat-label">Chunks</span>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Questions */}
          {documentInfo && !isUploading && (
            <div className="suggested-questions">
              <h3>Try asking</h3>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="suggestion-chip"
                  onClick={() => handleSend(q)}
                >
                  💬 {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Chat Panel ────────────────────────────────────────────────── */}
        <div className="glass-card chat-panel">
          <div className="card-header">
            <div className="card-header-icon">💬</div>
            <div>
              <h2>Chat</h2>
              <p>Ask questions about your document</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="error-toast">
              <span>⚠️</span>
              <span>{error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 && !isLoading ? (
              <div className="empty-state">
                <div className="empty-icon">🧠</div>
                <h3>Ready to assist</h3>
                <p>
                  Upload a PDF document and start asking questions. I'll find
                  answers directly from your document.
                </p>
              </div>
            ) : (
              <>
                {messages.map(renderMessage)}
                {isLoading && (
                  <div className="typing-indicator">
                    <div className="message-avatar">🤖</div>
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-wrapper">
            <div className="chat-input-container">
              <textarea
                ref={textareaRef}
                className="chat-input"
                placeholder={
                  documentInfo
                    ? "Ask a question about your document..."
                    : "Upload a document first to start chatting..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!documentInfo || isLoading}
                rows={1}
              />
              <button
                className="send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading || !documentInfo}
                title="Send message"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
