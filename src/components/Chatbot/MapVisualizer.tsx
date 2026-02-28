"use client";

import React, { useState, useEffect } from 'react';

import { BaseIdentity, EnrichedProfile } from '@/agents/types';

interface MapVisualizerProps {
    lat: number;
    lng: number;
    businessName: string;
    business?: BaseIdentity | EnrichedProfile;
    isDiscovering?: boolean;
}

type ActiveTab = 'profile' | 'theme' | 'contact' | 'social' | 'menu' | 'competitors';

const LoadingDots = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center h-full space-y-2 py-4">
        <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className="text-slate-400 text-sm">{label}</p>
    </div>
);

export default function MapVisualizer({ lat, lng, businessName, business, isDiscovering = false }: MapVisualizerProps) {
    const [zoomLevel, setZoomLevel] = useState<number>(15);
    const [resetKey, setResetKey] = useState(0);
    const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
    const [menuImgError, setMenuImgError] = useState(false);
    const [logoError, setLogoError] = useState(false);

    const getUrl = () => {
        const baseEmbed = `https://maps.google.com/maps?ie=UTF8&iwloc=&output=embed`;
        return `${baseEmbed}&z=${zoomLevel}&q=${lat},${lng}&t=m`;
    };

    const getMapStyle = () => {
        return {
            filter: 'invert(85%) hue-rotate(180deg) brightness(1.1) contrast(95%) saturate(120%)',
            border: 0,
            opacity: 1
        };
    };

    const handleZoom = (delta: number) => {
        setZoomLevel(prev => Math.min(Math.max(prev + delta, 13), 18));
    }

    useEffect(() => {
        setResetKey(prev => prev + 1);
    }, [lat, lng]);

    const profile = business as EnrichedProfile;
    const isEnriched = !isDiscovering && business && 'phone' in business;

    const TABS: { id: ActiveTab; label: string }[] = [
        { id: 'profile', label: 'Profile' },
        { id: 'theme', label: 'Theme' },
        { id: 'contact', label: 'Contact' },
        { id: 'social', label: 'Social' },
        { id: 'menu', label: 'Menu' },
        { id: 'competitors', label: 'Rivals' },
    ];

    return (
        <div className="relative w-full h-full bg-slate-800 overflow-hidden group">
            {/* NATIVE MAP INTERACTION ENABLED */}
            <iframe
                key={`${resetKey}-${zoomLevel}`}
                className="w-full h-full transition-all duration-500 pointer-events-auto"
                style={getMapStyle()}
                src={getUrl()}
                allowFullScreen
                loading="lazy"
                title="Traffic Intelligence Map"
                tabIndex={-1}
            ></iframe>

            {/* CONTROLS (Right Side) */}
            <div className="absolute bottom-20 right-6 z-30 flex flex-col items-center gap-4">
                <button
                    onClick={() => setResetKey(p => p + 1)}
                    className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center font-bold shadow-lg border border-indigo-400/50"
                    title="Re-Center Map"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                </button>
                <div className="flex flex-col gap-1">
                    <button onClick={() => handleZoom(1)} className="bg-white text-gray-700 w-10 h-10 rounded-t-lg shadow-lg hover:bg-gray-100 font-bold flex items-center justify-center border-b border-gray-200 text-lg">+</button>
                    <button onClick={() => handleZoom(-1)} className="bg-white text-gray-700 w-10 h-10 rounded-b-lg shadow-lg hover:bg-gray-100 font-bold flex items-center justify-center text-lg">-</button>
                </div>
            </div>

            {/* VISUALIZATION OVERLAY */}
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center animate-fade-in">
                <div className="absolute inset-0 pointer-events-none mix-blend-screen overflow-visible flex items-center justify-center">
                    <div className="absolute z-20 pointer-events-none">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute w-12 h-12 bg-indigo-500 rounded-full animate-ping opacity-40"></div>
                            <div className="relative w-4 h-4 bg-indigo-400 rounded-full border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.9)]"></div>
                            <div className={`absolute top-full mt-2 text-indigo-100 font-bold text-sm bg-slate-900/90 px-3 py-1.5 rounded-md border border-indigo-500/50 shadow backdrop-blur whitespace-nowrap`}>
                                {businessName}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* GLASSMORPHISM DISCOVERY OVERLAY */}
            {business && (
                <div className="absolute top-8 left-8 z-40 w-96 animate-fade-in-up flex flex-col gap-4" style={{ animationDelay: '0.5s' }}>
                    <div className="bg-slate-900/85 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden">

                        {/* HEADER */}
                        <div className="p-6 pb-4 border-b border-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50">
                                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                </div>
                                <div>
                                    <h2 className="text-white font-bold text-lg leading-tight">{business.name}</h2>
                                    {isDiscovering ? (
                                        <p className="text-amber-400 text-xs font-medium uppercase tracking-wider animate-pulse flex items-center gap-1 mt-0.5">
                                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Running Sub-Agents...
                                        </p>
                                    ) : (
                                        <p className="text-indigo-300 text-xs font-medium uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                            Profile Enriched
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* TABS — 6 tabs, compact */}
                            <div className="flex gap-0.5 p-1 bg-black/40 rounded-lg">
                                {TABS.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-colors leading-tight ${activeTab === tab.id ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* TAB CONTENT */}
                        <div className="p-6 pt-4 space-y-4">

                            {/* PROFILE TAB: address + website only */}
                            {activeTab === 'profile' && (
                                <div className="space-y-3 animate-fade-in relative min-h-[100px]">
                                    <div className="flex items-start gap-3 text-slate-300 bg-black/20 p-3 rounded-xl border border-white/5">
                                        <svg className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        <p className="text-sm leading-snug">{business.address}</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-300 bg-black/20 p-3 rounded-xl border border-white/5">
                                        <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                        <a href={business.officialUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300 truncate underline decoration-indigo-500/30 underline-offset-2">
                                            {business.officialUrl.replace(/^https?:\/\/(www\.)?/, '')}
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* THEME TAB: logo, favicon, colors, persona */}
                            {activeTab === 'theme' && (
                                <div className="space-y-3 animate-fade-in relative min-h-[140px]">
                                    {isDiscovering ? (
                                        <LoadingDots label="Parsing digital assets..." />
                                    ) : (
                                        <>
                                            {/* Logo preview */}
                                            <div className="w-full rounded-xl overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center" style={{ minHeight: '80px' }}>
                                                {profile.logoUrl && !logoError ? (
                                                    <img
                                                        src={profile.logoUrl}
                                                        alt="Logo"
                                                        className="w-full object-contain max-h-24 p-2"
                                                        onError={() => setLogoError(true)}
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center w-full h-20">
                                                        <span className="text-2xl font-bold text-slate-400 tracking-wider">
                                                            {business.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Favicon + Colors + Persona row */}
                                            <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                                                {profile.favicon && (
                                                    <img src={profile.favicon} alt="favicon" className="w-5 h-5 rounded shrink-0" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                )}
                                                {profile.primaryColor && (
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="w-4 h-4 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: profile.primaryColor }}></span>
                                                        <span className="text-[10px] font-mono text-slate-400">{profile.primaryColor}</span>
                                                    </div>
                                                )}
                                                {profile.secondaryColor && (
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="w-4 h-4 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: profile.secondaryColor }}></span>
                                                        <span className="text-[10px] font-mono text-slate-400">{profile.secondaryColor}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {profile.persona && (
                                                <div className="flex items-center gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Persona</span>
                                                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">{profile.persona}</span>
                                                </div>
                                            )}

                                            {!profile.logoUrl && !profile.favicon && !profile.primaryColor && !profile.persona && (
                                                <div className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 text-sm text-center">
                                                    No theme assets found.
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* CONTACT TAB: phone, email, hours */}
                            {activeTab === 'contact' && (
                                <div className="space-y-3 animate-fade-in relative min-h-[100px]">
                                    {isDiscovering ? (
                                        <LoadingDots label="Parsing digital assets..." />
                                    ) : (
                                        <>
                                            {profile.phone && (
                                                <div className="flex items-center gap-3 text-slate-300 bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                                    <a href={`tel:${profile.phone}`} className="text-sm hover:text-indigo-300 transition-colors">{profile.phone}</a>
                                                </div>
                                            )}
                                            {profile.email && (
                                                <div className="flex items-center gap-3 text-slate-300 bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                                    <a href={`mailto:${profile.email}`} className="text-sm text-indigo-400 hover:text-indigo-300 truncate">{profile.email}</a>
                                                </div>
                                            )}
                                            {profile.hours && (
                                                <div className="flex items-start gap-3 text-slate-300 bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <svg className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                    <p className="text-sm leading-snug">{profile.hours}</p>
                                                </div>
                                            )}
                                            {!profile.phone && !profile.email && !profile.hours && (
                                                <div className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 text-sm text-center">
                                                    No contact details found.
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* SOCIAL TAB: social icons + Google Maps */}
                            {activeTab === 'social' && (
                                <div className="space-y-3 animate-fade-in relative min-h-[100px]">
                                    {isDiscovering ? (
                                        <LoadingDots label="Parsing digital assets..." />
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap gap-2">
                                                {profile.socialLinks?.instagram && (
                                                    <a href={profile.socialLinks.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 border border-pink-500/20 transition-colors text-sm font-semibold" title="Instagram">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                                                        Instagram
                                                    </a>
                                                )}
                                                {profile.socialLinks?.facebook && (
                                                    <a href={profile.socialLinks.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors text-sm font-semibold" title="Facebook">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
                                                        Facebook
                                                    </a>
                                                )}
                                                {profile.socialLinks?.twitter && (
                                                    <a href={profile.socialLinks.twitter} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-600/20 text-slate-300 hover:bg-slate-600/40 border border-slate-500/20 transition-colors text-sm font-semibold" title="X (Twitter)">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.738l7.726-8.84-8.162-10.66h7.082l4.259 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" /></svg>
                                                        Twitter / X
                                                    </a>
                                                )}
                                                {profile.googleMapsUrl && (
                                                    <a href={profile.googleMapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors text-sm font-semibold">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                                        Google Maps
                                                    </a>
                                                )}
                                            </div>
                                            {!profile.socialLinks?.instagram && !profile.socialLinks?.facebook && !profile.socialLinks?.twitter && !profile.googleMapsUrl && (
                                                <div className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 text-sm text-center">
                                                    No social profiles found.
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* MENU TAB: unchanged */}
                            {activeTab === 'menu' && (
                                <div className="animate-fade-in relative min-h-[140px] flex flex-col items-center justify-center text-center">
                                    {isDiscovering ? (
                                        <LoadingDots label="Parsing digital assets..." />
                                    ) : profile.menuScreenshotBase64 && !menuImgError ? (
                                        <div className="w-full">
                                            <div className="h-32 rounded-xl overflow-hidden border border-white/10 mb-3 relative">
                                                <img
                                                    src={`data:image/jpeg;base64,${profile.menuScreenshotBase64}`}
                                                    className="w-full h-full object-cover opacity-80"
                                                    alt="Menu Snapshot"
                                                    onError={() => setMenuImgError(true)}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                                                    <span className="text-xs font-bold text-white shadow-sm">Menu Loaded</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 text-sm text-center">
                                            <svg className="w-6 h-6 text-slate-500 mb-2 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                            No explicit menu asset retained.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* RIVALS TAB: unchanged */}
                            {activeTab === 'competitors' && (
                                <div className="space-y-3 animate-fade-in relative min-h-[140px]">
                                    {isDiscovering ? (
                                        <LoadingDots label="Scanning geographic topology..." />
                                    ) : profile.competitors?.length ? (
                                        <div className="space-y-2">
                                            {profile.competitors.map((comp, i) => (
                                                <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-black/30 border border-white/5 hover:border-indigo-500/30 transition-colors">
                                                    <div className="flex justify-between items-start">
                                                        <a href={comp.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-indigo-300 hover:underline hover:decoration-indigo-500/50 truncate pr-4">
                                                            {comp.name}
                                                        </a>
                                                    </div>
                                                    {comp.reason && <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{comp.reason}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="w-full p-4 flex flex-col items-center text-center justify-center rounded-xl bg-slate-800/50 border border-slate-700 min-h-[140px]">
                                            <svg className="w-6 h-6 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                            <p className="text-xs text-slate-400 font-medium whitespace-pre-wrap">No direct comparable rivals found{'\n'}in geographic boundary.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
