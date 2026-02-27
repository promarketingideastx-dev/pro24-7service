import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // ── Light Mode — Core Product Accent System ──
                accent: {
                    // Primary: Teal (#14B8A6) — lives on CTAs, active states, links, key icons
                    primary: '#14B8A6',
                    'primary-dark': '#0F9488',
                    'primary-soft': 'rgba(20,184,166,0.12)',
                    'primary-surface': 'rgba(20,184,166,0.06)',
                    // Secondary: Blue (#2563EB) — categories, secondary info, links on categories
                    secondary: '#2563EB',
                    'secondary-soft': 'rgba(37,99,235,0.10)',
                    // Highlight: Amber (#F59E0B) — warnings, attention, badges
                    highlight: '#F59E0B',
                    'highlight-soft': 'rgba(245,158,11,0.12)',
                },
                // ── Banner states ──
                banner: {
                    'info-bg': 'rgba(20,184,166,0.10)',
                    'info-border': '#14B8A6',
                    'success-bg': 'rgba(34,197,94,0.10)',
                    'success-border': '#22C55E',
                    'warning-bg': 'rgba(245,158,11,0.12)',
                    'warning-border': '#F59E0B',
                    'danger-bg': 'rgba(239,68,68,0.10)',
                    'danger-border': '#EF4444',
                },
                // ── Brand legacy (kept for backward compat) ──
                brand: {
                    dark: '#F4F6F8',
                    primary: '#38BDF8',
                    accent: '#00F0FF',
                    surface: '#FFFFFF',
                    neon: {
                        cyan: '#14B8A6',   // mapped to teal for legacy classes
                        magenta: '#FF003C',
                        purple: '#BD00FF',
                    }
                }
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "glass": "linear-gradient(145deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.00) 100%)",
                "neon-gradient": "linear-gradient(to right, #14B8A6, #2563EB)",
            },
            boxShadow: {
                // Named by semantic role
                "neon": "0 0 10px rgba(20, 184, 166, 0.4), 0 0 20px rgba(20, 184, 166, 0.2)",
                "neon-hover": "0 0 15px rgba(20, 184, 166, 0.6), 0 0 30px rgba(20, 184, 166, 0.4)",
                "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.08)",
                "card": "0 2px 8px rgba(0,0,0,0.06)",
                "card-hover": "0 6px 20px rgba(0,0,0,0.10)",
                "btn-primary": "0 4px 14px rgba(20,184,166,0.30)",
                "btn-primary-hover": "0 6px 20px rgba(20,184,166,0.45)",
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
    safelist: [
        // Category icon colors — used dynamically via JS object in page.tsx categories array
        // JIT won't detect them without an explicit safelist entry
        'bg-blue-500/10', 'border-blue-500/30', 'text-blue-400',
        'bg-pink-500/10', 'border-pink-500/30', 'text-pink-400',
        'bg-purple-500/10', 'border-purple-500/30', 'text-purple-400',
        'bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400',
    ],
};
export default config;
