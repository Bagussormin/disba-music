import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import midtransClient from 'midtrans-client';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Load Config from .env or fallback
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-YOUR_SERVER_KEY';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Verify Supabase keys
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn("⚠️ Warning: Supabase URL/Key is missing. Database operations will fail.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Setup Midtrans Snap API
const snap = new midtransClient.Snap({
  isProduction: process.env.VITE_MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: process.env.VITE_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-YOUR_CLIENT_KEY'
});

// Endpoint: Generate Snap Token
app.post('/api/checkout', async (req, res) => {
  try {
    const { gross_amount, customer_details, user_id } = req.body;
    
    // Unique identifier for payload matching
    const order_id = `DBM-${Date.now()}`;

    const parameter = {
      transaction_details: {
        order_id,
        gross_amount
      },
      customer_details,
    };

    // First fetch snap token from Midtrans
    const transaction = await snap.createTransaction(parameter);
    const snap_token = transaction.token;
    
    // Then persist securely into our local PG instance via Supabase
    const { error: dbError } = await supabase.from('transactions').insert({
      midtrans_order_id: order_id,
      user_id,
      amount: gross_amount,
      status: 'pending',
      type: 'UPGRADE_PRO',
      snap_token: snap_token
    });

    if (dbError) {
      console.error("❌ Supabase Error Detail:", JSON.stringify(dbError, null, 2));
      return res.status(500).json({ error: "Failed to create transaction record. Check server logs." });
    }

    res.json({
      token: snap_token,
      redirect_url: transaction.redirect_url,
      order_id
    });
  } catch (error) {
    console.error("Checkout Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Midtrans Webhook Notification Handler
app.post('/api/midtrans-webhook', async (req, res) => {
  console.log("🔔 Incoming webhook from midtrans:", req.body);
  try {
    const notificationJson = req.body;
    
    // Ensure accurate verification
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = notificationJson;
    
    // Security Mechanism: SHA-512 verification to ensure payload authenticity
    const generatedSig = crypto.createHash('sha512').update(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY).digest('hex');
    
    if (generatedSig !== signature_key) {
      console.log("⚠️ Webhook Signature Mismatch for Order:", order_id);
      return res.status(403).json({ error: "Invalid signature payload" });
    }

    let mappedStatus = 'pending';
    if (transaction_status == 'capture' || transaction_status == 'settlement') {
      mappedStatus = 'settlement';
    } else if (transaction_status == 'cancel' || transaction_status == 'deny' || transaction_status == 'expire') {
      mappedStatus = 'expire';
    }

    // Update database status 
    const { data: trx, error: trxError } = await supabase
      .from('transactions')
      .update({ status: mappedStatus })
      .eq('midtrans_order_id', order_id)
      .select('user_id')
      .single();

    if (trxError && trxError.code !== 'PGRST116') { // Ignore zero-row hit if that happens without failing webhook entirely
      console.error("Failed to commit transaction updates to DB:", trxError);
      return res.status(500).json({ message: "DB Internal Server Error" });
    }

    // Perform privilege elevation operation if payment was successfully captured
    if (mappedStatus === 'settlement' && trx?.user_id) {
      const { error: upgradeError } = await supabase
        .from('profiles')
        .update({ subscription_tier: 'pro' })
        .eq('id', trx.user_id);
        
      if (upgradeError) {
        console.error(`Error elevating user ${trx.user_id} to PRO:`, upgradeError);
      } else {
        console.log(`✅ Operations Complete. User ${trx.user_id} has been elevated to PRO.`);
      }
    }

    res.status(200).json({ message: "Notification Handled" });
  } catch (error) {
    console.error("Webhook architectural error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Dedicated backend server running on http://localhost:${PORT}`);
});
