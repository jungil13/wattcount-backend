import ElectricityRate from '../models/ElectricityRate.js';

export const setRate = async (req, res) => {
  try {
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can set electricity rates' });
    }

    const { rate_per_kwh, effective_from, effective_to } = req.body;

    if (!rate_per_kwh || !effective_from) {
      return res.status(400).json({ error: 'Rate per kWh and effective from date are required' });
    }

    if (rate_per_kwh <= 0) {
      return res.status(400).json({ error: 'Rate must be greater than 0' });
    }

    const rateId = await ElectricityRate.create({
      rate_per_kwh,
      effective_from,
      effective_to: effective_to || null,
      created_by: req.user.id
    });

    const rate = await ElectricityRate.getCurrentRate();
    res.status(201).json({ message: 'Electricity rate set successfully', rate });
  } catch (error) {
    console.error('Set rate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCurrentRate = async (req, res) => {
  try {
    const rate = await ElectricityRate.getCurrentRate();
    if (!rate) {
      return res.status(404).json({ error: 'No electricity rate configured' });
    }
    res.json(rate);
  } catch (error) {
    console.error('Get rate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllRates = async (req, res) => {
  try {
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can view all rates' });
    }

    const rates = await ElectricityRate.getAll();
    res.json(rates);
  } catch (error) {
    console.error('Get all rates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


