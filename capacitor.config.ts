import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.promarketingideas.pro247ya',
  appName: 'Pro24 7 YA',
  webDir: 'out',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com', 'apple.com']
    }
  }
};

export default config;
