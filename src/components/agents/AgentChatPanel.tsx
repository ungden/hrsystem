"use client";

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.chatHistory]);

  const handleSend = () => {
    if (!input.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      senderName: 'Bạn',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...state.chatHistory, userMsg];
    onStateUpdate({ ...state, chatHistory: newHistory });
    setInput('');
    setIsThinking(true);

    // Simulate thinking delay
    setTimeout(() => {
      const responses = processUserChat(input.trim(), state);
      const updatedHistory = [...newHistory, ...responses];
      onStateUpdate({ ...state, chatHistory: updatedHistory });
      setIsThinking(false);
    }, 600 + Math.random() * 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    'Phân tích doanh thu Q2/2026',
    'Chi phí phòng CNTT',
    'Nhân viên nào đang rủi ro?',
    'Lương thưởng dự kiến',
    'Tình hình Phòng Kinh doanh',
  ];

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {state.chatHistory.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-4">Hỏi bất kỳ câu hỏi nào về mục tiêu, chi phí, nhân sự...</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-3 py-1.5 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {state.chatHistory.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender !== 'user' && (
              <AgentAvatar role={msg.sender} size="sm" />
            )}
            <div className={`max-w-[75%] rounded-xl px-3 py-2 ${
              msg.sender === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {msg.sender !== 'user' && (
                <p className="text-[10px] font-semibold text-slate-500 mb-0.5">
                  {agentProfiles[msg.sender]?.name || msg.senderName}
                </p>
              )}
              <p className="text-[13px] leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
            <div className="bg-slate-100 rounded-xl px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi AI Agents về mục tiêu, chi phí, nhân sự..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg px-3 py-2 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
