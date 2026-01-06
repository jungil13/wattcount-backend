import Payment from '../models/Payment.js';
import Bill from '../models/Bill.js';

export const createPayment = async (req, res) => {
  try {
    const { bill_id, amount, payment_date, payment_method, reference_number, notes } = req.body;

    if (!bill_id || !amount || !payment_date) {
      return res.status(400).json({ error: 'Bill ID, amount, and payment date are required' });
    }

    const bill = await Bill.findById(bill_id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Main users can create payments for any bill, shared users can only pay their own bills
    if (req.user.role !== 'main_user' && bill.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only make payments for your own bills' });
    }

    const totalPaid = await Bill.calculateTotalPaid(bill_id);
    if (totalPaid + amount > bill.total_amount) {
      return res.status(400).json({ error: 'Payment amount exceeds bill total' });
    }

    const paymentId = await Payment.create({
      bill_id,
      amount,
      payment_date,
      payment_method: payment_method || null,
      reference_number: reference_number || null,
      notes: notes || null
    });

    // Update bill status
    const newTotalPaid = totalPaid + amount;
    let status = 'unpaid';
    if (newTotalPaid >= bill.total_amount) {
      status = 'paid';
    } else if (newTotalPaid > 0) {
      status = 'partial';
    }
    await Bill.updateStatus(bill_id, status);

    const payment = await Payment.findById(paymentId);
    res.status(201).json({ message: 'Payment recorded successfully', payment });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPaymentsByBill = async (req, res) => {
  try {
    const { bill_id } = req.params;
    const bill = await Bill.findById(bill_id);

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Main users can view any bill's payments, shared users can only view their own
    if (req.user.role !== 'main_user' && bill.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const payments = await Payment.findByBillId(bill_id);
    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.getByUserId(req.user.id);
    res.json(payments);
  } catch (error) {
    console.error('Get my payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Main users can view any payment, shared users can only view their own
    if (req.user.role !== 'main_user' && payment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Get payment by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


