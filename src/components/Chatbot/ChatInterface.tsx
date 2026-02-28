"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './types';
import MarkdownRenderer from './MarkdownRenderer';
import { Bot, RefreshCcw, Info, BarChart3, Users, Search as SearchIcon, Swords, Share2, TrendingUp } from 'lucide-react';
import ExplainerModal from './ExplainerModal';

interface ChatInterfaceProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    isTyping: boolean;
    onReset: () => void;
    capabilities?: { id: string; label: string; icon?: React.ReactNode }[];
    onSelectCapability?: (id: string) => void;
    isCentered?: boolean;
    followUpChips?: string[];
}

const LOADING_QUOTES = [
    "A 1% drop in food costs has 3× the profit impact of a 1% increase in sales.",
    "The top 20% of menu items typically drive 70% of a restaurant's revenue.",
    "Food-away-from-home inflation has outpaced grocery prices for 18 consecutive months.",
    "Egg prices rose over 60% in two years — mapped live to your menu items.",
    "Local search results drive 72% of restaurant discoveries on mobile devices.",
    "The average US restaurant operates on just 3–5% net profit margins.",
    "Menu engineering — the science of strategic item placement — dates back to 1982.",
    "Online ordering boosts average check size by 20–30% vs. in-person orders.",
    "Restaurants that price-optimize typically see 10–15% margin improvement.",
    "NWS weather data correlates foot traffic drops of up to 40% on heavy precipitation days.",
    "Cross-referencing BLS CPI and FRED unemployment data to gauge pricing power...",
    "73% of diners check a restaurant's online presence before their first visit.",
    "The FRED API tracks unemployment across 400+ metro areas in real time.",
    "Proximity to event venues can boost weeknight foot traffic by up to 25%.",
    "Competitor benchmarking against live market data — not last year's averages.",
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({
    messages,
    onSendMessage,
    isTyping,
    onReset,
    capabilities = [],
    onSelectCapability,
    isCentered = false,
    followUpChips = [],
}) => {
    const [input, setInput] = useState('');
    const [isExplainerOpen, setIsExplainerOpen] = useState(false);
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [quoteVisible, setQuoteVisible] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, capabilities]);

    // Cycle quotes while loading
    useEffect(() => {
        if (!isTyping) {
            setQuoteIndex(0);
            setQuoteVisible(true);
            return;
        }
        const interval = setInterval(() => {
            setQuoteVisible(false);
            setTimeout(() => {
                setQuoteIndex(i => (i + 1) % LOADING_QUOTES.length);
                setQuoteVisible(true);
            }, 300);
        }, 3800);
        return () => clearInterval(interval);
    }, [isTyping]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <div className={`flex flex-col h-full relative z-30 transition-all duration-700 w-full ${!isCentered ? 'bg-white border-l border-gray-200 shadow-xl' : 'bg-transparent justify-center items-center'}`}>
            {/* Header - Hidden when centered */}
            {!isCentered && (
                <div className="p-4 border-b border-gray-100 bg-white/95 backdrop-blur-md flex justify-between items-center z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onReset}
                            className="p-1.5 -ml-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                            title="Start Over"
                        >
                            <RefreshCcw className="w-5 h-5" />
                        </button>

                        <div className="w-8 h-8 rounded-xl bg-indigo-600 shadow-sm flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-none">Hephae<span className="text-indigo-600">Hub</span></h1>
                            <p className="text-[9px] text-gray-500 font-bold tracking-wider uppercase mt-0.5">Agentic Orchestrator</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className={`overflow-y-auto p-4 space-y-6 flex flex-col w-full ${isCentered ? 'items-center max-w-3xl flex-none' : 'flex-grow bg-slate-50/50'}`}>
                <div className={`w-full ${isCentered ? 'space-y-8' : 'space-y-6'}`}>
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`
              max-w-[90%] p-3.5 rounded-2xl shadow-sm
              ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white text-gray-900 border border-gray-100 rounded-bl-none shadow-sm'}
              ${isCentered && msg.role === 'model' && msg.id === '1' ? 'text-2xl font-light text-center p-6 bg-transparent border-none shadow-none text-gray-800' : ''}
            `}>
                                {msg.role === 'model' ? (
                                    <MarkdownRenderer content={msg.text} />
                                ) : (
                                    <div className="text-sm">{msg.text}</div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Home Screen Capabilities UI */}
                    {isCentered && messages.length === 1 && (
                        <div className="w-full mt-12 mb-8 animate-fade-in-up">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Agentic Capabilities</h2>
                                <p className="text-gray-500 font-medium text-sm">Search for any restaurant or local business to unlock these deep-intelligence tools.</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <button onClick={() => onSendMessage("Analyze menu for profit leaks")} className="bg-white/80 hover:bg-white border border-gray-100 p-5 rounded-3xl shadow-xl shadow-indigo-500/5 backdrop-blur-xl transition-all hover:-translate-y-1 text-left group">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <BarChart3 className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-1">Margin Analysis</h3>
                                    <p className="text-xs text-gray-500 leading-snug">Uncover profit leaks against live competitor pricing.</p>
                                </button>

                                <button onClick={() => onSendMessage("Analyze foot traffic for my location")} className="bg-white/80 hover:bg-white border border-gray-100 p-5 rounded-3xl shadow-xl shadow-emerald-500/5 backdrop-blur-xl transition-all hover:-translate-y-1 text-left group">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-1">Traffic Forecast</h3>
                                    <p className="text-xs text-gray-500 leading-snug">Predict demand using weather, events & local POI data.</p>
                                </button>

                                <button onClick={() => onSendMessage("Run SEO Audit")} className="bg-white/80 hover:bg-white border border-gray-100 p-5 rounded-3xl shadow-xl shadow-purple-500/5 backdrop-blur-xl transition-all hover:-translate-y-1 text-left group">
                                    <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <SearchIcon className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-1">SEO Deep Audit</h3>
                                    <p className="text-xs text-gray-500 leading-snug">Core Web Vitals, indexing health & content analysis.</p>
                                </button>

                                <button onClick={() => onSendMessage("Run Competitive Analysis")} className="bg-white/80 hover:bg-white border border-gray-100 p-5 rounded-3xl shadow-xl shadow-orange-500/5 backdrop-blur-xl transition-all hover:-translate-y-1 text-left group">
                                    <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Swords className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-1">Competitive Intel</h3>
                                    <p className="text-xs text-gray-500 leading-snug">Map rivals, threat levels & market gaps in real time.</p>
                                </button>

                                <button onClick={() => onSendMessage("Generate social media strategy and marketing content")} className="bg-white/80 hover:bg-white border border-gray-100 p-5 rounded-3xl shadow-xl shadow-pink-500/5 backdrop-blur-xl transition-all hover:-translate-y-1 text-left group">
                                    <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Share2 className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-1">Social Media Strategy</h3>
                                    <p className="text-xs text-gray-500 leading-snug">Auto-generate posts, captions & content campaigns.</p>
                                </button>

                                <button onClick={() => onSendMessage("Show me local market economic insights")} className="bg-white/80 hover:bg-white border border-gray-100 p-5 rounded-3xl shadow-xl shadow-teal-500/5 backdrop-blur-xl transition-all hover:-translate-y-1 text-left group">
                                    <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-1">Market Insights</h3>
                                    <p className="text-xs text-gray-500 leading-snug">Live CPI, unemployment & commodity inflation trends.</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Capability Buttons */}
                    {capabilities.length > 0 && !isTyping && (
                        <div className="flex justify-start animate-fade-in-up mt-4">
                            <div className="flex flex-col gap-2 max-w-[90%] w-full">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Suggested Actions</p>
                                    <button
                                        onClick={() => setIsExplainerOpen(true)}
                                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors"
                                    >
                                        <Info className="w-3 h-3" />
                                        How this works
                                    </button>
                                </div>
                                {capabilities.map(cap => (
                                    <button
                                        key={cap.id}
                                        onClick={() => onSelectCapability && onSelectCapability(cap.id)}
                                        className="flex items-center gap-2 px-4 py-3 bg-white border border-indigo-200 shadow-sm rounded-xl text-indigo-700 hover:bg-indigo-50 transition-colors text-sm font-semibold text-left"
                                    >
                                        {cap.icon}
                                        {cap.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Loading indicator with rotating quotes */}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-bl-none shadow-sm max-w-[85%]">
                                <div className="flex items-center gap-1.5 mb-2.5">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                                </div>
                                <p
                                    className="text-[11px] text-gray-400 italic leading-relaxed transition-opacity duration-300"
                                    style={{ opacity: quoteVisible ? 1 : 0 }}
                                >
                                    {LOADING_QUOTES[quoteIndex]}
                                </p>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className={`p-4 bg-white border-t border-gray-100 flex flex-col ${isCentered ? 'items-center mb-10 bg-transparent border-none w-full' : 'shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] w-full'}`}>
                <div className={`w-full ${isCentered ? 'max-w-3xl' : ''}`}>
                    {followUpChips.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {followUpChips.map(chip => (
                                <button
                                    key={chip}
                                    onClick={() => onSendMessage(chip)}
                                    disabled={isTyping || capabilities.length > 0}
                                    className={`text-xs font-medium px-4 py-2 rounded-full whitespace-nowrap transition-colors disabled:opacity-50
                                    bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm`}
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={`relative shadow-xl rounded-2xl`}>
                        <input
                            type="text"
                            className={`w-full pl-6 pr-14 ${isCentered ? 'py-5 text-lg' : 'py-3 text-sm'} rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-indigo-100 focus:border-indigo-500 focus:ring-4 transition-all outline-none`}
                            placeholder="Message Hephae Hub..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isTyping || capabilities.length > 0}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping || capabilities.length > 0}
                            className={`absolute right-2 ${isCentered ? 'top-3 p-2.5' : 'top-1.5 p-1.5'} bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm`}
                        >
                            <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                        </button>
                    </form>
                </div>
            </div>

            <ExplainerModal isOpen={isExplainerOpen} onClose={() => setIsExplainerOpen(false)} />
        </div>
    );
};

export default ChatInterface;
