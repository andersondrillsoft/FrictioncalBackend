import { getPool } from '../utils/db.js';

// Get user's current subscription status
export const getCurrentSubscription = async (req, res) => {
  const userId = req.user.id;

  try {
    const pool = getPool();
    
    // First, check and handle expired subscriptions
    await handleExpiredSubscription(userId, pool);

    // Get current subscription details
    const result = await pool.query(
      `SELECT us.id, us.start_date, us.end_date, us.status,
              sp.id as plan_id, sp.name as plan_name, sp.calculations_limit,
              COUNT(c.id) as calculations_used
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       LEFT JOIN calculations c ON us.id = c.subscription_id
       WHERE us.user_id = $1 AND us.status = 'active'
       GROUP BY us.id, sp.id, sp.name, sp.calculations_limit`,
      [userId]
    );

    if (result.rows.length === 0) {
      // If no active subscription found, assign free plan
      return await assignFreePlan(userId, pool);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ message: 'Error retrieving subscription information' });
  }
};

// Update user's subscription
export const updateSubscription = async (req, res) => {
  const userId = req.user.id;
  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({ message: 'Plan ID is required' });
  }

  try {
    const pool = getPool();
    
    // Verify the plan exists and is not free
    const planResult = await pool.query(
      'SELECT id, price_usd FROM subscription_plans WHERE id = $1',
      [planId]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    if (planResult.rows[0].price_usd === 0) {
      return res.status(400).json({ message: 'Cannot manually subscribe to free plan' });
    }

    // Deactivate current subscription if exists
    await pool.query(
      `UPDATE user_subscriptions 
       SET status = 'inactive', end_date = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    // Create new subscription with one month duration
    const result = await pool.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date)
       VALUES ($1, $2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month')
       RETURNING id, start_date, end_date`,
      [userId, planId]
    );

    res.json({
      message: 'Subscription updated successfully',
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ message: 'Error updating subscription' });
  }
};

// Helper function to handle expired subscriptions
async function handleExpiredSubscription(userId, pool) {
  // Update status of expired subscriptions
  await pool.query(
    `UPDATE user_subscriptions 
     SET status = 'expired' 
     WHERE user_id = $1 
     AND status = 'active' 
     AND end_date < CURRENT_TIMESTAMP`,
    [userId]
  );
}

// Helper function to assign free plan
async function assignFreePlan(userId, pool) {
  // Get free plan
  const freePlanResult = await pool.query(
    'SELECT id, name, calculations_limit FROM subscription_plans WHERE price_usd = 0'
  );
  const freePlan = freePlanResult.rows[0];
  
  // Create new subscription with free plan
  const newSubscription = await pool.query(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date)
     VALUES ($1, $2, 'active', CURRENT_TIMESTAMP, NULL)
     RETURNING id`,
    [userId, freePlan.id]
  );

  return {
    subscription_id: newSubscription.rows[0].id,
    plan_name: freePlan.name,
    calculations_limit: freePlan.calculations_limit,
    calculations_used: 0,
    status: 'active',
    start_date: new Date(),
    end_date: null // Free plan has no end date
  };
}

// Record a calculation
export const recordCalculation = async (req, res) => {
  const userId = req.user.id;

  try {
    const pool = getPool();
    
    // Check and handle expired subscription first
    await handleExpiredSubscription(userId, pool);
    
    // Get active subscription
    const subscriptionResult = await pool.query(
      `SELECT us.id, sp.calculations_limit, COUNT(c.id) as calculations_used
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       LEFT JOIN calculations c ON us.id = c.subscription_id
       WHERE us.user_id = $1 AND us.status = 'active'
       GROUP BY us.id, sp.calculations_limit`,
      [userId]
    );

    if (subscriptionResult.rows.length === 0) {
      // If no active subscription, assign free plan and retry
      await assignFreePlan(userId, pool);
      return await recordCalculation(req, res);
    }

    const subscription = subscriptionResult.rows[0];

    // Check if user has reached calculation limit
    if (subscription.calculations_used >= subscription.calculations_limit) {
      return res.status(403).json({ 
        message: 'Calculation limit reached for current subscription',
        calculations_used: subscription.calculations_used,
        calculations_limit: subscription.calculations_limit
      });
    }

    // Record new calculation
    await pool.query(
      'INSERT INTO calculations (user_id, subscription_id) VALUES ($1, $2)',
      [userId, subscription.id]
    );

    res.json({
      message: 'Calculation recorded successfully',
      calculations_used: subscription.calculations_used + 1,
      calculations_limit: subscription.calculations_limit
    });
  } catch (error) {
    console.error('Error recording calculation:', error);
    res.status(500).json({ message: 'Error recording calculation' });
  }
};

// Get available subscription plans
export const getSubscriptionPlans = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, name, price_usd, calculations_limit FROM subscription_plans ORDER BY price_usd'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    res.status(500).json({ message: 'Error retrieving subscription plans' });
  }
}; 