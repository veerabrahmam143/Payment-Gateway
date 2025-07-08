const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(express.json());
app.use(cors());

// ✅ MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'user',
  password: 'password',
  database: 'payments_db'
});

db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err);
  } else {
    console.log('✅ MySQL connected');
  }
});

// ✅ Razorpay instance
const razorpay = new Razorpay({
  key_id: 'rzp_test_pkMpDXvQ2tzoZ1',
  key_secret: 'ZQZinqyerisus1qGht1Ab1Hw'
});

// ✅ Create Order
app.post('/createOrder', async (req, res) => {
  try {
    const { amount, currency } = req.body;
    if (!amount || !currency) {
      return res.status(400).json({ error: 'Amount and currency required' });
    }

    const options = {
      amount: amount * 100,
      currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    // ✅ Save order to payments table with NULL payment_id and signature
    db.query(
      'INSERT INTO payments (razorpay_order_id, amount, currency, status) VALUES (?, ?, ?, ?)',
      [order.id, options.amount, currency, 'created'],
      (err) => {
        if (err) console.error('❌ MySQL Insert Error (Order):', err);
      }
    );

    res.json({ ...order, key_id: razorpay.key_id });
  } catch (err) {
    console.error('❌ Order Creation Error:', err);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

// ✅ Verify Payment
app.post('/verifyPayment', (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment details' });
  }

  // ✅ Create signature for verification
  const hmac = crypto.createHmac('sha256', razorpay.key_secret);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const expectedSignature = hmac.digest('hex');
  const verified = expectedSignature === razorpay_signature;

  // ✅ Update the payment record in the same table
  db.query(
    `UPDATE payments 
     SET razorpay_payment_id = ?, razorpay_signature = ?, verified = ?, status = ? 
     WHERE razorpay_order_id = ?`,
    [razorpay_payment_id, razorpay_signature, verified, verified ? 'paid' : 'failed', razorpay_order_id],
    (err, result) => {
      if (err) {
        console.error('❌ MySQL Update Error (Payment):', err);
        return res.status(500).json({ error: 'Database update failed' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (verified) {
        return res.json({ success: true, message: '✅ Payment verified successfully' });
      } else {
        return res.status(400).json({ success: false, message: '❌ Invalid signature' });
      }
    }
  );
});

// ✅ Start Server
app.listen(5000, () => {
  console.log('🚀 Server running on http://localhost:5000');
});
