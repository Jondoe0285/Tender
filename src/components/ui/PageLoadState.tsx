import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function PageLoadState({
  error,
  onRetry,
}: {
  error?: string | null;
  onRetry?: () => void;
}) {
  if (error) {
    return (
      <Card className="mx-auto max-w-2xl">
        <p role="alert" className="text-sm font-semibold text-attention">{error}</p>
        {onRetry && (
          <Button className="mt-4" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <p role="status" aria-live="polite" className="text-sm text-concrete-grey">Loading…</p>
    </Card>
  );
}
