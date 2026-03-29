'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Trash2, MessageSquare, Bot, User } from 'lucide-react';
import { marked } from 'marked';

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  agent: string;
  created_at: string;
}

const AGENTS = ['Jack', 'Planner', 'Coder', 'Reviewer'];

const AGENT_COLORS: Record<string, string> = {
  Jack: 'text-cyan-400',
  Planner: 'text-purple-400',
  Coder: 'text-green-400',
  Reviewer: 'text-yellow-400',
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageContent({ role, content }: { role: string; content: string }) {
  if (role === 'assistant') {
    const html = marked.parse(content) as string;
    return (
      <div
        className="prose prose-invert prose-sm max-w-none text-slate-200 text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_code]:bg-slate-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-cyan-300 [&_pre]:bg-slate-800 [&_pre]:rounded-lg [&_pre]:p-3"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">{content}</p>;
}

function TypingIndicator({ agent }: { agent: string }) {
  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
        <Bot size={14} />
      </div>
      {/* Bubble */}
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-2 mb-1 text-xs">
          <span className={`font-medium ${AGENT_COLORS[agent] || 'text-cyan-400'}`}>{agent}</span>
          <span className="text-slate-600 italic">thinking...</span>
        </div>
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-800 border border-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [agent, setAgent] = useState('Jack');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [agentThinking, setAgentThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noNewMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageCountRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (noNewMsgTimerRef.current) {
      clearTimeout(noNewMsgTimerRef.current);
      noNewMsgTimerRef.current = null;
    }
    setAgentThinking(false);
  }, []);

  const fetchMessages = useCallback(async (isPolling = false) => {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json() as ChatMessage[];
        const msgs = Array.isArray(data) ? data : [];
        setMessages(msgs);

        if (isPolling) {
          const prevCount = lastMessageCountRef.current;
          const newCount = msgs.length;
          if (newCount > prevCount) {
            // New messages arrived — reset the no-new-msg timer
            lastMessageCountRef.current = newCount;
            if (noNewMsgTimerRef.current) clearTimeout(noNewMsgTimerRef.current);
            // Stop polling after 10s of no new messages
            noNewMsgTimerRef.current = setTimeout(() => {
              stopPolling();
            }, 10000);
          }
        } else {
          lastMessageCountRef.current = msgs.length;
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [stopPolling]);

  const startPolling = useCallback((currentCount: number) => {
    lastMessageCountRef.current = currentCount;
    setAgentThinking(true);

    // Clear any existing polling
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (noNewMsgTimerRef.current) clearTimeout(noNewMsgTimerRef.current);

    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchMessages(true);
    }, 3000);

    // Stop after 60s max (agent timeout)
    noNewMsgTimerRef.current = setTimeout(() => {
      stopPolling();
    }, 60000);
  }, [fetchMessages, stopPolling]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentThinking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, agent }),
      });
      if (res.ok) {
        const data = await res.json() as { userMessage: ChatMessage };
        setMessages((prev) => {
          const updated = [...prev, data.userMessage];
          // Start polling for agent response
          startPolling(updated.length);
          return updated;
        });
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/chat/${id}`, { method: 'DELETE' });
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function clearAll() {
    if (!confirm('Clear all chat history?')) return;
    stopPolling();
    for (const msg of messages) {
      await fetch(`/api/chat/${msg.id}`, { method: 'DELETE' });
    }
    setMessages([]);
    lastMessageCountRef.current = 0;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-cyan-400" size={22} />
            Agent Chat
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Send messages to your AI agents</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Agent selector */}
          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
          >
            {AGENTS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {messages.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-900/20 border border-transparent hover:border-red-800/50 text-sm transition-all"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Loading messages...
          </div>
        ) : messages.length === 0 && !agentThinking ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-cyan-400 opacity-60" />
            </div>
            <p className="text-slate-400 text-base font-medium">No messages yet</p>
            <p className="text-slate-600 text-sm mt-1">Send a message to start chatting with an agent</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 group ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
                }`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Name + time */}
                  <div className={`flex items-center gap-2 mb-1 text-xs ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <span className={`font-medium ${msg.role === 'assistant' ? (AGENT_COLORS[msg.agent] || 'text-cyan-400') : 'text-slate-400'}`}>
                      {msg.role === 'user' ? 'You' : msg.agent}
                    </span>
                    <span className="text-slate-600">{formatTime(msg.created_at)}</span>
                  </div>
                  {/* Content */}
                  <div className={`relative px-4 py-3 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-cyan-600/20 border border-cyan-600/30 text-slate-100 rounded-tr-sm'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
                  }`}>
                    <MessageContent role={msg.role} content={msg.content} />
                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400"
                      aria-label="Delete message"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {agentThinking && <TypingIndicator agent={agent} />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 py-4 border-t border-slate-800 bg-slate-950">
        <div className="flex items-end gap-3">
          <div className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl focus-within:border-cyan-500/60 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${agent}... (Enter to send, Shift+Enter for newline)`}
              rows={1}
              className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none resize-none max-h-32"
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-11 h-11 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="text-xs text-slate-600 mt-2 px-1">
          Talking to <span className={AGENT_COLORS[agent] || 'text-cyan-400'}>{agent}</span> · Connected to OpenClaw
        </div>
      </div>
    </div>
  );
}
