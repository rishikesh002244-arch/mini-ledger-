/**
 * End-to-end smoke test for the MiniLedger API.
 *
 * Requires a running API in a non-production environment (so the mock OTP is
 * returned as `devOtp`), e.g. `npm run dev`, then `npm run smoke`.
 */
import assert from 'node:assert/strict';

const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
const stamp = String(Date.now()).slice(-5);
const phone = `+9198765${stamp}`;
const otherPhone = `+9198766${stamp}`;

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: { code: string; message: string; details?: unknown };
}

let checks = 0;

const ok = (label: string): void => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const api = async <T>(
  path: string,
  init: RequestInit = {},
  expectedStatus = 200,
): Promise<Envelope<T>> => {
  const response = await fetch(`${API_URL}/api${path}`, init);
  const body = (await response.json()) as Envelope<T>;

  if (response.status !== expectedStatus) {
    throw new Error(
      `${init.method ?? 'GET'} ${path} → ${response.status} (expected ${expectedStatus})\n${JSON.stringify(body, null, 2)}`,
    );
  }

  return body;
};

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const authHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
});

const login = async (targetPhone: string): Promise<string> => {
  const otpResponse = await api<{ devOtp?: string; phone: string; expiresInSeconds: number }>(
    '/auth/request-otp',
    json({ phone: targetPhone }),
  );

  assert.ok(otpResponse.data.devOtp, 'devOtp should be returned outside production');
  assert.equal(otpResponse.data.phone, targetPhone);

  const verifyResponse = await api<{ token: string; user: { phone: string } }>(
    '/auth/verify-otp',
    json({ phone: targetPhone, otp: otpResponse.data.devOtp }),
  );

  assert.ok(verifyResponse.data.token.length > 20);
  assert.equal(verifyResponse.data.user.phone, targetPhone);

  return verifyResponse.data.token;
};

const run = async (): Promise<void> => {
  console.log(`\nMiniLedger API smoke test → ${API_URL}\n`);

  const health = await fetch(`${API_URL}/health`);
  assert.equal(health.status, 200, 'health endpoint should be up');
  ok('GET /health is healthy');

  const token = await login(phone);
  ok('mock OTP login issues a JWT');

  const unauthorized = await fetch(`${API_URL}/api/loans`);
  assert.equal(unauthorized.status, 401);
  ok('GET /loans without a token returns 401');

  const emptySummary = await api<{ totalLent: number; totalLoans: number }>('/loans/summary', {
    headers: authHeaders(token),
  });
  assert.equal(emptySummary.data.totalLent, 0);
  assert.equal(emptySummary.data.totalLoans, 0);
  ok('new account starts with an empty summary');

  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - 3);

  const overdueLoan = await api<{ id: string; status: string; amount: number }>(
    '/loans',
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        friend_name: 'Rahul Smoke',
        amount: 2500,
        due_date: overdueDate.toISOString(),
      }),
    },
    201,
  );
  assert.equal(overdueLoan.data.status, 'overdue');
  assert.equal(overdueLoan.data.amount, 2500);
  ok('POST /loans creates an overdue entry from JSON');

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  const form = new FormData();
  form.append('friend_name', 'Aisha Smoke');
  form.append('amount', '1200.50');
  form.append('due_date', futureDate.toISOString());
  form.append('receipt', new Blob([png], { type: 'image/png' }), 'receipt.png');

  const receiptLoan = await api<{ id: string; receiptImageUrl: string | null; status: string }>(
    '/loans',
    { method: 'POST', headers: authHeaders(token), body: form },
    201,
  );
  assert.equal(receiptLoan.data.status, 'pending');
  assert.match(receiptLoan.data.receiptImageUrl ?? '', /^\/uploads\/receipt-.+\.png$/);
  ok('POST /loans stores a multipart receipt');

  const receiptResponse = await fetch(`${API_URL}${receiptLoan.data.receiptImageUrl}`);
  assert.equal(receiptResponse.status, 200);
  assert.match(receiptResponse.headers.get('content-type') ?? '', /image\/png/);
  ok('uploaded receipt is served back as image/png');

  const list = await api<Array<{ id: string }>>('/loans?limit=100', {
    headers: authHeaders(token),
  });
  assert.equal(list.data.length, 2);
  assert.equal(list.meta?.total, 2);
  ok('GET /loans lists both entries with pagination meta');

  const overdueOnly = await api<Array<{ id: string }>>('/loans?status=overdue', {
    headers: authHeaders(token),
  });
  assert.equal(overdueOnly.data.length, 1);
  assert.equal(overdueOnly.data[0]?.id, overdueLoan.data.id);
  ok('GET /loans?status=overdue filters correctly');

  const summary = await api<{
    totalLent: number;
    totalRepaid: number;
    totalOverdue: number;
    outstanding: number;
    overdueCount: number;
  }>('/loans/summary', { headers: authHeaders(token) });
  assert.equal(summary.data.totalLent, 3700.5);
  assert.equal(summary.data.totalRepaid, 0);
  assert.equal(summary.data.totalOverdue, 2500);
  assert.equal(summary.data.outstanding, 3700.5);
  assert.equal(summary.data.overdueCount, 1);
  ok('summary totals lent, repaid, overdue, and outstanding');

  const invalid = await api<null>(
    '/loans',
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ friend_name: 'X', amount: -10, due_date: 'not-a-date' }),
    },
    422,
  );
  assert.equal(invalid.error?.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(invalid.error?.details) && invalid.error.details.length >= 3);
  ok('Zod rejects bad payloads with field-level details');

  const repaid = await api<{ loan: { isRepaid: boolean; repaidAt: string }; alreadyRepaid: boolean }>(
    `/loans/${overdueLoan.data.id}/repay`,
    { method: 'PUT', headers: authHeaders(token) },
  );
  assert.equal(repaid.data.loan.isRepaid, true);
  assert.ok(repaid.data.loan.repaidAt);
  assert.equal(repaid.data.alreadyRepaid, false);
  ok('PUT /loans/:id/repay marks a loan repaid');

  const repaidAgain = await api<{ alreadyRepaid: boolean }>(
    `/loans/${overdueLoan.data.id}/repay`,
    { method: 'PUT', headers: authHeaders(token) },
  );
  assert.equal(repaidAgain.data.alreadyRepaid, true);
  ok('repay is idempotent');

  const afterRepay = await api<{ totalRepaid: number; totalOverdue: number }>('/loans/summary', {
    headers: authHeaders(token),
  });
  assert.equal(afterRepay.data.totalRepaid, 2500);
  assert.equal(afterRepay.data.totalOverdue, 0);
  ok('summary reflects the repayment');

  const missing = await fetch(`${API_URL}/api/loans/00000000-0000-4000-8000-000000000000`, {
    headers: authHeaders(token),
  });
  assert.equal(missing.status, 404);
  ok('unknown loan returns 404');

  const otherToken = await login(otherPhone);
  const otherList = await api<Array<{ id: string }>>('/loans', {
    headers: authHeaders(otherToken),
  });
  assert.equal(otherList.data.length, 0);
  ok("second account cannot see the first account's loans");

  await api(`/loans/${receiptLoan.data.id}`, { method: 'DELETE', headers: authHeaders(token) });
  const afterDelete = await api<Array<{ id: string }>>('/loans', {
    headers: authHeaders(token),
  });
  assert.equal(afterDelete.data.length, 1);
  ok('DELETE /loans/:id removes the entry');

  console.log(`\n✅ All ${checks} checks passed.\n`);
};

run().catch((error: unknown) => {
  console.error('\n❌ Smoke test failed:\n', error);
  process.exit(1);
});
