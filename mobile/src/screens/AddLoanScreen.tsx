import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { api } from '../api/client';
import { colors } from '../theme';
import { inDays } from '../utils/format';

type Props = { onDone: () => void; onCancel: () => void };

export function AddLoanScreen({ onDone, onCancel }: Props) {
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(inDays(7));
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
    if (!result.canceled) setReceipt(result.assets[0]);
  };

  const submit = async () => {
    setError('');
    const amountNum = Number(amount);
    if (!friendName.trim()) return setError('Enter your friend’s name');
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) return setError('Enter an amount greater than 0');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return setError('Due date must look like 2026-11-30');

    setBusy(true);
    let loan;
    try {
      loan = await api.createLoan({ friendName: friendName.trim(), amount: amountNum, dueDate });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      return;
    }
    // The entry is saved now. If only the receipt fails, do not stay here (that causes duplicate entries).
    if (receipt) {
      try {
        if (!receipt.base64) throw new Error('Could not read the photo. Please pick it again');
        await api.uploadReceipt(loan.id, receipt.base64);
      } catch (e) {
        Alert.alert('Entry saved', `The receipt could not be uploaded: ${(e as Error).message}`);
      }
    }
    onDone();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>New entry</Text>

        <Text style={styles.label}>Friend’s name</Text>
        <TextInput style={styles.input} placeholder="e.g. Riya" value={friendName} onChangeText={setFriendName} />

        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput style={styles.input} placeholder="500" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />

        <Text style={styles.label}>Due date (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} placeholder="2026-11-30" value={dueDate} onChangeText={setDueDate} autoCapitalize="none" />
        <View style={styles.chips}>
          {[7, 14, 30].map((d) => (
            <Pressable key={d} style={styles.chip} onPress={() => setDueDate(inDays(d))}>
              <Text style={styles.chipText}>+{d} days</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.receiptBtn} onPress={pickReceipt}>
          <Text style={styles.receiptText}>{receipt ? 'Change receipt photo' : '📎 Attach receipt photo (optional)'}</Text>
        </Pressable>
        {receipt && <Image source={{ uri: receipt.uri }} style={styles.preview} />}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.button, busy && { opacity: 0.6 }]} disabled={busy} onPress={submit}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save entry</Text>}
        </Pressable>
        <Pressable onPress={onCancel} disabled={busy} style={{ alignItems: 'center', marginTop: 14 }}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 56 },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 12 },
  label: { fontSize: 13, color: colors.muted, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text,
  },
  chips: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { backgroundColor: '#EEF2FF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  receiptBtn: { marginTop: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  receiptText: { color: colors.primary, fontWeight: '600' },
  preview: { width: '100%', height: 160, borderRadius: 10, marginTop: 10 },
  error: { color: colors.red, marginTop: 14 },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancel: { color: colors.muted, fontWeight: '600' },
});
