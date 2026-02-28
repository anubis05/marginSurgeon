"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './types';
import MarkdownRenderer from './MarkdownRenderer';
import { Bot, RefreshCcw, Info, BarChart3, Users, Search as SearchIcon, Swords, Share2, TrendingUp, Sparkles } from 'lucide-react';
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
        <div className={`flex flex-col h-full relative z-30 transition-all duration-700 w-full ${!isCentered ? 'bg-white border-l border-gray-200 shadow-2xl' : 'bg-transparent justify-center items-center'}`}>

            {/* Header - Hidden when centered */}
            {!isCentered && (
                <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 flex justify-between items-center z-10 shadow-lg flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onReset}
                            className="p-1.5 -ml-1 text-white/50 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                            title="Start Over"
                        >
                            <RefreshCcw className="w-4 h-4" />
                        </button>
                        <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur shadow-sm flex items-center justify-center border border-white/20">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white tracking-tight leading-none">Hephae<span className="text-white/70">Hub</span></h1>
                            <p className="text-[9px] text-white/50 font-semibold tracking-wider uppercase mt-0.5">AI Business Analyst</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse"></div>
                        <span className="text-[10px] text-white/50 font-medium">Live</span>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className={`overflow-y-auto p-4 flex flex-col w-full ${isCentered ? 'items-center max-w-3xl flex-none space-y-6' : 'flex-grow bg-gradient-to-b from-slate-50/80 to-white space-y-5'}`}>
                <div className={`w-full ${isCentered ? 'space-y-8' : 'space-y-5'}`}>
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-2'}`}>

                            {/* Bot avatar for AI messages */}
                            {msg.role === 'model' && !isCentered && (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0 mb-0.5 border border-indigo-200/60 shadow-sm">
                                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                                </div>
                            )}

                            <div className={`
                                p-3.5 rounded-2xl
                                ${msg.role === 'user'
                                    ? 'max-w-[82%] bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-sm shadow-md shadow-indigo-200/50'
                                    : 'max-w-[88%] bg-white text-gray-800 border border-gray-100/80 rounded-bl-sm shadow-md shadow-gray-100/80'}
                                ${isCentered && msg.role === 'model' && msg.id === '1' ? 'text-2xl font-light text-center p-6 bg-transparent border-none shadow-none text-gray-800 max-w-full' : ''}
                            `}>
                                {msg.role === 'model' ? (
                                    <MarkdownRenderer content={msg.text} />
                                ) : (
                                    <div className="text-sm leading-relaxed">{msg.text}</div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Home Screen Capabilities UI */}
                    {isCentered && messages.length === 1 && (
                        <div className="w-full mt-12 mb-8 animate-fade-in-up">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight mb-1">Agentic Capabilities</h2>
                                <p className="text-gray-400 text-xs">Search for a business to unlock these tools.</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                                {([
                                    { msg: "Analyze menu for profit leaks", icon: <BarChart3 className="w-3.5 h-3.5" />, label: "Margin Analysis", cls: "bg-indigo-50 text-indigo-600" },
                                    { msg: "Analyze foot traffic for my location", icon: <Users className="w-3.5 h-3.5" />, label: "Traffic Forecast", cls: "bg-emerald-50 text-emerald-600" },
                                    { msg: "Run SEO Audit", icon: <SearchIcon className="w-3.5 h-3.5" />, label: "SEO Deep Audit", cls: "bg-purple-50 text-purple-600" },
                                    { msg: "Run Competitive Analysis", icon: <Swords className="w-3.5 h-3.5" />, label: "Competitive Intel", cls: "bg-orange-50 text-orange-600" },
                                    { msg: "Generate social media strategy and marketing content", icon: <Share2 className="w-3.5 h-3.5" />, label: "Social Media", cls: "bg-pink-50 text-pink-600" },
                                    { msg: "Show me local market economic insights", icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Market Insights", cls: "bg-teal-50 text-teal-600" },
                                ] as const).map(({ msg, icon, label, cls }) => (
                                    <button key={label} onClick={() => onSendMessage(msg)}
                                        className="bg-white/80 hover:bg-white border border-gray-100 px-3 py-2.5 rounded-xl shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-md flex items-center gap-2.5 text-left group">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform ${cls}`}>
                                            {icon}
                                        </div>
                                        <span className="text-xs font-semibold text-gray-800 leading-tight">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Capability Buttons */}
                    {capabilities.length > 0 && !isTyping && (
                        <div className="flex justify-start animate-fade-in-up mt-2 pl-9">
                            <div className="flex flex-col gap-2 w-full">
                                <div className="flex items-center justify-between px-1 mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3 text-indigo-500" />
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">What to explore next</p>
                                    </div>
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
                                        className="flex items-center gap-3 px-4 py-3.5 bg-white border border-indigo-100 shadow-sm shadow-indigo-50 rounded-2xl text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-100/50 transition-all text-sm font-semibold text-left"
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
                        <div className="flex justify-start items-end gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0 mb-0.5 border border-indigo-200/60 shadow-sm">
                                <Bot className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                            <div className="bg-white border border-gray-100/80 px-4 py-3.5 rounded-2xl rounded-bl-sm shadow-md shadow-gray-100/80 max-w-[82%]">
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
            <div className={`flex flex-col flex-shrink-0 ${isCentered ? 'p-4 items-center mb-10 bg-transparent border-none w-full' : 'px-4 pt-3 pb-4 bg-white border-t border-gray-100 shadow-[0_-8px_30px_-8px_rgba(99,102,241,0.08)]'}`}>
                <div className={`w-full ${isCentered ? 'max-w-3xl' : ''}`}>
                    {followUpChips.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {followUpChips.map(chip => (
                                <button
                                    key={chip}
                                    onClick={() => onSendMessage(chip)}
                                    disabled={isTyping || capabilities.length > 0}
                                    className="text-xs font-medium px-4 py-1.5 rounded-full whitespace-nowrap transition-all disabled:opacity-50 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 shadow-sm"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="relative">
                        <input
                            type="text"
                            className={`w-full pl-5 pr-14 ${isCentered ? 'py-5 text-lg' : 'py-3.5 text-sm'} rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all outline-none shadow-lg shadow-gray-100/80`}
                            placeholder="Ask anything about this business..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isTyping || capabilities.length > 0}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping || capabilities.length > 0}
                            className={`absolute right-2 ${isCentered ? 'top-3 p-2.5' : 'top-2 p-2'} bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl hover:from-indigo-400 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200/50 hover:shadow-indigo-200`}
                        >
                            <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                        </button>
                    </form>
                </div>
            </div>

            <ExplainerModal isOpen={isExplainerOpen} onClose={() => setIsExplainerOpen(false)} />
        </div>
    );
};

export default ChatInterface;
