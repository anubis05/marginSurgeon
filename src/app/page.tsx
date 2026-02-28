'use client';

import { useState, useEffect } from 'react';
import { Search as SearchIcon, MapPin, Building2, Store, Loader2, ArrowRight, Activity, Percent, DollarSign, TrendingUp, AlertTriangle, Scale, Target, Swords, BrainCircuit, X, Download, BarChart3, Users, Search } from 'lucide-react';
import { SurgicalReport } from '@/lib/types';
import clsx from 'clsx';
import ChatInterface from '@/components/Chatbot/ChatInterface';
import { DailyForecast, TimeSlot } from '@/components/Chatbot/types';
import DetailPanel from '@/components/Chatbot/DetailPanel';
import MapVisualizer from '@/components/Chatbot/MapVisualizer';
import HeatmapGrid from '@/components/Chatbot/HeatmapGrid';
import { ChatMessage, ForecastResponse } from '@/components/Chatbot/types';
import { BaseIdentity, EnrichedProfile } from '@/agents/types';
import { NeuralBackground } from '@/components/Chatbot/NeuralBackground';
import { EmailWall } from '@/components/Chatbot/EmailWall';
import ResultsDashboard from '@/components/Chatbot/seo/ResultsDashboard';
import ProfileCard from '@/components/Chatbot/ProfileCard';
import { SeoReport, SocialStrategyReport } from '@/lib/types';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hi! I am Hephae.\nType the name of a business you want to analyze or just ask me anything.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // App States
  const [locatedBusiness, setLocatedBusiness] = useState<BaseIdentity | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [capabilities, setCapabilities] = useState<{ id: string, label: string, icon?: React.ReactNode }[]>([]);

  const [report, setReport] = useState<SurgicalReport | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [seoReport, setSeoReport] = useState<SeoReport | null>(null);
  const [competitiveReport, setCompetitiveReport] = useState<any | null>(null);
  const [socialReport, setSocialReport] = useState<SocialStrategyReport | null>(null);

  // Detail Panel State for Traffic Forecast Phase 14
  const [selectedDay, setSelectedDay] = useState<DailyForecast | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Email Lead Capture States
  const [searchDocId, setSearchDocId] = useState<string | null>(null);
  const [showEmailWall, setShowEmailWall] = useState(false);
  const [hasProvidedEmail, setHasProvidedEmail] = useState(false);
  const [pendingCapability, setPendingCapability] = useState<string | null>(null);

  // Feature Flags
  const [isAdvancedMcpEnabled, setIsAdvancedMcpEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hephae_has_provided_email');
      if (stored === 'true') {
        setHasProvidedEmail(true);
      }
    }
  }, []);

  const handleEmailSubmit = async (email: string) => {
    if (!searchDocId) return;
    const res = await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: searchDocId, email })
    });
    if (res.ok) {
      setShowEmailWall(false);
      setHasProvidedEmail(true);
      localStorage.setItem('hephae_has_provided_email', 'true');

      // Resume the capability execution if one was pending
      if (pendingCapability) {
        const capToRun = pendingCapability;
        setPendingCapability(null);
        executeCapability(capToRun);
      }
    } else {
      throw new Error("Failed to save email");
    }
  };

  const sendMessage = async (text: string) => {
    // 1. Append user message
    const newMessages: ChatMessage[] = [...messages, { id: Date.now().toString(), role: 'user', text }];
    setMessages(newMessages);
    setIsTyping(true);
    setCapabilities([]); // Clear capabilities when a new message is sent

    // Lead Capture Interception: Always silently track the first query
    if (!hasProvidedEmail && !searchDocId) {
      try {
        const trackRes = await fetch('/api/track', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text })
        });
        if (trackRes.ok) {
          const trackData = await trackRes.json();
          setSearchDocId(trackData.id);
        }
      } catch (e) { console.error("Tracking failed", e); }
    } else if (hasProvidedEmail) {
      // Just log subsequent queries silently in the background
      fetch('/api/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text })
      }).catch(() => { }); // fire and forget
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: data.text }]);

      // Trigger Orchestrator State Change
      if (data.triggerCapabilityHandoff && data.locatedBusiness) {
        setLocatedBusiness(data.locatedBusiness);
        setReport(null);
        setForecast(null);
        setSeoReport(null);
        setCompetitiveReport(null);
        setSocialReport(null);
        setCapabilities([]); // Clear capabilities initially

        // Spawn Background Discovery
        triggerDiscoveryOrchestrator(data.locatedBusiness);
      }

    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I encountered an error connecting to my core logic layer." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const triggerDiscoveryOrchestrator = async (identity: BaseIdentity) => {
    setIsDiscovering(true);
    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity })
      });
      if (res.ok) {
        const enrichedProfile = await res.json();
        setLocatedBusiness(enrichedProfile); // Update to enriched profile
        setCapabilities([
          { id: 'surgery', label: 'Analyze Menu Margins' },
          { id: 'traffic', label: 'Forecast Foot Traffic' },
          { id: 'seo', label: 'Run SEO Deep Audit' },
          { id: 'competitive', label: 'Run Competitive Analysis' }
        ]);
        // Note: we do NOT add a new message, we just unlock the capabilities in the UI
      }
    } catch (e) {
      console.error("Discovery failed", e);
      // Fallback: unlock capabilities anyway
      setCapabilities([
        { id: 'surgery', label: 'Analyze Menu Margins' },
        { id: 'traffic', label: 'Forecast Foot Traffic' },
        { id: 'seo', label: 'Run SEO Deep Audit' },
        { id: 'competitive', label: 'Run Competitive Analysis' }
      ]);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSelectCapability = async (capId: string) => {
    if (!locatedBusiness) return;

    if (!hasProvidedEmail) {
      // Block UI with Email Wall and pause capability
      setPendingCapability(capId);
      setShowEmailWall(true);
      return;
    }

    executeCapability(capId);
  };

  const executeCapability = async (capId: string) => {
    if (!locatedBusiness) return;

    if (capId === 'surgery') {
      const msgId = Date.now().toString();
      setMessages(prev => [...prev, { id: msgId, role: 'model', text: "Starting Margin Surgery. Deploying ProfilerAgent to crawl the website, this may take a moment to retrieve the menu screenshots and calculate commodity impacts... ⏱️" }]);
      setCapabilities([]);
      setIsTyping(true);

      try {
        // We now pass the enriched business down to /api/analyze to skip Crawler if menuScreenshotBase64 exists
        const payload = {
          url: locatedBusiness.officialUrl,
          enrichedProfile: locatedBusiness, // Contains menuScreenshotBase64
          advancedMode: isAdvancedMcpEnabled
        };
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Analysis Failed");
        }

        const data = await res.json();
        setReport(data);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: "Surgery complete. The surgical dashboard has been rendered." }]);

      } catch (e: any) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: `Failed to execute Margin Surgery: ${e.message}` }]);
      } finally {
        setIsTyping(false);
      }
    } else if (capId === 'traffic') {
      const msgId = Date.now().toString();
      setMessages(prev => [...prev, { id: msgId, role: 'model', text: "Starting Foot Traffic Forecast. Deploying ForecasterAgent to analyze local events, weather, and compute traffic models... ⏱️" }]);
      setCapabilities([]);
      setIsTyping(true);

      try {
        const res = await fetch('/api/capabilities/traffic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: locatedBusiness }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Analysis Failed");
        }

        const data = await res.json();
        setForecast(data);

        if (data.forecast?.length) {
          const firstDay = data.forecast[0];
          setSelectedDay(firstDay);
          setSelectedSlot(firstDay.slots.find((s: any) => s.score > 70) || firstDay.slots[0]);
        }

        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: `Forecast complete!\n\n**Executive Summary**:\n${data.summary}` }]);

      } catch (e: any) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: `Failed to execute Foot Traffic Forecast: ${e.message}` }]);
      } finally {
        setIsTyping(false);
      }
    } else if (capId === 'seo') {
      const msgId = Date.now().toString();
      setMessages(prev => [...prev, { id: msgId, role: 'model', text: "Deploying SEO Auditor to analyze indexing, web vitals, and content hierarchy... ⏱️" }]);
      setCapabilities([]);
      setIsTyping(true);

      try {
        const res = await fetch('/api/capabilities/seo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: locatedBusiness }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Analysis Failed");
        }

        const data = await res.json();
        setSeoReport(data);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: `SEO Audit complete! Verified ${data.sections?.length || 0} critical infrastructure categories.` }]);

      } catch (e: any) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: `Failed to execute SEO Audit: ${e.message}` }]);
      } finally {
        setIsTyping(false);
      }
    } else if (capId === 'competitive') {
      const msgId = Date.now().toString();
      setMessages(prev => [...prev, { id: msgId, role: 'model', text: "Deploying Competitive Analyzer to compare your business against exactly 3 local rivals... ⏱️" }]);
      setCapabilities([]);
      setIsTyping(true);

      try {
        const res = await fetch('/api/capabilities/competitive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: locatedBusiness }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Analysis Failed");
        }

        const data = await res.json();
        setCompetitiveReport(data);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: `Competitive Strategy complete! ${data.market_summary}` }]);

      } catch (e: any) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: `Failed to execute Competitive Analysis: ${e.message}` }]);
      } finally {
        setIsTyping(false);
      }
    } else if (capId === 'social') {
      const msgId = Date.now().toString();
      setMessages(prev => [...prev, { id: msgId, role: 'model', text: "Deploying Social Strategy Agent — auditing your channels and mapping competitor social presence... ⏱️" }]);
      setCapabilities([]);
      setIsTyping(true);

      try {
        const res = await fetch('/api/capabilities/social-strategy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: locatedBusiness }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Analysis Failed');
        }

        const data = await res.json();
        setSocialReport(data);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: `Social Strategy complete! Overall score: ${data.overallScore}/100. ${data.executiveSummary?.split('.')[0]}.` }]);

      } catch (e: any) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: `Failed to run Social Strategy: ${e.message}` }]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const downloadSocialCard = async () => {
    if (!report) return;
    const topLeak = report.menu_items.sort((a, b) => b.price_leakage - a.price_leakage)[0];
    const totalLeakage = report.menu_items.reduce((s, i) => s + i.price_leakage, 0);

    const res = await fetch('/api/social-card', {
      method: "POST",
      body: JSON.stringify({
        businessName: report.identity.name,
        totalLeakage,
        topItem: topLeak ? topLeak.item_name : "Menu Optimization"
      })
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Hephae-Report.png";
      a.click();
    }
  };

  const renderSurgeonReport = () => {
    if (!report) return null;
    const { identity, menu_items, strategic_advice, overall_score } = report;
    const totalLeakage = menu_items.reduce((s, i) => s + i.price_leakage, 0);
    const topLeaks = menu_items.filter(i => i.price_leakage > 0).sort((a, b) => b.price_leakage - a.price_leakage);

    return (
      <div className="w-full h-full overflow-y-auto pb-20 p-8 animate-fade-in" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
        <header className="flex justify-between items-center mb-8 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {identity.logoUrl && <img src={identity.logoUrl} className="h-12 w-12 rounded-full object-cover" alt="Logo" />}
            <div>
              <h1 className="text-2xl font-bold" style={{ color: identity.primaryColor }}>{identity.name}</h1>
              <p className="text-sm opacity-70">{identity.persona}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm opacity-60">Surgical Score</div>
              <div className={clsx("text-4xl font-black", overall_score > 80 ? "text-green-400" : "text-yellow-400")}>{overall_score}/100</div>
            </div>
            <button
              onClick={() => setReport(null)}
              className="ml-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              title="Close Report"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8">
          <div className="p-8 rounded-3xl bg-gradient-to-br from-red-900/40 to-slate-900 border border-red-500/30">
            <h3 className="text-red-300 font-medium mb-1 flex items-center gap-2">
              <AlertTriangle size={18} /> DETECTED PROFIT LEAKAGE
            </h3>
            <div className="text-5xl font-bold text-white tracking-tight">
              ${totalLeakage.toLocaleString()} <span className="text-xl opacity-50 font-normal">/ cycle</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/10"><h3 className="font-bold text-lg">Surgical Breakdown</h3></div>
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider opacity-60">
                <tr>
                  <th className="p-4">Item</th>
                  <th className="p-4">Benchmark</th>
                  <th className="p-4">Price</th>
                  <th className="p-4 text-green-400">Rec.</th>
                  <th className="p-4 text-right">Leakage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {topLeaks.map((item, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="p-4">{item.item_name}</td>
                    <td className="p-4 opacity-70">${item.competitor_benchmark.toFixed(2)}</td>
                    <td className="p-4 opacity-70 border-l border-white/5">${item.current_price.toFixed(2)}</td>
                    <td className="p-4 font-bold text-green-400 border-l border-white/5">${item.recommended_price.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono text-red-400">+${item.price_leakage.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 rounded-2xl bg-blue-900/20 border border-blue-500/30">
            <h3 className="text-blue-300 font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} /> STRATEGIC ADVICE</h3>
            <div className="space-y-4">
              {strategic_advice.map((tip, i) => <div key={i} className="p-4 rounded-xl bg-blue-950/50 border border-blue-800/50 text-sm">"{tip}"</div>)}
            </div>
          </div>

          <button onClick={downloadSocialCard} className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all">
            <Download size={20} /> Download Integrity Report
          </button>
        </div>
      </div>
    );
  };

  const renderTrafficForecast = () => {
    if (!forecast) return null;
    return (
      <div className="w-full h-full overflow-y-auto pb-20 p-8 animate-fade-in" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
        <header className="flex justify-between items-center mb-6 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#4ade80' }}>{forecast.business.name}</h1>
              <p className="text-sm opacity-70">Hephae Traffic forecaster</p>
            </div>
          </div>
          <button
            onClick={() => setForecast(null)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shadow-lg"
            title="Close Forecast"
          >
            <X size={20} />
          </button>
        </header>

        {selectedSlot && selectedDay && (
          <div className="mb-6 rounded-3xl overflow-hidden shadow-2xl">
            <DetailPanel
              day={selectedDay}
              slot={selectedSlot}
              onAskAI={(query) => {
                setForecast(null);
                sendMessage(query);
              }}
            />
          </div>
        )}

        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-700 shadow-xl overflow-hidden mb-6">
          <HeatmapGrid
            forecast={forecast.forecast}
            onSlotClick={(day, slot) => {
              setSelectedDay(day);
              setSelectedSlot(slot);
            }}
            selectedSlot={selectedSlot && selectedDay ? { dayStr: selectedDay.date, slotLabel: selectedSlot.label } : null}
          />
        </div>
      </div>
    );
  };

  const renderCompetitiveReport = () => {
    if (!competitiveReport) return null;
    return (
      <div className="w-full h-full overflow-y-auto pb-20 p-8 pt-12 animate-fade-in" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
        <header className="flex justify-between items-center mb-8 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          <h1 className="text-2xl font-bold text-orange-400 flex items-center gap-3"><Swords size={28} /> Competitive Market Strategy</h1>
        </header>

        <div className="p-6 rounded-2xl bg-orange-900/20 border border-orange-500/30 mb-8">
          <h3 className="text-orange-300 font-bold mb-2">Executive Summary</h3>
          <p className="text-slate-300 text-sm leading-relaxed">{competitiveReport.market_summary}</p>
        </div>

        <div className="space-y-6 mb-8">
          <h3 className="font-bold text-lg text-white">Rival Positioning Radar</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {competitiveReport.competitor_analysis.map((comp: any, i: number) => (
              <div key={i} className="p-5 rounded-3xl bg-black/40 border border-white/10 hover:border-orange-500/50 transition-colors">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-indigo-300 truncate pr-2 text-lg">{comp.name}</span>
                  <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">Threat: {comp.threat_level}/10</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1"><TrendingUp size={12} /> KEY STRENGTH</div>
                    <div className="text-sm text-slate-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 leading-relaxed">{comp.key_strength}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1"><AlertTriangle size={12} /> EXPLOITABLE WEAKNESS</div>
                    <div className="text-sm text-slate-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3 leading-relaxed">{comp.key_weakness}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-indigo-900/20 border border-indigo-500/30 shadow-lg">
          <h3 className="text-indigo-300 font-bold mb-5 flex items-center gap-2"><Swords size={18} /> Strategic Advantages to Leverage</h3>
          <ul className="space-y-3">
            {competitiveReport.strategic_advantages.map((adv: string, i: number) => (
              <li key={i} className="flex gap-4 text-sm text-slate-300 bg-indigo-950/50 border border-indigo-800/50 p-4 rounded-xl leading-relaxed items-start">
                <div className="mt-0.5 p-1 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/30">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                {adv}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const renderSocialReport = () => {
    if (!socialReport) return null;
    const scoreColor = socialReport.overallScore >= 70 ? '#4ade80' : socialReport.overallScore >= 40 ? '#facc15' : '#f87171';
    return (
      <div className="w-full h-full overflow-y-auto pb-20 p-8 pt-12 animate-fade-in" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
        <header className="flex justify-between items-center mb-8 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Activity size={28} className="text-pink-400" />
            <div>
              <h1 className="text-2xl font-bold text-pink-400">Social Media Strategy</h1>
              <p className="text-sm opacity-60">{socialReport.business.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs opacity-50 uppercase tracking-wider mb-1">Overall Score</div>
              <div className="text-4xl font-black" style={{ color: scoreColor }}>{socialReport.overallScore}<span className="text-lg font-normal opacity-50">/100</span></div>
            </div>
            <button onClick={() => setSocialReport(null)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors" title="Close">
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Executive Summary */}
        <div className="p-6 rounded-2xl bg-pink-900/20 border border-pink-500/30 mb-6">
          <h3 className="text-pink-300 font-bold mb-2 flex items-center gap-2"><BrainCircuit size={16} /> Executive Summary</h3>
          <p className="text-slate-300 text-sm leading-relaxed">{socialReport.executiveSummary}</p>
        </div>

        {/* Channel Audits */}
        {socialReport.channelAudits?.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2"><Activity size={18} className="text-pink-400" /> Your Channel Scores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {socialReport.channelAudits.map((ch, i) => {
                const chColor = ch.score >= 70 ? '#4ade80' : ch.score >= 40 ? '#facc15' : '#f87171';
                return (
                  <div key={i} className="p-5 rounded-2xl bg-black/40 border border-white/10">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-white">{ch.platform}</span>
                      <span className="text-lg font-bold" style={{ color: chColor }}>{ch.score}/100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 mb-3">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${ch.score}%`, backgroundColor: chColor }} />
                    </div>
                    {ch.postingFrequency && <p className="text-xs text-slate-400 mb-1">Frequency: {ch.postingFrequency}</p>}
                    {ch.topContentType && <p className="text-xs text-slate-400 mb-2">Top Content: {ch.topContentType}</p>}
                    {ch.weaknesses && ch.weaknesses.length > 0 && (
                      <ul className="space-y-1">
                        {ch.weaknesses.map((w, j) => <li key={j} className="text-xs text-red-300 flex gap-1.5 items-start"><AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />{w}</li>)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Competitor Social Profiles */}
        {socialReport.competitorProfiles?.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2"><Swords size={18} className="text-orange-400" /> Competitor Social Landscape</h3>
            <div className="space-y-3">
              {socialReport.competitorProfiles.map((comp, i) => (
                <div key={i} className="p-4 rounded-2xl bg-black/40 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-indigo-300">{comp.name}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">Threat: {comp.threatLevel}/10</span>
                  </div>
                  {comp.strongestPlatform && <p className="text-xs text-slate-400 mb-1">Strongest: <span className="text-pink-300">{comp.strongestPlatform}</span></p>}
                  {comp.contentStrategy && <p className="text-xs text-slate-400 leading-relaxed">{comp.contentStrategy}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gap Analysis */}
        {socialReport.gapAnalysis?.length > 0 && (
          <div className="p-6 rounded-2xl bg-yellow-900/20 border border-yellow-500/30 mb-6">
            <h3 className="text-yellow-300 font-bold mb-3 flex items-center gap-2"><AlertTriangle size={16} /> Gap Analysis</h3>
            <ul className="space-y-2">
              {socialReport.gapAnalysis.map((gap, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2 items-start"><span className="text-yellow-400 mt-0.5">•</span>{gap}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Content Pillars */}
        {socialReport.contentPillars?.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2"><Target size={18} className="text-purple-400" /> Content Pillars</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {socialReport.contentPillars.map((pillar, i) => (
                <div key={i} className="p-5 rounded-2xl bg-purple-900/20 border border-purple-500/30">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-purple-300 text-sm">{pillar.name}</span>
                    <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{pillar.platform}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">Freq: {pillar.postingFrequency}</p>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">{pillar.rationale}</p>
                  <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-800/50">
                    <p className="text-xs text-purple-200 italic">"{pillar.examplePrompt}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Wins */}
        {socialReport.quickWins?.length > 0 && (
          <div className="p-6 rounded-2xl bg-green-900/20 border border-green-500/30 mb-6">
            <h3 className="text-green-300 font-bold mb-3 flex items-center gap-2"><TrendingUp size={16} /> Quick Wins — Do This Week</h3>
            <ul className="space-y-2">
              {socialReport.quickWins.map((win, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-3 items-start p-3 rounded-xl bg-green-950/50 border border-green-800/50">
                  <span className="text-green-400 font-bold flex-shrink-0">{i + 1}.</span>{win}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 30-Day Plan */}
        {socialReport.thirtyDayPlan?.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2"><Scale size={18} className="text-blue-400" /> 30-Day Action Plan</h3>
            <div className="space-y-2">
              {socialReport.thirtyDayPlan.map((step, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-blue-900/20 border border-blue-500/20 items-start">
                  <span className="w-7 h-7 rounded-full bg-blue-500/30 text-blue-300 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Report Link */}
        {socialReport.reportUrl && (
          <a href={socialReport.reportUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 font-bold text-white shadow-lg transition-all">
            <ArrowRight size={20} /> View Full Interactive Report
          </a>
        )}
      </div>
    );
  };

  const isCentered = !locatedBusiness && !report && !forecast && !seoReport && !competitiveReport && !socialReport;

  return (
    <main className={`flex h-screen w-screen overflow-hidden relative transition-colors duration-700 ${isCentered ? 'bg-white' : 'bg-slate-950'}`}>

      {/* BACKGROUND ANIMATION */}
      {isCentered && (
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-multiply pointer-events-none">
          <NeuralBackground />
        </div>
      )}

      {/* LEFT VISUALIZER PANEL - Hidden when centered */}
      <div className={`relative z-10 transition-all duration-700 ease-in-out flex flex-col ${isCentered ? 'w-0 opacity-0 overflow-hidden' : 'flex-1 opacity-100'}`}>
        {!isCentered && (
          <>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 animate-fade-in-up pointer-events-auto bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-2xl border border-gray-200/80">
              <button onClick={() => handleSelectCapability("surgery")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 hover:text-indigo-600 hover:bg-indigo-50/80 transition-all group">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                Menu Margins
              </button>

              <div className="w-px h-4 bg-gray-200 mx-1"></div>

              <button onClick={() => handleSelectCapability("traffic")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/80 transition-all group">
                <Users className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                Foot Traffic
              </button>

              <div className="w-px h-4 bg-gray-200 mx-1"></div>

              <button onClick={() => handleSelectCapability("seo")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 hover:text-purple-600 hover:bg-purple-50/80 transition-all group">
                <SearchIcon className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
                SEO Auditor
              </button>

              <div className="w-px h-4 bg-gray-200 mx-1"></div>

              <button onClick={() => handleSelectCapability("competitive")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 hover:text-orange-600 hover:bg-orange-50/80 transition-all group">
                <Swords className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform" />
                Competitors
              </button>

              <div className="w-px h-4 bg-gray-200 mx-1"></div>

              <button onClick={() => handleSelectCapability("social")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 hover:text-pink-600 hover:bg-pink-50/80 transition-all group">
                <Activity className="w-3.5 h-3.5 text-pink-500 group-hover:scale-110 transition-transform" />
                Social Strategy
              </button>

              <div className="w-px h-4 bg-gray-200 mx-1"></div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 bg-slate-50/50">
                <input
                  type="checkbox"
                  id="advanced-mcp-toggle"
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={isAdvancedMcpEnabled}
                  onChange={(e) => setIsAdvancedMcpEnabled(e.target.checked)}
                />
                <label htmlFor="advanced-mcp-toggle" className="cursor-pointer select-none">Advanced (Live Data)</label>
              </div>
            </div>

            {report ? (
              renderSurgeonReport()
            ) : forecast ? (
              renderTrafficForecast()
            ) : socialReport ? (
              renderSocialReport()
            ) : competitiveReport ? (
              renderCompetitiveReport()
            ) : seoReport ? (
              <div className="w-full h-full overflow-y-auto pb-20 p-8 pt-12 animate-fade-in" style={{ backgroundColor: '#0f172a' }}>
                <ResultsDashboard report={seoReport} groundingChunks={(seoReport as any).groundingChunks || []} />
              </div>
            ) : locatedBusiness && locatedBusiness.coordinates ? (
              <div className="relative w-full h-full">
                <MapVisualizer lat={locatedBusiness.coordinates.lat} lng={locatedBusiness.coordinates.lng} businessName={locatedBusiness.name} business={locatedBusiness} isDiscovering={isDiscovering} />
                {!isDiscovering && (locatedBusiness as EnrichedProfile).discoveredAt && (
                  <ProfileCard profile={locatedBusiness as EnrichedProfile} />
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-transparent mt-16 px-4">
                {/* Fallback space when left panel is active but no content is loaded */}
              </div>
            )}
          </>
        )}
      </div>

      {/* RIGHT CHATBOT PANEL - Expands to full screen when centered */}
      <div className={`relative z-20 flex-shrink-0 transition-all duration-700 ease-in-out h-full ${isCentered ? 'w-full max-w-none' : 'w-full max-w-[420px]'}`}>
        <ChatInterface
          messages={messages}
          onSendMessage={sendMessage}
          isTyping={isTyping}
          onReset={() => {
            setMessages([{ id: '1', role: 'model', text: 'Hi! I am Hephae. Type the name of a business you want to analyze or just ask me anything.' }]);
            setLocatedBusiness(null);
            setReport(null);
            setForecast(null);
            setSeoReport(null);
            setCompetitiveReport(null);
            setSocialReport(null);
            setCapabilities([]);
            setIsDiscovering(false);
          }}
          capabilities={capabilities}
          onSelectCapability={handleSelectCapability}
          isCentered={isCentered}
          followUpChips={
            isCentered
              ? ["Analyze Bosphorus Nutley", "Find Tick Tock Diner Clifton", "What is my profit margin?"]
              : (locatedBusiness ? [
                `Tell me more about ${locatedBusiness.name}`,
                `Who are ${locatedBusiness.name}'s competitors?`,
                `What are the busiest hours?`
              ] : [])
          }
        />
      </div>

      <EmailWall isOpen={showEmailWall} onSubmit={handleEmailSubmit} />
    </main>
  );
}
