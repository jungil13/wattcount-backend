import Consumption from '../models/Consumption.js';
import ElectricityRate from '../models/ElectricityRate.js';
import Bill from '../models/Bill.js';
import User from '../models/User.js';

export const createConsumption = async (req, res) => {
  try {
    const { user_id, reading_date, current_reading, previous_reading, billing_cycle, notes } = req.body;

    if (!reading_date || !current_reading) {
      return res.status(400).json({ error: 'Reading date and current reading are required' });
    }

    // Main users can create for any user, shared users can only create for themselves
    const targetUserId = user_id || req.user.id;
    if (req.user.role !== 'main_user' && parseInt(targetUserId) !== req.user.id) {
      return res.status(403).json({ error: 'You can only create consumption records for yourself' });
    }

    // Get previous reading: use provided value, or get from latest record, or default to 0
    let prevReading = previous_reading;
    if (prevReading === undefined || prevReading === null) {
      const latestRecord = await Consumption.getLatestByUserId(targetUserId);
      prevReading = latestRecord ? latestRecord.current_reading : 0;
    }
    const consumption_kwh = current_reading - prevReading;

    // Allow negative consumption (meter reset or replacement scenario)
    // No validation error for negative consumption

    const recordId = await Consumption.create({
      user_id: targetUserId,
      reading_date,
      previous_reading: prevReading,
      current_reading,
      consumption_kwh,
      billing_cycle: billing_cycle || null,
      notes: notes || null
    });

    // Auto-generate bill if billing cycle is provided
    if (billing_cycle) {
      const currentRate = await ElectricityRate.getCurrentRate();
      if (currentRate) {
        // Calculate: (current_reading - previous_reading) * rate_per_kwh
        const calculated_kwh = current_reading - prevReading;
        const total_amount = calculated_kwh * currentRate.rate_per_kwh;
        await Bill.create({
          user_id: targetUserId,
          consumption_record_id: recordId,
          billing_cycle,
          consumption_kwh: calculated_kwh,
          rate_per_kwh: currentRate.rate_per_kwh,
          total_amount
        });
      }
    }

    const record = await Consumption.findById(recordId);
    res.status(201).json({ message: 'Consumption record created successfully', record });
  } catch (error) {
    console.error('Create consumption error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyConsumption = async (req, res) => {
  try {
    const { limit, user_id } = req.query;
    // Main users can view any user's consumption, shared users can only view their own
    const targetUserId = user_id && req.user.role === 'main_user' ? parseInt(user_id) : req.user.id;
    
    if (req.user.role !== 'main_user' && parseInt(user_id) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const records = await Consumption.findByUserId(targetUserId, limit);
    res.json(records);
  } catch (error) {
    console.error('Get consumption error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllConsumption = async (req, res) => {
  try {
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can view all consumption records' });
    }

    const records = await Consumption.getAllForMainUser(req.user.id);
    res.json(records);
  } catch (error) {
    console.error('Get all consumption error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getConsumptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Consumption.findById(id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Main users can view any record, shared users can only view their own
    if (req.user.role !== 'main_user' && record.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(record);
  } catch (error) {
    console.error('Get consumption by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateConsumption = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const record = await Consumption.findById(id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Only main users can update records
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can update consumption records' });
    }

    // Recalculate consumption if readings are updated
    if (updates.current_reading !== undefined || updates.previous_reading !== undefined) {
      const prevReading = updates.previous_reading !== undefined 
        ? updates.previous_reading 
        : record.previous_reading;
      const currReading = updates.current_reading !== undefined 
        ? updates.current_reading 
        : record.current_reading;
      
      updates.consumption_kwh = currReading - prevReading;
      
      if (updates.consumption_kwh < 0) {
        return res.status(400).json({ error: 'Invalid readings' });
      }
    }

    const updated = await Consumption.update(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const updatedRecord = await Consumption.findById(id);
    res.json({ message: 'Record updated successfully', record: updatedRecord });
  } catch (error) {
    console.error('Update consumption error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteConsumption = async (req, res) => {
  try {
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can delete consumption records' });
    }

    const { id } = req.params;
    const deleted = await Consumption.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Delete consumption error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getConsumptionSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.query.user_id || req.user.id;

    // Main users can view any user's summary, shared users can only view their own
    if (req.user.role !== 'main_user' && parseInt(userId) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const summary = await Consumption.getSummary(userId, startDate, endDate);
    res.json(summary);
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


