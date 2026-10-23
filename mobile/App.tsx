import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AddLoanScreen } from './src/screens/AddLoanScreen';
import { LoansScreen } from './src/screens/LoansScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { colors } from './src/theme';

function Root() {
  const { user, loading } = useAuth();
  const [adding, setAdding] = useState(false);
  // Changing this key remounts the list so it reloads after adding an entry.
  const [listKey, setListKey] = useState(0);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;
  if (!user) return <LoginScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {adding ? (
        <AddLoanScreen
          onCancel={() => setAdding(false)}
          onDone={() => { setAdding(false); setListKey((k) => k + 1); }}
        />
      ) : (
        <LoansScreen key={listKey} onAdd={() => setAdding(true)} />
      )}
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Root />
    </AuthProvider>
  );
}
