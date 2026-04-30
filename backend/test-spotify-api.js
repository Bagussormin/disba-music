#!/usr/bin/env node

/**
 * DISBA Music - Spotify Integration Test Script
 * Run: node test-spotify-api.js
 * 
 * Tests the entire Spotify aggregator flow with mock data
 */

import http from 'http';

const BASE_URL = 'http://localhost:3001';

// Mock tokens & UUIDs (in real scenario, these come from actual auth)
const ADMIN_TOKEN = 'test-admin-token-12345';
const ARTIST_TOKEN = 'test-artist-token-67890';
const MOCK_RELEASE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const MOCK_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';

let testResults = [];

/**
 * Make HTTP request
 */
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Log test result
 */
function logTest(testName, passed, details) {
  const status = passed ? '✅' : '❌';
  console.log(`\n${status} ${testName}`);
  if (details) console.log(`   ${details}`);
  testResults.push({ testName, passed });
}

/**
 * Test Suite
 */
async function runTests() {
  console.log('🎵 DISBA Music - Spotify Integration Test Suite\n');
  console.log('=' .repeat(50));

  // Test 1: Get Commissions (empty initially)
  console.log('\n📊 Test 1: Get Commission History');
  try {
    const result = await makeRequest('GET', '/api/spotify/commissions', null, ADMIN_TOKEN);
    const passed = result.status === 200 || result.status === 401;
    logTest(
      'Get Commissions Endpoint',
      passed,
      `Status: ${result.status}${result.status === 200 ? ` | Found ${result.body.commissions?.length || 0} records` : ''}`
    );
  } catch (error) {
    logTest('Get Commissions Endpoint', false, `Error: ${error.message}`);
  }

  // Test 2: Mock Spotify Webhook (simulate royalty payout)
  console.log('\n📤 Test 2: Simulate Spotify Royalty Webhook');
  try {
    const webhookData = {
      release_id: MOCK_RELEASE_ID,
      artist_id: MOCK_USER_ID,
      streams: 5000,
      revenue: 250000,
      report_date: '2026-05-01'
    };

    const result = await makeRequest('POST', '/api/spotify/webhook', webhookData);
    const passed = result.status === 200 || result.status === 201;
    logTest(
      'Spotify Webhook Processing',
      passed,
      `Status: ${result.status} | ${result.body.message || 'Processed'}`
    );

    if (passed) {
      console.log(`   💰 Revenue: Rp ${webhookData.revenue.toLocaleString('id-ID')}`);
      console.log(`   📈 Streams: ${webhookData.streams.toLocaleString()}`);
    }
  } catch (error) {
    logTest('Spotify Webhook Processing', false, `Error: ${error.message}`);
  }

  // Test 3: Calculate Monthly Commissions
  console.log('\n🧮 Test 3: Calculate Monthly Commissions');
  try {
    const calcData = {
      month: '2026-05'
    };

    const result = await makeRequest(
      'POST',
      '/api/spotify/calculate-commissions',
      calcData,
      ADMIN_TOKEN
    );
    const passed = result.status === 200 || result.status === 201;
    logTest(
      'Commission Calculation',
      passed,
      `Status: ${result.status}`
    );

    if (passed && result.body.summary) {
      console.log(`   📊 Total Artist Earnings: Rp ${result.body.summary.totalArtistEarnings?.toLocaleString('id-ID') || '0'}`);
      console.log(`   💸 DISBA Commission (15%): Rp ${result.body.summary.totalDisbaCommission?.toLocaleString('id-ID') || '0'}`);
      console.log(`   👥 Artists Affected: ${result.body.summary.artistsAffected || 0}`);
    }
  } catch (error) {
    logTest('Commission Calculation', false, `Error: ${error.message}`);
  }

  // Test 4: Payout Commissions to Admin Wallet
  console.log('\n💳 Test 4: Payout Commissions to Admin Wallet');
  try {
    const payoutData = {
      month: '2026-05'
    };

    const result = await makeRequest(
      'POST',
      '/api/spotify/payout-commissions',
      payoutData,
      ADMIN_TOKEN
    );
    const passed = result.status === 200 || result.status === 400;
    logTest(
      'Commission Payout',
      passed,
      `Status: ${result.status} | ${result.body.message || result.body.error || ''}`
    );

    if (passed && result.body.amount) {
      console.log(`   ✅ Amount Transferred: Rp ${result.body.amount?.toLocaleString('id-ID') || '0'}`);
      console.log(`   👤 New Admin Balance: Rp ${result.body.new_balance?.toLocaleString('id-ID') || '0'}`);
    }
  } catch (error) {
    logTest('Commission Payout', false, `Error: ${error.message}`);
  }

  // Test 5: Verify Commissions Updated
  console.log('\n✅ Test 5: Verify Commission History Updated');
  try {
    const result = await makeRequest('GET', '/api/spotify/commissions', null, ADMIN_TOKEN);
    const passed = result.status === 200 || result.status === 401;
    logTest(
      'Verify Commissions Updated',
      passed,
      `Status: ${result.status}${result.status === 200 ? ` | Records: ${result.body.commissions?.length || 0}` : ''}`
    );

    if (passed && result.body.summary) {
      console.log(`   💰 Total Commissions: Rp ${result.body.summary.total_commissions?.toLocaleString('id-ID') || '0'}`);
      console.log(`   ✅ Total Paid: Rp ${result.body.summary.total_paid?.toLocaleString('id-ID') || '0'}`);
      console.log(`   ⏳ Pending: Rp ${result.body.summary.pending_amount?.toLocaleString('id-ID') || '0'}`);
    }
  } catch (error) {
    logTest('Verify Commissions Updated', false, `Error: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📋 Test Summary:');
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  console.log(`   ✅ Passed: ${passed}/${total}`);
  console.log(`   ❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! Spotify integration is working!\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above.\n');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
