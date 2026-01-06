import Bill from '../models/Bill.js';
import Consumption from '../models/Consumption.js';
import ElectricityRate from '../models/ElectricityRate.js';
import Payment from '../models/Payment.js';

export const createBill = async (req, res) => {
  try {
    const { user_id, consumption_record_id, billing_cycle, due_date } = req.body;

    if (!consumption_record_id || !billing_cycle) {
      return res.status(400).json({ error: 'Consumption record ID and billing cycle are required' });
    }

    // Only main users can create bills
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can create bills' });
    }

    const consumption = await Consumption.findById(consumption_record_id);
    if (!consumption) {
      return res.status(404).json({ error: 'Consumption record not found' });
    }

    const targetUserId = user_id || consumption.user_id;

    // Get current rate
    const rate = await ElectricityRate.getCurrentRate();
    if (!rate) {
      return res.status(400).json({ error: 'No electricity rate configured' });
    }

    // Calculate total: (current_reading - previous_reading) * rate_per_kwh
    const consumption_kwh = consumption.current_reading - (consumption.previous_reading || 0);
    const total_amount = consumption_kwh * rate.rate_per_kwh;

    const billId = await Bill.create({
      user_id: targetUserId,
      consumption_record_id,
      billing_cycle,
      consumption_kwh: consumption_kwh,
      rate_per_kwh: rate.rate_per_kwh,
      total_amount,
      due_date: due_date || null
    });

    const bill = await Bill.findById(billId);
    res.status(201).json({ message: 'Bill created successfully', bill });
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyBills = async (req, res) => {
  try {
    const { limit } = req.query;
    let bills;
    
    // Shared users can see all bills (main user + other shared users)
    if (req.user.role === 'shared_user') {
      bills = await Bill.getAllForSharedUser(req.user.id);
    } else {
      bills = await Bill.findByUserId(req.user.id, limit);
    }
    
    // Calculate payment status for each bill
    const billsWithPayments = await Promise.all(
      bills.map(async (bill) => {
        const totalPaid = await Bill.calculateTotalPaid(bill.id);
        const remaining = bill.total_amount - totalPaid;
        
        let status = 'unpaid';
        if (totalPaid >= bill.total_amount) {
          status = 'paid';
        } else if (totalPaid > 0) {
          status = 'partial';
        }

        return {
          ...bill,
          total_paid: totalPaid,
          remaining_amount: remaining,
          status
        };
      })
    );

    res.json(billsWithPayments);
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllBills = async (req, res) => {
  try {
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can view all bills' });
    }

    const bills = await Bill.getAllForMainUser(req.user.id);
    
    // Calculate payment status for each bill
    const billsWithPayments = await Promise.all(
      bills.map(async (bill) => {
        const totalPaid = await Bill.calculateTotalPaid(bill.id);
        const remaining = bill.total_amount - totalPaid;
        
        let status = 'unpaid';
        if (totalPaid >= bill.total_amount) {
          status = 'paid';
        } else if (totalPaid > 0) {
          status = 'partial';
        }

        return {
          ...bill,
          total_paid: totalPaid,
          remaining_amount: remaining,
          status
        };
      })
    );

    res.json(billsWithPayments);
  } catch (error) {
    console.error('Get all bills error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id);

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Main users can view any bill, shared users can only view their own
    if (req.user.role !== 'main_user' && bill.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const totalPaid = await Bill.calculateTotalPaid(id);
    const remaining = bill.total_amount - totalPaid;
    const payments = await Payment.findByBillId(id);

    let status = 'unpaid';
    if (totalPaid >= bill.total_amount) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    res.json({
      ...bill,
      total_paid: totalPaid,
      remaining_amount: remaining,
      status,
      payments
    });
  } catch (error) {
    console.error('Get bill by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBill = async (req, res) => {
  try {
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can update bills' });
    }

    const { id } = req.params;
    const updates = req.body;

    // Recalculate if rate or consumption changes
    if (updates.rate_per_kwh || updates.consumption_kwh) {
      const bill = await Bill.findById(id);
      if (!bill) {
        return res.status(404).json({ error: 'Bill not found' });
      }

      const rate = updates.rate_per_kwh || bill.rate_per_kwh;
      const consumption = updates.consumption_kwh || bill.consumption_kwh;
      updates.total_amount = rate * consumption;
    }

    const updated = await Bill.update(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const bill = await Bill.findById(id);
    res.json({ message: 'Bill updated successfully', bill });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteBill = async (req, res) => {
  try {
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can delete bills' });
    }

    const { id } = req.params;
    const deleted = await Bill.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBillsByCycle = async (req, res) => {
  try {
    const { billing_cycle } = req.query;
    if (!billing_cycle) {
      return res.status(400).json({ error: 'Billing cycle is required' });
    }

    let bills;
    if (req.user.role === 'main_user') {
      bills = await Bill.getByBillingCycle(billing_cycle);
    } else {
      // Shared users can see all bills for their group
      const allBills = await Bill.getAllForSharedUser(req.user.id);
      bills = allBills.filter(b => b.billing_cycle === billing_cycle);
    }

    // Calculate payment status
    const billsWithPayments = await Promise.all(
      bills.map(async (bill) => {
        const totalPaid = await Bill.calculateTotalPaid(bill.id);
        const remaining = bill.total_amount - totalPaid;
        
        let status = 'unpaid';
        if (totalPaid >= bill.total_amount) {
          status = 'paid';
        } else if (totalPaid > 0) {
          status = 'partial';
        }

        return {
          ...bill,
          total_paid: totalPaid,
          remaining_amount: remaining,
          status
        };
      })
    );

    res.json(billsWithPayments);
  } catch (error) {
    console.error('Get bills by cycle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


