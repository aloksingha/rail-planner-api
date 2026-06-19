import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ticketspro.app',
  appName: 'Tickets Pro',
  webDir: 'dist',
  server: {
    allowNavigation: ["checkout.razorpay.com", "api.razorpay.com", "accounts.google.com"],
    hostname: "ticketspro.in",
    iosScheme: "https",
    androidScheme: "https"
  },
  backgroundColor: '#000b1d',
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK'
    }
  }
};

export default config;
