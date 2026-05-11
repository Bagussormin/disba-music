import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const frontendEnvPath = path.resolve(rootDir, 'frontend/.env');
const rootEnvPath = path.resolve(rootDir, '.env');
const productionEnvPath = path.resolve(rootDir, '.env.production');

dotenv.config({ path: frontendEnvPath });
dotenv.config({ path: rootEnvPath, override: false });
dotenv.config({ path: productionEnvPath, override: false });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_API_URL = process.env.SMOKE_API_URL || 'http://127.0.0.1:3101';

function assertEnv(name, value) {
  if (!value || value.startsWith('your_')) {
    throw new Error(`Missing usable ${name}.`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, attempts = 20) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch {
      // retry
    }
    await wait(750);
  }
  throw new Error('Backend server did not become healthy in time.');
}

async function apiFetch(pathname, accessToken, options = {}) {
  const response = await fetch(`${BASE_API_URL}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed for ${pathname}`);
  }
  return payload;
}

async function main() {
  assertEnv('VITE_SUPABASE_URL', SUPABASE_URL);
  assertEnv('VITE_SUPABASE_ANON_KEY', SUPABASE_ANON_KEY);
  assertEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const timestamp = Date.now();
  const adminEmail = `smoke-admin-${timestamp}@disba.test`;
  const artistEmail = `smoke-artist-${timestamp}@disba.test`;
  const password = `SmokeTest!${timestamp}`;

  let adminUserId = null;
  let artistUserId = null;
  let createdEventId = null;
  let serverProcess = null;

  try {
    const { data: adminUserData, error: adminCreateError } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true
    });
    if (adminCreateError) throw adminCreateError;
    adminUserId = adminUserData.user.id;

    const { data: artistUserData, error: artistCreateError } = await adminClient.auth.admin.createUser({
      email: artistEmail,
      password,
      email_confirm: true
    });
    if (artistCreateError) throw artistCreateError;
    artistUserId = artistUserData.user.id;

    const { error: upsertProfilesError } = await adminClient.from('profiles').upsert([
      {
        id: adminUserId,
        email: adminEmail,
        full_name: 'Smoke Admin',
        role: 'admin',
        quota: 99,
        subscription_tier: 'pro'
      },
      {
        id: artistUserId,
        email: artistEmail,
        full_name: 'Smoke Artist',
        role: 'artist',
        quota: 3,
        subscription_tier: 'pro'
      }
    ]);
    if (upsertProfilesError) throw upsertProfilesError;

    serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      env: {
        ...process.env,
        PORT: '3101'
      },
      stdio: 'pipe',
      windowsHide: true
    });

    serverProcess.stdout.on('data', (chunk) => process.stdout.write(chunk));
    serverProcess.stderr.on('data', (chunk) => process.stderr.write(chunk));

    await waitForServer(BASE_API_URL);

    const adminAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const artistAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: adminSessionData, error: adminSignInError } = await adminAuthClient.auth.signInWithPassword({
      email: adminEmail,
      password
    });
    if (adminSignInError) throw adminSignInError;

    const { data: artistSessionData, error: artistSignInError } = await artistAuthClient.auth.signInWithPassword({
      email: artistEmail,
      password
    });
    if (artistSignInError) throw artistSignInError;

    const adminToken = adminSessionData.session.access_token;
    const artistToken = artistSessionData.session.access_token;

    const profileResponse = await apiFetch('/api/profile', artistToken, {
      method: 'PATCH',
      body: JSON.stringify({
        whatsapp: '081234567890',
        instagram: '@smoke_artist',
        bank_account: '1234567890',
        bank_name: 'BCA'
      })
    });

    if (profileResponse.profile?.instagram !== '@smoke_artist') {
      throw new Error('Profile update smoke test failed.');
    }

    const createdEvent = await apiFetch('/api/admin/events', adminToken, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Smoke Test Event',
        venue: 'Smoke Venue',
        date: 'FRIDAY, 10 PM',
        description: 'Automated smoke validation event.',
        price: 'IDR 150k',
        status: 'SELLING FAST',
        color: 'bg-blue-500',
        lineup: 'Smoke Admin, Smoke Artist'
      })
    });

    createdEventId = createdEvent.event?.id;
    if (!createdEventId) {
      throw new Error('Event create smoke test failed.');
    }

    const listedEvents = await apiFetch('/api/admin/events', adminToken);
    if (!listedEvents.events?.some((event) => event.id === createdEventId)) {
      throw new Error('Event list smoke test failed.');
    }

    const updatedEvent = await apiFetch(`/api/admin/events/${createdEventId}`, adminToken, {
      method: 'PATCH',
      body: JSON.stringify({
        title: 'Smoke Test Event Updated',
        venue: 'Smoke Venue',
        date: 'SATURDAY, 11 PM',
        description: 'Updated automated smoke validation event.',
        price: 'IDR 175k',
        status: 'ALMOST FULL',
        color: 'bg-orange-500',
        lineup: 'Smoke Admin, Smoke Artist'
      })
    });

    if (updatedEvent.event?.title !== 'Smoke Test Event Updated') {
      throw new Error('Event update smoke test failed.');
    }

    await apiFetch(`/api/admin/events/${createdEventId}`, adminToken, {
      method: 'DELETE'
    });
    createdEventId = null;

    console.log('\nSmoke verification passed: profile update and admin event CRUD succeeded.\n');
  } finally {
    if (createdEventId) {
      await adminClient.from('events').delete().eq('id', createdEventId);
    }

    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }

    if (artistUserId) {
      await adminClient.auth.admin.deleteUser(artistUserId);
    }

    if (adminUserId) {
      await adminClient.auth.admin.deleteUser(adminUserId);
    }
  }
}

main().catch((error) => {
  console.error('\nSmoke verification failed:', error.message);
  process.exit(1);
});
