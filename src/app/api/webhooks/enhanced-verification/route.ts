import { POST as handleStatusUpdate } from '@/app/api/partner/enhanced-verification/status/route';

export async function POST(request: Request) {
  return handleStatusUpdate(request);
}
