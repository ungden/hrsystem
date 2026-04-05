"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Terminal } from 'lucide-react';
import { ChatMessage, AgentCoordinationState } from '@/lib/agent-types';
import { agentProfiles } from '@/lib/agents/agent-profiles';
import { processUserChat } from '@/lib/agents/chat-engine';
import AgentAvatar from './AgentAvatar';

interface AgentChatPanelProps {
  state: AgentCoordinationState;
  onStateUpdate: (state: AgentCoordinationState) => void;
}

export default function AgentChatPanel({ state, onStateUpdate }: AgentChatPanelProps) {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [state.chatHistory]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = () => {
    if (!input.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      senderName: 'Bạn',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setHistory(prev => [input.trim(), ...prev].slice(0, 50));
    setHistoryIdx(-1);

    const newHistory = [...state.chatHistory, userMsg];
    onStateUpdate({ ...state, chatHistory: newHistory });
    setInput('');
    setIsThinking(true);

    setTimeout(() => {
      const responses = processUserChat(input.trim(), state);
      const updatedHistory = [...newHistory, ...responses];
      onStateUpdate({ ...state, chatHistory: updatedHistory });
      setIsThinking(false);
    }, 300 + Math.random() * 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Arrow up/down for command history
    if (e.key === 'ArrowUp' && history.length > 0) {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(newIdx);
      setInput(history[newIdx]);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx <= 0) { setHistoryIdx(-1); setInput(''); }
      else { const newIdx = historyIdx - 1; setHistoryIdx(newIdx); setInput(history[newIdx]); }
    }
  };

  const quickCommands = [
    { label: '/overview', desc: 'Tổng quan' },
    { label: '/targets', desc: 'Mục tiêu' },
    { label: '/health', desc: 'Tài chính' },
    { label: '/risk', desc: 'Rủi ro' },
    { label: '/top', desc: 'Top NV' },
    { label: '/bonus', desc: 'Thưởng' },
    { label: '/help', desc: 'Trợ giúp' },
  ];

  return (
    <div className="flex flex-col h-[700px] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border-b border-slate-700">
        <Terminal size={14} className="text-emerald-400" />
        <span className="text-xs font-mono text-emerald-400">AI Agents Terminal</span>
        <span className="text-[10px] text-slate-500 ml-auto">Gõ /help để xem lệnh</span>
      </div>

      {/* Quick command bar */}
      <div className="flex gap-1 px-3 py-2 bg-slate-800/50 border-b border-slate-700/50 overflow-x-auto">
        {quickCommands.map(cmd => (
          <button
            key={cmd.label}
            onClick={() => { setInput(cmd.label); inputRef.current?.focus(); }}
            className="text-[10px] font-mono bg-slate-700/50 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors flex-shrink-0"
          >
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[13px]">
        {state.chatHistory.length === 0 && (
          <div className="text-center py-8">
            <div className="text-emerald-400 text-sm mb-2">Welcome to AI Agents Terminal</div>
            <div className="text-slate-500 text-xs space-y-1">
              <p>Gõ lệnh hoặc câu hỏi tự nhiên bằng tiếng Việt</p>
              <p>VD: /overview, /dept CNTT, /emp Hoang Thai Son, /salary Bui Van Duong</p>
              <p className="text-slate-600 mt-3">Gõ <span className="text-emerald-400">/help</span> để xem đầy đủ lệnh</p>
            </div>
          </div>
        )}

        {state.chatHistory.map(msg => (
          <div key={msg.id}>
            {msg.sender === 'user' ? (
              <div className="flex items-start gap-2">
                <span className="text-blue-400 flex-shrink-0">$</span>
                <span className="text-slate-200">{msg.content}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 mt-1">
                <AgentAvatar role={msg.sender} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-slate-500">{agentProfiles[msg.sender]?.name || msg.senderName}</span>
                  <pre className="text-emerald-300/90 whitespace-pre-wrap text-[12px] leading-relaxed mt-0.5 overflow-x-auto">{msg.content}</pre>
                </div>
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 text-slate-500">
            <span className="animate-pulse">_</span>
            <span className="text-[11px]">Processing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 p-3 bg-slate-800">
        <div className="flex gap-2 items-center">
          <span className="text-emerald-400 font-mono text-sm">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Gõ lệnh hoặc câu hỏi... (↑↓ xem history)"
            className="flex-1 bg-transparent border-none text-slate-200 font-mono text-sm placeholder:text-slate-600 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded px-2.5 py-1.5 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
