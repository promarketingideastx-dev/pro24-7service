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
                // Light Mode Palette
                brand: {
                    dark: '#F4F6F8',
                    primary: '#38BDF8',
                    accent: '#00F0FF',
                    surface: '#FFFFFF',
                    neon: {
                        cyan: '#00F0FF',
                        magenta: '#FF003C',
                        purple: '#BD00FF',
                    }
                }
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "glass": "linear-gradient(145deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.00) 100%)",
                "glass-hover": "linear-gradient(145deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.01) 100%)",
                "neon-gradient": "linear-gradient(to right, #00F0FF, #BD00FF)",
            },
            boxShadow: {
                "neon": "0 0 10px rgba(0, 240, 255, 0.5), 0 0 20px rgba(0, 240, 255, 0.3)",
                "neon-hover": "0 0 15px rgba(0, 240, 255, 0.7), 0 0 30px rgba(0, 240, 255, 0.5)",
                "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
                "card": "0 4px 12px rgba(0,0,0,0.06)",
                "card-hover": "0 8px 24px rgba(0,0,0,0.10)",
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
};
export default config;
