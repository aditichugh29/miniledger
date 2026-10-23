import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { LoanItem } from '../components/LoanItem';
import { SummaryCard } from '../components/SummaryCard';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import type { Loan, Summary } from '../types';

export function LoansScreen({ onAdd }: { onAdd: () => void }) {
  const { user, logout } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([api.listLoans(), api.summary()]);
      setLoans(l);
      setSummary(s);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const repay = async (loan: Loan) => {
    try {
      await api.markRepaid(loan.id);
      await load(); // refresh list + summary
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>MiniLedger</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
        </View>
        <Pressable onPress={logout}><Text style={styles.logout}>Log out</Text></Pressable>
      </View>

      <FlatList
        data={loans}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => <LoanItem loan={item} onRepay={repay} />}
        ListHeaderComponent={
          <>
            <SummaryCard summary={summary} />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Text style={styles.section}>Entries</Text>
          </>
        }
        ListEmptyComponent={<Text style={styles.empty}>No entries yet. Tap “+ Add” to record a loan.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />

      <Pressable style={styles.fab} onPress={onAdd}>
        <Text style={styles.fabText}>+ Add</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: colors.primary },
  phone: { color: colors.muted, fontSize: 12 },
  logout: { color: colors.red, fontWeight: '600' },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  error: { color: colors.red, marginBottom: 10 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 30 },
  fab: { position: 'absolute', right: 20, bottom: 80, backgroundColor: colors.primary, borderRadius: 28, paddingHorizontal: 22, paddingVertical: 14, elevation: 4 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
