'use client';

import React from 'react';
import { EnrichedProfile, SocialLinks, CompetitorEntry } from '@/agents/types';

interface ProfileCardProps {
    profile: EnrichedProfile;
}

// ── Platform meta ─────────────────────────────────────────────────────────────

type Platform = keyof SocialLinks;

const PLATFORM_META: Record<Platform, { label: string; color: string; icon: string }> = {
    instagram:     { label: 'Instagram',    color: '#E1306C', icon: '📸' },
    facebook:      { label: 'Facebook',     color: '#1877F2', icon: 'f'  },
    twitter:       { label: 'Twitter/X',    color: '#000000', icon: '𝕏'  },
    tiktok:        { label: 'TikTok',       color: '#010101', icon: '♪'  },
    youtube:       { label: 'YouTube',      color: '#FF0000', icon: '▶'  },
    linkedin:      { label: 'LinkedIn',     color: '#0A66C2', icon: 'in' },
    yelp:          { label: 'Yelp',         color: '#D32323', icon: '★'  },
    googleBusiness:{ label: 'Google Biz',   color: '#4285F4', icon: 'G'  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SocialBadge({ platform, url }: { platform: Platform; url: string }) {
    const meta = PLATFORM_META[platform];
    if (!meta || !url) return null;
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={meta.label}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[11px] font-bold hover:opacity-80 transition-opacity"
            style={{ backgroundColor: meta.color }}
        >
            <span className="text-[10px] leading-none">{meta.icon}</span>
            <span>{meta.label}</span>
        </a>
    );
}

function CompetitorRow({ comp, index }: { comp: CompetitorEntry; index: number }) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
            {/* Index badge */}
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold text-white/60 mt-0.5">
                {index + 1}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-white hover:text-indigo-300 transition-colors truncate"
                    >
                        {comp.name}
                    </a>
                    {comp.priceRange && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                            {comp.priceRange}
                        </span>
                    )}
                    {comp.cuisineType && (
                        <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                            {comp.cuisineType}
                        </span>
                    )}
                </div>
                {comp.address && (
                    <div className="text-[11px] text-white/40 mt-0.5 truncate">📍 {comp.address}</div>
                )}
                {comp.phone && (
                    <a
                        href={`tel:${comp.phone.replace(/\D/g, '')}`}
                        className="text-[11px] text-white/40 hover:text-white/60 transition-colors"
                    >
                        📞 {comp.phone}
                    </a>
                )}
                {comp.reason && (
                    <div className="text-[11px] text-white/30 mt-1 leading-snug">{comp.reason}</div>
                )}
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

const ProfileCard: React.FC<ProfileCardProps> = ({ profile }) => {
    const { name, address, officialUrl, contactInfo, socialLinks, googleMapsUrl, competitors } = profile;

    const activeSocials = socialLinks
        ? (Object.entries(socialLinks) as [Platform, string][]).filter(([, url]) => !!url)
        : [];

    const hasContact = contactInfo && (contactInfo.email || contactInfo.phone || contactInfo.hours);

    return (
        <div className="absolute bottom-0 left-0 right-0 z-10 max-h-[55%] overflow-y-auto rounded-t-2xl shadow-2xl border-t border-white/10"
            style={{ background: 'rgba(15,23,42,0.96)', backdropFilter: 'blur(12px)' }}
        >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-8 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-4 pb-4 space-y-4">

                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <a
                            href={officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base font-bold text-white hover:text-indigo-300 transition-colors leading-tight"
                        >
                            {name}
                        </a>
                        {address && (
                            <p className="text-[11px] text-white/40 mt-0.5 leading-snug truncate">{address}</p>
                        )}
                    </div>
                    {googleMapsUrl && (
                        <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 text-[10px] font-bold text-white/60 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-full transition-colors whitespace-nowrap"
                        >
                            📍 Maps
                        </a>
                    )}
                </div>

                {/* Contact info */}
                {hasContact && (
                    <div className="bg-white/5 rounded-xl p-3 space-y-1.5">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Contact</div>
                        {contactInfo!.phone && (
                            <a href={`tel:${contactInfo!.phone.replace(/\D/g, '')}`}
                                className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors">
                                <span className="w-4 text-center">📞</span>
                                <span>{contactInfo!.phone}</span>
                            </a>
                        )}
                        {contactInfo!.email && (
                            <a href={`mailto:${contactInfo!.email}`}
                                className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors">
                                <span className="w-4 text-center">✉️</span>
                                <span className="truncate">{contactInfo!.email}</span>
                            </a>
                        )}
                        {contactInfo!.hours && (
                            <div className="flex items-start gap-2 text-xs text-white/50">
                                <span className="w-4 text-center flex-shrink-0">🕐</span>
                                <span className="leading-snug">{contactInfo!.hours}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Social media */}
                {activeSocials.length > 0 && (
                    <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Social Media</div>
                        <div className="flex flex-wrap gap-1.5">
                            {activeSocials.map(([platform, url]) => (
                                <SocialBadge key={platform} platform={platform} url={url} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Competitors */}
                {competitors && competitors.length > 0 && (
                    <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">
                            Top Competitors
                        </div>
                        <div className="bg-white/5 rounded-xl px-3 py-1">
                            {competitors.map((comp, i) => (
                                <CompetitorRow key={i} comp={comp} index={i} />
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ProfileCard;
