import { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async () => {
    setError('');
    if (!/^[6-9]\d{9}$/.test(phone)) return setError('Enter a valid 10-digit mobile number');
    setBusy(true);
    try {
      await api.requestOtp(phone);
      setOtpSent(true);
      setCooldown(30);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError('');
    if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit OTP');
    setBusy(true);
    try {
      await login(phone, otp);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.logo}>MiniLedger</Text>
      <Text style={styles.tagline}>Keep track of money you lent to friends</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Mobile number</Text>
        <View style={styles.phoneRow}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="9876543210"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
            editable={!otpSent}
          />
        </View>

        {otpSent && (
          <>
            <Text style={[styles.label, { marginTop: 14 }]}>OTP</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
              autoFocus
            />
            <Text style={styles.hint}>Demo mode: the OTP is printed in the backend server log.</Text>
          </>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.button, busy && { opacity: 0.6 }]} disabled={busy} onPress={otpSent ? verify : sendOtp}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{otpSent ? 'Verify & log in' : 'Send OTP'}</Text>}
        </Pressable>

        {otpSent && (
          <View style={styles.linksRow}>
            <Pressable onPress={() => { setOtpSent(false); setOtp(''); setError(''); }}>
              <Text style={styles.link}>Change number</Text>
            </Pressable>
            <Pressable disabled={cooldown > 0 || busy} onPress={sendOtp}>
              <Text style={[styles.link, cooldown > 0 && { color: colors.muted }]}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 20 },
  logo: { fontSize: 34, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  tagline: { color: colors.muted, textAlign: 'center', marginBottom: 28, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 20, elevation: 2 },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefix: { fontSize: 16, color: colors.text, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text,
  },
  hint: { color: colors.muted, fontSize: 12, marginTop: 6 },
  error: { color: colors.red, marginTop: 12 },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 18 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  link: { color: colors.primary, fontWeight: '600' },
});
