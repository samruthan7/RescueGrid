import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Shield,
  Loader2,
  PhoneCall,
  Bot,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { useCitizenAuth } from '../context/CitizenAuthContext';
import api from '../services/api';

// ─── Shared Chat UI ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-gold" />
      </div>
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function ChatMessages({ messages, isLoading, messagesEndRef }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      {messages.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6 text-gold" />
          </div>
          <p className="text-xs text-zinc-400">Ask me anything about your emergency report or for first-aid guidance.</p>
        </div>
      )}

      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
        >
          {msg.role === 'assistant' && (
            <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0 mb-1">
              <Bot className="w-3.5 h-3.5 text-gold" />
            </div>
          )}
          <div
            className={`max-w-[80%] text-sm leading-relaxed px-4 py-2.5 rounded-2xl ${
              msg.role === 'user'
                ? 'bg-gold text-black rounded-br-sm font-medium'
                : 'bg-[#1a1a1a] border border-zinc-800 text-zinc-100 rounded-bl-sm'
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}

      {isLoading && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}

function QuickChips({ chips, onSelect, visible }) {
  if (!visible) return null;
  return (
    <div className="px-4 pb-2 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          className="border border-gold/40 text-gold text-xs px-3 py-1.5 rounded-full hover:bg-gold/10 transition-colors"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

// ─── Citizen Floating Chat Widget ────────────────────────────────────────────

const CITIZEN_QUICK_CHIPS = [
  'What should I do now?',
  'Status of my report',
  'First-aid tips',
  'Call for help safely'
];

export default function AssistantChat() {
  const { citizen, isAuthenticated } = useCitizenAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMsg, setHasNewMsg] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Show chips when empty or last message is from AI
  const showChips = messages.length === 0 || messages[messages.length - 1]?.role === 'assistant';

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
      setHasNewMsg(false);
    }
  }, [isOpen, messages]);

  // Don't render if not authenticated
  if (!isAuthenticated || !citizen) return null;

  const sendMessage = async (text) => {
    const trimmed = (text || inputText).trim();
    if (!trimmed || isLoading) return;

    const userMsg = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMsg].slice(-20);
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await api.post('/citizen/assistant/chat', {
        message: trimmed,
        history: updatedMessages.slice(0, -1)
      });
      const reply = res.data?.reply || res.data?.message || 'I received your message.';
      const aiMsg = { role: 'assistant', content: reply };
      setMessages(prev => [...prev, aiMsg].slice(-20));
      if (!isOpen) setHasNewMsg(true);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. For emergencies, please call 112 immediately."
      };
      setMessages(prev => [...prev, errorMsg].slice(-20));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Open Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] h-[520px] bg-[#111111] border border-gold/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-[#0d0d0d] border-b border-gold/20 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center">
                <Shield className="w-4 h-4 text-gold" />
              </div>
              <div>
                <p className="text-sm font-bold text-gold leading-tight">RescueGrid AI</p>
                <p className="text-[11px] text-zinc-500">Emergency Assistant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 112 Persistent Banner */}
          <div className="bg-severity-critical/15 border-b border-severity-critical/30 px-4 py-2 flex items-center gap-2 shrink-0">
            <PhoneCall className="w-3.5 h-3.5 text-severity-critical shrink-0" />
            <p className="text-[11px] text-severity-critical font-semibold">
              🚨 Life-threatening emergency? Call <strong>112</strong> immediately.
            </p>
          </div>

          {/* Messages */}
          <ChatMessages messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} />

          {/* Quick Chips */}
          <QuickChips chips={CITIZEN_QUICK_CHIPS} onSelect={sendMessage} visible={showChips && !isLoading} />

          {/* Input */}
          <div className="border-t border-zinc-800 px-3 py-3 flex gap-2 shrink-0 bg-[#0d0d0d]">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your report or first aid..."
              className="flex-1 bg-[#1a1a1a] border border-zinc-700 focus:border-gold rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!inputText.trim() || isLoading}
              className="p-2 rounded-xl bg-gold text-black hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen
            ? 'bg-zinc-800 text-white shadow-zinc-900/50 hover:bg-zinc-700'
            : 'bg-gold text-black shadow-gold/30 hover:bg-yellow-400 shadow-[0_0_20px_rgba(212,175,55,0.5)]'
        }`}
        title={isOpen ? 'Close Assistant' : 'Open AI Assistant'}
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6" />
        ) : (
          <Shield className="w-6 h-6" />
        )}
        {hasNewMsg && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-severity-critical border-2 border-black animate-ping" />
        )}
      </button>
    </>
  );
}

// ─── Authority Ops Assistant Panel ───────────────────────────────────────────

const OPS_QUICK_CHIPS = [
  'Summarize current situation',
  'Which area needs attention first?',
  'Hotspots escalating?',
  'Last hour summary'
];

export function OpsAssistantPanel() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const showChips = messages.length === 0 || messages[messages.length - 1]?.role === 'assistant';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const trimmed = (text || inputText).trim();
    if (!trimmed || isLoading) return;

    const userMsg = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMsg].slice(-20);
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await api.post('/admin/assistant/chat', {
        message: trimmed,
        history: updatedMessages.slice(0, -1)
      });
      const reply = res.data?.reply || res.data?.message || 'Response received.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }].slice(-20));
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Unable to reach operations assistant. Please try again.' }
      ].slice(-20));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111111] rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 bg-[#0d0d0d] shrink-0">
        <Bot className="w-4 h-4 text-gold" />
        <div>
          <p className="text-sm font-bold text-gold leading-tight">Ops Intelligence Assistant</p>
          <p className="text-[11px] text-zinc-500">Ask about incidents, hotspots, situation reports</p>
        </div>
      </div>

      {/* Warning note */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 shrink-0">
        <p className="text-[11px] text-amber-400">
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          AI analysis is advisory. Always verify critical decisions with ground truth data.
        </p>
      </div>

      {/* Messages */}
      <ChatMessages messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} />

      {/* Quick Chips */}
      <QuickChips chips={OPS_QUICK_CHIPS} onSelect={sendMessage} visible={showChips && !isLoading} />

      {/* Input */}
      <div className="border-t border-zinc-800 px-3 py-3 flex gap-2 shrink-0 bg-[#0d0d0d]">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about situation, hotspots, priorities..."
          className="flex-1 bg-[#1a1a1a] border border-zinc-700 focus:border-gold rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={() => sendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="p-2 rounded-xl bg-gold text-black hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
