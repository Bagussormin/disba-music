import axios from 'axios';
import crypto from 'crypto';

class MidtransService {
  constructor() {
    this.serverKey = process.env.MIDTRANS_SERVER_KEY;
    this.clientKey = process.env.VITE_MIDTRANS_CLIENT_KEY;
    this.isProduction = process.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';
    this.baseUrl = this.isProduction 
      ? 'https://app.midtrans.com/api/v2' 
      : 'https://app.sandbox.midtrans.com/api/v2';
    this.snapUrl = this.isProduction 
      ? 'https://app.midtrans.com/snap/v1' 
      : 'https://app.sandbox.midtrans.com/snap/v1';
  }

  /**
   * Create Snap Token for payment (redirect to Midtrans payment page)
   */
  async createSnapToken(transactionData) {
    try {
      if (!this.serverKey) {
        throw new Error('MIDTRANS_SERVER_KEY is not configured');
      }

      const auth = Buffer.from(this.serverKey + ':').toString('base64');

      const payload = {
        transaction_details: {
          order_id: transactionData.orderId,
          gross_amount: transactionData.amount
        },
        customer_details: {
          email: transactionData.email,
          phone: transactionData.phone || '62812345678'
        },
        item_details: [
          {
            id: transactionData.itemId,
            price: transactionData.amount,
            quantity: 1,
            name: transactionData.itemName
          }
        ],
        enabled_payments: transactionData.enabledPayments || ['bank_transfer', 'qris', 'dana'],
        callbacks: {
          finish: transactionData.callbackUrl || 'http://localhost:5173/dashboard'
        }
      };

      const response = await axios.post(`${this.snapUrl}/transactions`, payload, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        token: response.data.token,
        redirectUrl: response.data.redirect_url
      };
    } catch (error) {
      console.error('Failed to create Snap token:', error.response?.data || error.message);
      throw new Error('Failed to create payment token');
    }
  }

  /**
   * Check transaction status
   */
  async checkStatus(orderId) {
    try {
      const auth = Buffer.from(this.serverKey + ':').toString('base64');

      const response = await axios.get(
        `${this.baseUrl}/${orderId}/status`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to check transaction status:', error.response?.data || error.message);
      throw new Error('Failed to check payment status');
    }
  }

  /**
   * Verify webhook signature from Midtrans
   */
  verifySignature(orderId, statusCode, grossAmount, serverKey = this.serverKey) {
    try {
      const signature = crypto
        .createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest('hex');

      return signature;
    } catch (error) {
      console.error('Failed to verify signature:', error.message);
      throw new Error('Signature verification failed');
    }
  }

  /**
   * Parse Midtrans webhook notification
   */
  async handleNotification(notification) {
    try {
      const { order_id, status_code, gross_amount, transaction_status, payment_type } = notification;

      // Verify signature
      const signature = this.verifySignature(order_id, status_code, gross_amount);

      return {
        orderId: order_id,
        statusCode: status_code,
        grossAmount: gross_amount,
        transactionStatus: transaction_status,
        paymentType: payment_type,
        signature
      };
    } catch (error) {
      console.error('Failed to handle notification:', error.message);
      throw new Error('Notification handling failed');
    }
  }

  /**
   * Get client key for frontend
   */
  getClientKey() {
    return this.clientKey;
  }
}

export default new MidtransService();
