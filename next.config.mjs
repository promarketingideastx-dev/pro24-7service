/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['firebasestorage.googleapis.com'],
    },
    webpack: (config, { isServer }) => {
        // Alias undici globally to avoid parsing errors
        config.resolve.alias['undici'] = false;

        if (!isServer) {
            // Force browser build for libraries using exports (like firebase)
            config.resolve.conditionNames = ['browser', 'module', 'import'];
            // Force browser build for libraries using mainFields
            config.resolve.mainFields = ['browser', 'module', 'main'];
        }
        return config;
    },
};

export default nextConfig;
