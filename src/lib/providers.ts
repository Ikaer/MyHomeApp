export interface StreamingProvider {
  id: number;
  name: string;
  logo: string;
  url: string;
  urlPatterns: string[];
}

export const STREAMING_PROVIDERS: StreamingProvider[] = [
  {
    id: 1,
    name: "Netflix",
    logo: "netflix.png",
    url: "https://www.netflix.com",
    urlPatterns: ["netflix.com", "www.netflix.com"]
  },
  {
    id: 2,
    name: "Crunchyroll",
    logo: "crunchyroll.svg",
    url: "https://www.crunchyroll.com",
    urlPatterns: ["crunchyroll.com", "www.crunchyroll.com"]
  },
  {
    id: 3,
    name: "ADN",
    logo: "adn.png",
    url: "https://animationdigitalnetwork.com",
    urlPatterns: ["animationdigitalnetwork.com", "www.animationdigitalnetwork.com", "adn.app"]
  },
  {
    id: 4,
    name: "Disney",
    logo: "disney.png",
    url: "https://www.disneyplus.com",
    urlPatterns: ["disneyplus.com", "www.disneyplus.com"]
  },
  {
    id: 5,
    name: "Prime",
    logo: "prime.svg",
    url: "https://www.primevideo.com",
    urlPatterns: ["primevideo.com", "www.primevideo.com", "amazon.com/prime", "amazon.fr/prime"]
  }
];

/**
 * Detect streaming provider from URL
 */
export function detectProviderFromUrl(url: string): StreamingProvider | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const fullPath = `${hostname}${urlObj.pathname}`.toLowerCase();
    
    for (const provider of STREAMING_PROVIDERS) {
      for (const pattern of provider.urlPatterns) {
        if (hostname.includes(pattern.toLowerCase()) || fullPath.includes(pattern.toLowerCase())) {
          return provider;
        }
      }
    }
  } catch (error) {
    // Invalid URL
    return null;
  }
  
  return null;
}

/**
 * Get provider logo path for use in img src
 */
export function getProviderLogoPath(provider: StreamingProvider): string {
  return `/providers/${provider.logo}`;
}

/**
 * Get provider by name (case insensitive)
 */
export function getProviderByName(name: string): StreamingProvider | null {
  const normalizedName = name.toLowerCase().trim();
  return STREAMING_PROVIDERS.find(p => p.name.toLowerCase() === normalizedName) || null;
}

/**
 * Get all available providers
 */
export function getAllProviders(): StreamingProvider[] {
  return [...STREAMING_PROVIDERS];
}

/**
 * Format provider for display in forms/dropdowns
 */
export function formatProviderOption(provider: StreamingProvider): { value: string; label: string; logo: string } {
  return {
    value: provider.name,
    label: provider.name,
    logo: getProviderLogoPath(provider)
  };
}
