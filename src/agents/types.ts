export interface Coordinates {
    lat: number;
    lng: number;
}

export interface BaseIdentity {
    name: string;
    address?: string;
    zipCode?: string;
    coordinates?: Coordinates;
    officialUrl: string;
}

export interface ContactInfo {
    email?: string;
    phone?: string;
    hours?: string;
}

export interface SocialLinks {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
    linkedin?: string;
    yelp?: string;
    googleBusiness?: string;
}

export interface CompetitorEntry {
    name: string;
    url: string;
    address?: string;
    phone?: string;
    cuisineType?: string;
    priceRange?: string;
    reason?: string;
}

export interface EnrichedProfile extends BaseIdentity {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    persona?: string;
    menuScreenshotBase64?: string;
    contactInfo?: ContactInfo;
    socialLinks?: SocialLinks;
    googleMapsUrl?: string;
    competitors?: CompetitorEntry[];
    discoveredAt?: string;
    _debugError?: string;
}
