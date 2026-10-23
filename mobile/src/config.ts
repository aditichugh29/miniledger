// Where the backend runs.
//  - Android emulator: http://10.0.2.2:4000  (10.0.2.2 = your computer)
//  - Real phone (Expo Go): http://<your-computer-LAN-IP>:4000, e.g. http://192.168.1.5:4000
//  - Deployed backend: its https URL
// You can also set it without editing code:  EXPO_PUBLIC_API_URL=http://192.168.1.5:4000 npx expo start
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000';
