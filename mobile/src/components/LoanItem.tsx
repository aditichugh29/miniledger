import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { colors } from '../theme';
import type { Loan } from '../types';
import { formatDate, formatMoney } from '../utils/format';

type Props = { loan: Loan; onRepay: (loan: Loan) => void };

// Downloads the receipt through the API (with the login token) and shows it.
function ReceiptImage({ loanId }: { loanId: string }) {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .receiptDataUri(loanId)
      .then((u) => !cancelled && setUri(u))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [loanId]);

  if (error) return <Text style={styles.receiptError}>Could not load receipt: {error}</Text>;
  if (!uri) return <ActivityIndicator style={styles.receipt} color={colors.primary} />;
  return <Image source={{ uri }} style={styles.receipt} resizeMode="cover" />;
}

export function LoanItem({ loan, onRepay }: Props) {
  const [showReceipt, setShowReceipt] = useState(false);
  const repaid = loan.status === 'REPAID';

  const confirmRepay = () =>
    Alert.alert('Mark as repaid?', `${loan.friendName} paid back ${formatMoney(loan.amount)}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, repaid', onPress: () => onRepay(loan) },
    ]);

  return (
    <View style={[styles.card, loan.isOverdue && styles.overdueCard]}>
      <View style={styles.top}>
        <Text style={styles.name}>{loan.friendName}</Text>
        <Text style={[styles.amount, repaid && styles.struck]}>{formatMoney(loan.amount)}</Text>
      </View>

      <View style={styles.top}>
        <Text style={[styles.due, loan.isOverdue && { color: colors.red }]}>
          {repaid ? 'Repaid' : loan.isOverdue ? 'Overdue · due' : 'Due'} {!repaid && formatDate(loan.dueDate)}
        </Text>
        {repaid ? (
          <Text style={styles.badgeGreen}>✓ Repaid</Text>
        ) : (
          <Pressable style={styles.button} onPress={confirmRepay}>
            <Text style={styles.buttonText}>Mark repaid</Text>
          </Pressable>
        )}
      </View>

      {loan.hasReceipt && (
        <View style={{ marginTop: 8 }}>
          <Pressable onPress={() => setShowReceipt((v) => !v)}>
            <Text style={styles.link}>{showReceipt ? 'Hide receipt' : 'View receipt'}</Text>
          </Pressable>
          {showReceipt && <ReceiptImage loanId={loan.id} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overdueCard: { backgroundColor: colors.redBg, borderColor: colors.red, borderLeftWidth: 5 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 17, fontWeight: '600', color: colors.text, flexShrink: 1 },
  amount: { fontSize: 17, fontWeight: '700', color: colors.text },
  struck: { color: colors.muted, textDecorationLine: 'line-through' },
  due: { fontSize: 13, color: colors.muted },
  button: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  badgeGreen: { color: colors.green, fontWeight: '600', fontSize: 13 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  receiptError: { color: colors.red, fontSize: 13, marginTop: 8 },
  receipt: { width: '100%', height: 180, borderRadius: 10, marginTop: 8, backgroundColor: colors.border },
});
