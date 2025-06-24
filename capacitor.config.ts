import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.despensago.app',
  appName: 'DespensaGO',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
