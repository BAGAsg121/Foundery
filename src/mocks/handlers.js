import { http, HttpResponse } from 'msw';

const mockAdminUser = {
  id: 1,
  email: 'admin@example.com',
  roles: ['admin'],
  permissions: ['can_submit_forms']
};

export const handlers = [
  // Login handler
  http.post('http://localhost:5000/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json();

    // Mock admin user
    if (email === 'admin@example.com' && password === 'admin123') {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: mockAdminUser
      });
    }

    return new HttpResponse(null, { status: 401 });
  }),

  // Token verification handler (used on page reload)
  http.get('http://localhost:5000/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader === 'Bearer mock-jwt-token') {
      return HttpResponse.json({ user: mockAdminUser });
    }
    return new HttpResponse(null, { status: 401 });
  }),

  // Signup handler (returns pending approval)
  http.post('http://localhost:5000/api/auth/signup', async ({ request }) => {
    const { email } = await request.json();
    return HttpResponse.json({
      message: 'Account created. Verification pending. You will be notified once approved.',
      userId: 99
    }, { status: 201 });
  }),

  // Admin onboardings list handler
  http.get('http://localhost:5000/api/onboarding/admin/onboardings', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader === 'Bearer mock-jwt-token') {
      return HttpResponse.json([
        { id: 1, email: 'rahul.sharma@eko.co.in', mobile: '9876543210', pan: 'ABCDE1234F', org_name: 'Eko India', status: 'completed', created_at: '2026-02-15T10:00:00Z' },
        { id: 2, email: 'priya.verma@eko.co.in', mobile: '9123456789', pan: 'FGHIJ5678K', org_name: 'Eko Payments', status: 'pending', created_at: '2026-02-16T12:30:00Z' },
        { id: 3, email: 'amit.kumar@eko.co.in', mobile: '9988776655', pan: 'KLMNO9012P', org_name: 'Eko Finance', status: 'pending', created_at: '2026-02-17T09:15:00Z' },
        { id: 4, email: 'neha.gupta@eko.co.in', mobile: '9876501234', pan: 'PQRST3456U', org_name: 'Eko Digital', status: 'in_review', created_at: '2026-02-17T14:00:00Z' },
        { id: 5, email: 'vikram.singh@eko.co.in', mobile: '9012345678', pan: 'UVWXY7890Z', org_name: 'Eko Services', status: 'completed', created_at: '2026-02-18T08:45:00Z' },
      ]);
    }
    return new HttpResponse(null, { status: 401 });
  }),

  // Pending users handler
  http.get('http://localhost:5000/api/auth/pending-users', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader === 'Bearer mock-jwt-token') {
      return HttpResponse.json([
        { id: 10, email: 'new.user1@example.com', created_at: '2026-02-18T10:00:00Z' },
        { id: 11, email: 'new.user2@example.com', created_at: '2026-02-19T08:30:00Z' },
      ]);
    }
    return new HttpResponse(null, { status: 401 });
  }),

  // Approve user handler
  http.put('http://localhost:5000/api/auth/approve/:userId', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader === 'Bearer mock-jwt-token') {
      return HttpResponse.json({ message: 'User approved successfully' });
    }
    return new HttpResponse(null, { status: 401 });
  }),

  // ─── Onboarding Processing Endpoints (replaces n8n webhooks) ───

  // Step 1: Verify Mobile
  http.post('http://localhost:5000/api/onboarding/verify-mobile', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== 'Bearer mock-jwt-token') {
      return new HttpResponse(null, { status: 401 });
    }
    const { mobile } = await request.json();
    return HttpResponse.json({
      found: true,
      customerid: '100' + mobile.slice(-4)
    });
  }),

  // Step 3a: Verify PAN
  http.post('http://localhost:5000/api/onboarding/verify-pan', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== 'Bearer mock-jwt-token') {
      return new HttpResponse(null, { status: 401 });
    }
    const { mobile, email, pan } = await request.json();
    return HttpResponse.json({
      nullified: { user_profile: true, ekocsp: true, customer_detail: true },
      assigned: { user_profile: true, ekocsp: true, customer_detail: true },
      customerid: '100' + mobile.slice(-4)
    });
  }),

  // Step 3b: Update Org Name
  http.post('http://localhost:5000/api/onboarding/update-org-name', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== 'Bearer mock-jwt-token') {
      return new HttpResponse(null, { status: 401 });
    }
    const { changePanName } = await request.json();
    return HttpResponse.json({
      bcid: 'MOCK-BCID-001',
      messageSuffixUpdated: true,
      customerid: '10001234',
      accountActivated: true,
      orgNameUpdated: !!changePanName
    });
  }),

  // Step 4: Final Confirmation
  http.post('http://localhost:5000/api/onboarding/final-confirm', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== 'Bearer mock-jwt-token') {
      return new HttpResponse(null, { status: 401 });
    }
    const { mobile } = await request.json();
    return HttpResponse.json({
      cspcode: 'CSP' + mobile.slice(-6),
      adminInfo: { bcid: 'MOCK-BCID-001', displayname: 'Mock Admin', cellnumber: mobile },
      emailSent: false,
      message: 'Onboarding completed. Email/SSH not configured — skipping agreement email.'
    });
  }),

  // Onboarding Submit
  http.post('http://localhost:5000/api/onboarding/submit', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== 'Bearer mock-jwt-token') {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({ message: 'Onboarding submitted successfully' }, { status: 201 });
  }),
];