import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { Summary } from '../types';
import { formatMoney } from '../utils/format';

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, color ? { color } : null]}>{formatMoney(value)}</Text>
    </View>
  );
}

export function SummaryCard({ summary }: { summary: Summary | null }) {
  const s = summary ?? { totalLent: 0, totalRepaid: 0, totalPending: 0, overdueAmount: 0, overdueCount: 0 };
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Total lent</Text>
      <Text style={styles.big}>{formatMoney(s.totalLent)}</Text>
      <View style={styles.row}>
        <Stat label="Repaid" value={s.totalRepaid} color={colors.green} />
        <Stat label="Still owed" value={s.totalPending} />
        <Stat label="Overdue" value={s.overdueAmount} color={s.overdueAmount > 0 ? colors.red : undefined} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  title: { color: colors.muted, fontSize: 13 },
  big: { color: colors.text, fontSize: 32, fontWeight: '700', marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1 },
  label: { color: colors.muted, fontSize: 12 },
  value: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 2 },
});
