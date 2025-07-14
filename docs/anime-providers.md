# Anime Providers System

This document explains how the provider system works in the anime subapp.

## Provider Organization

### Location Structure
```
public/providers/           # Static provider logos (PNG/SVG)
├── adn.png
├── crunchyroll.svg  
├── disney.png
├── netflix.png
└── prime.svg

src/lib/providers.ts        # Provider data and logic
```

### Provider Data
- **Hardcoded list** in `src/lib/providers.ts`
- Each provider includes: ID, name, logo filename, base URL, and URL patterns
- URL patterns enable automatic detection when user enters URLs

## Features

### 1. Automatic Provider Detection
When a user enters a URL in the extension form:
- System automatically detects the provider based on URL patterns
- Fills in the provider name if not already set
- Shows the provider logo

Example URL patterns:
- `https://www.crunchyroll.com/series/...` → Detected as "Crunchyroll"
- `https://www.netflix.com/title/...` → Detected as "Netflix"

### 2. Provider Dropdown
- Quick selection from known providers
- Auto-fills base URL when provider is selected
- Option for custom providers not in the list

### 3. Logo Display
- Shows provider logos in both the table and form
- 16x16px icons in table, 24x24px in form
- SVG and PNG support

## Adding New Providers

1. **Add logo file** to `public/providers/`
2. **Update provider list** in `src/lib/providers.ts`:
   ```typescript
   {
     id: 6,
     name: "New Provider",
     logo: "newprovider.png",
     url: "https://newprovider.com",
     urlPatterns: ["newprovider.com", "www.newprovider.com"]
   }
   ```

## URL Pattern Guidelines

- Include both `example.com` and `www.example.com`
- Add specific paths for providers with multiple services
- Examples:
  - Amazon Prime: `["primevideo.com", "amazon.com/prime"]`
  - Regional variants: `["crunchyroll.com", "crunchyroll.fr"]`

## File Size Recommendations

- **PNG**: Keep under 50KB for fast loading
- **SVG**: Preferred for scalable quality
- **Dimensions**: Icons work best at 24x24px or similar square ratios
