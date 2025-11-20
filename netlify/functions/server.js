const express = require('express');
const serverless = require('serverless-http');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const supabase = require('../../database/supabase');

// Simple auth check - just verify the username:password combo on each request
// This works better for serverless than sessions or token stores
async function verifyAdminToken(token) {
  if (!token || !token.includes(':')) return null;
  
  try {
    const [username, password] = Buffer.from(token, 'base64').toString().split(':');
    
    const { data: admin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (!admin) return null;
    
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) return null;
    
    return { id: admin.id, username: admin.username };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for serverless
app.use(session({
  secret: process.env.SESSION_SECRET || 'mealky-way-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// ==================== CUSTOMER API ====================

// Check if customer exists
app.get('/api/customer/:contactNumber', async (req, res) => {
  try {
    const { contactNumber } = req.params;
    
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('contact_number', contactNumber)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.json({ exists: false });
    }

    if (error) {
      console.error('Customer lookup error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ 
      exists: true, 
      customer: {
        name: customer.name,
        hall: customer.hall,
        room: customer.room
      }
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Place order
app.post('/api/order', async (req, res) => {
  try {
    const { name, contactNumber, hall, room, quantity, date } = req.body;

    if (!name || !contactNumber || !hall || !room || !quantity) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if customer exists
    let { data: customer, error: lookupError } = await supabase
      .from('customers')
      .select('*')
      .eq('contact_number', contactNumber)
      .maybeSingle();

    if (!customer && !lookupError) {
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert([{
          contact_number: contactNumber,
          name,
          hall,
          room
        }])
        .select()
        .single();

      if (createError) {
        console.error('Customer creation error:', createError);
        return res.status(500).json({ error: 'Failed to create customer' });
      }

      customer = newCustomer;
    } else if (lookupError) {
      console.error('Customer lookup error:', lookupError);
      return res.status(500).json({ error: 'Database error' });
    } else {
      const infoChanged = customer.name !== name || 
                         customer.hall !== hall || 
                         customer.room !== room;
      
      if (infoChanged) {
        const { data: updatedCustomer, error: updateError } = await supabase
          .from('customers')
          .update({
            name,
            hall,
            room
          })
          .eq('id', customer.id)
          .select()
          .single();

        if (updateError) {
          console.error('Customer update error:', updateError);
          return res.status(500).json({ error: 'Failed to update customer information' });
        }

        customer = updatedCustomer;
      }
    }

    const orderDate = date || new Date().toISOString().split('T')[0];
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        customer_id: customer.id,
        quantity: parseInt(quantity),
        date: orderDate
      }])
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return res.status(500).json({ error: 'Failed to place order' });
    }

    res.json({ 
      success: true, 
      message: 'Order placed successfully',
      orderId: order.id,
      order: {
        ...order,
        customer_name: customer.name
      }
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== ADMIN AUTHENTICATION ====================

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create a simple token with username:password encoded
    // This is safe because it's only used for auth verification, not storage
    const token = Buffer.from(`${username}:${password}`).toString('base64');

    req.session.adminUser = {
      id: admin.id,
      username: admin.username
    };

    res.json({ 
      success: true, 
      message: 'Login successful',
      token: token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/admin/check', async (req, res) => {
  // Check token
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const userData = await verifyAdminToken(token);
    
    if (userData) {
      return res.json({ authenticated: true, user: userData });
    }
  }
  
  // Fallback to session
  if (req.session.adminUser) {
    return res.json({ authenticated: true, user: req.session.adminUser });
  }
  
  res.json({ authenticated: false });
});

// ==================== ADMIN ORDERS API ====================

// Auth middleware
async function isAuthenticated(req, res, next) {
  // Check token
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const userData = await verifyAdminToken(token);
    
    if (userData) {
      req.adminUser = userData;
      return next();
    }
  }
  
  // Check session
  if (req.session.adminUser) {
    req.adminUser = req.session.adminUser;
    return next();
  }
  
  return res.status(401).json({ error: 'Unauthorized' });
}

app.get('/api/admin/orders', isAuthenticated, async (req, res) => {
  try {

    const { date, institution, hall, customer } = req.query;

    let query = supabase
      .from('orders')
      .select(`
        *,
        customers (
          id,
          name,
          contact_number,
          hall,
          room
        )
      `)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (date) {
      query = query.eq('date', date);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Orders fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    let filteredOrders = orders;

    if (institution) {
      filteredOrders = filteredOrders.filter(order => 
        order.customers && order.customers.hall.startsWith(institution + ' -')
      );
    }

    if (hall) {
      filteredOrders = filteredOrders.filter(order => 
        order.customers && order.customers.hall.toLowerCase().includes(hall.toLowerCase())
      );
    }

    if (customer) {
      filteredOrders = filteredOrders.filter(order =>
        order.customers && order.customers.name.toLowerCase().includes(customer.toLowerCase())
      );
    }

    const flattenedOrders = filteredOrders.map(order => ({
      id: order.id,
      customer_id: order.customer_id,
      quantity: order.quantity,
      date: order.date,
      created_at: order.created_at,
      name: order.customers?.name || 'Unknown',
      contact_number: order.customers?.contact_number || 'Unknown',
      hall: order.customers?.hall || 'Unknown',
      room: order.customers?.room || 'Unknown'
    }));

    const today = new Date().toISOString().split('T')[0];
    const todayOrders = flattenedOrders.filter(o => o.date === today);
    const stats = {
      todayOrders: todayOrders.length,
      todayQuantity: todayOrders.reduce((sum, o) => sum + o.quantity, 0),
      totalOrders: flattenedOrders.length,
      totalQuantity: flattenedOrders.reduce((sum, o) => sum + o.quantity, 0)
    };

    res.json({ 
      orders: flattenedOrders,
      stats 
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/orders/:id', isAuthenticated, async (req, res) => {
  try {

    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          id,
          name,
          contact_number,
          hall,
          room
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Order fetch error:', error);
      return res.status(404).json({ error: 'Order not found' });
    }

    const flattenedOrder = {
      id: order.id,
      customer_id: order.customer_id,
      quantity: order.quantity,
      date: order.date,
      created_at: order.created_at,
      name: order.customers?.name || 'Unknown',
      contact_number: order.customers?.contact_number || 'Unknown',
      hall: order.customers?.hall || 'Unknown',
      room: order.customers?.room || 'Unknown'
    };

    res.json({ order: flattenedOrder });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/orders/:id', isAuthenticated, async (req, res) => {
  try {

    const { id } = req.params;
    const { quantity, date } = req.body;

    const { data: order, error } = await supabase
      .from('orders')
      .update({ quantity: parseInt(quantity), date })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Order update error:', error);
      return res.status(500).json({ error: 'Failed to update order' });
    }

    res.json({ success: true, message: 'Order updated successfully', order });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/orders/:id', isAuthenticated, async (req, res) => {
  try {

    const { id } = req.params;

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Order deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete order' });
    }

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export as serverless function
module.exports.handler = serverless(app);
