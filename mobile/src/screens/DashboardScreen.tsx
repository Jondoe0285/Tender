import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { loadDashboard, type DashboardPayload } from '../api/workspace';
import { formatUkDate } from '../constants';
import type { Route } from '../navigation/types';
import { Body, Card, Metric, Notice, PrimaryButton, SecondaryButton, Title } from '../ui';

export function DashboardScreen({ go }: { go: (route: Route) => void }) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard().then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load the dashboard.'));
  }, []);

  if (error) return <Notice>{error}</Notice>;
  if (!data) return <Body>Loading dashboard…</Body>;

  return (
    <View>
      <Title>This week</Title>
      <Body>Review quotes that are waiting, then quote the matches you have unlocked.</Body>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 }}>
        <Metric label="Open tenders" value={data.metrics.openTenders} />
        <Metric label="Quotes to review" value={data.metrics.quotesToReview} />
        <Metric label="Awarded" value={data.metrics.awardedCount} />
        <Metric label="Quotes received" value={data.metrics.quotesReceivedCount} />
      </View>
      {data.capabilities.canRaiseTender && <PrimaryButton label="Create tender" onPress={() => go({ name: 'createTender' })} />}
      <Card>
        <Title>Buying</Title>
        {data.buyingQueue.length === 0 ? <Body>No buying actions this week.</Body> : data.buyingQueue.map((item) => (
          <SecondaryButton key={`buy-${item.tenderId}-${item.action}`} label={`${item.reference} · ${item.action} · ${formatUkDate(item.due)}`} onPress={() => go({ name: 'tender', tenderId: item.tenderId, intent: 'buy' })} />
        ))}
      </Card>
      <Card>
        <Title>Supplying</Title>
        {data.supplyingQueue.length === 0 ? <Body>No supplying actions this week.</Body> : data.supplyingQueue.map((item) => (
          <SecondaryButton key={`supply-${item.tenderId}-${item.action}`} label={`${item.reference} · ${item.action} · ${formatUkDate(item.due)}`} onPress={() => go({ name: 'tender', tenderId: item.tenderId, intent: 'supply' })} />
        ))}
      </Card>
    </View>
  );
}
