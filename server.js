require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { Parser } = require('json2csv');
const fs = require('fs');
const supabase = require('./database/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files with no caching
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'mealkyway_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// ==================== CUSTOMER & ORDER APIs ====================

// Check if customer exists by contact number
app.get('/api/customer/:contactNumber', async (req, res) => {
  try {
    const { contactNumber } = req.params;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('contact_number', contactNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json({ exists: false });
      }
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ exists: true, customer: data });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new customer
app.post('/api/customer', async (req, res) => {
  try {
    const { contactNumber, name, hall, room } = req.body;

    if (!contactNumber || !name || !hall || !room) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([{
        contact_number: contactNumber,
        name,
        hall,
        room
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to create customer' });
    }

    res.json({ success: true, customer: data });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Place an order
app.post('/api/order', async (req, res) => {
  try {
    const { contactNumber, name, hall, room, quantity, date } = req.body;

    if (!contactNumber || !quantity) {
      return res.status(400).json({ error: 'Contact number and quantity are required' });
    }

    // Check if customer exists
    const { data: existingCustomer, error: lookupError } = await supabase
      .from('customers')
      .select('*')
      .eq('contact_number', contactNumber)
      .single();

    let customer = existingCustomer;

    // If customer doesn't exist, create new customer
    if (lookupError && lookupError.code === 'PGRST116') {
      if (!name || !hall || !room) {
        return res.status(400).json({ error: 'Name, hall, and room are required for new customers' });
      }

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
      // Customer exists - check if information needs to be updated
      const infoChanged = customer.name !== name || 
                         customer.hall !== hall || 
                         customer.room !== room;
      
      if (infoChanged) {
        console.log('Customer info changed, updating...');
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

    // Create order
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

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get admin user
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session
    req.session.adminUser = {
      id: admin.id,
      username: admin.username
    };

    res.json({ success: true, message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check admin authentication
app.get('/api/admin/check', (req, res) => {
  if (req.session.adminUser) {
    res.json({ authenticated: true, user: req.session.adminUser });
  } else {
    res.json({ authenticated: false });
  }
});

// ==================== ADMIN PANEL ROUTES ====================

// Admin panel page (with auth check)
app.get('/admin/panel', (req, res) => {
  if (!req.session.adminUser) {
    return res.redirect('/admin-login.html');
  }
  console.log('Admin panel accessed by:', req.session.adminUser.username);
  res.sendFile(path.join(__dirname, 'public', 'admin-panel.html'));
});

// ==================== ADMIN ORDERS API ====================

// Get all orders with customer details and filters
app.get('/api/admin/orders', async (req, res) => {
  try {
    if (!req.session.adminUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { date, institution, hall, customer } = req.query;

    // Build query with sorting by date and ID descending
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
      .order('created_at', { ascending: false });

    // Apply filters
    if (date) {
      query = query.eq('date', date);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Orders fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    // Apply additional filters in JavaScript (since Supabase doesn't support nested filters easily)
    let filteredOrders = orders;

    // Filter by institution
    if (institution) {
      filteredOrders = filteredOrders.filter(order => 
        order.customers && order.customers.hall.startsWith(institution + ' -')
      );
    }

    // Filter by hall
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

    // Flatten the order data to include customer fields at the top level
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

    console.log('Orders found:', flattenedOrders.length);
    res.json({ orders: flattenedOrders });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get order statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    if (!req.session.adminUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get today's orders
    const { data: todayOrders, error: todayError } = await supabase
      .from('orders')
      .select('quantity')
      .eq('date', today);

    if (todayError) {
      console.error('Today stats error:', todayError);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    // Get all orders
    const { data: allOrders, error: allError } = await supabase
      .from('orders')
      .select('quantity');

    if (allError) {
      console.error('All orders stats error:', allError);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    const todayOrdersCount = todayOrders.length;
    const todayQuantity = todayOrders.reduce((sum, order) => sum + order.quantity, 0);
    const totalOrders = allOrders.length;
    const totalQuantity = allOrders.reduce((sum, order) => sum + order.quantity, 0);

    const stats = {
      todayOrders: todayOrdersCount,
      todayQuantity: todayQuantity,
      totalOrders: totalOrders,
      totalQuantity: totalQuantity
    };

    console.log('Stats:', stats);
    res.json(stats);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single order by ID
app.get('/api/admin/orders/:id', async (req, res) => {
  try {
    if (!req.session.adminUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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

    // Flatten the order data
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

// Update an order
app.put('/api/admin/orders/:id', async (req, res) => {
  try {
    if (!req.session.adminUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { quantity, date } = req.body;

    if (!quantity || !date) {
      return res.status(400).json({ error: 'Quantity and date are required' });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({
        quantity: parseInt(quantity),
        date
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return res.status(500).json({ error: 'Failed to update order' });
    }

    res.json({ success: true, message: 'Order updated successfully', order: data });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete an order
app.delete('/api/admin/orders/:id', async (req, res) => {
  try {
    if (!req.session.adminUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete order' });
    }

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== NOTICE APIs ====================

// Path to notice file
const NOTICE_FILE = path.join(__dirname, 'data/notice.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize notice file if it doesn't exist
if (!fs.existsSync(NOTICE_FILE)) {
  fs.writeFileSync(NOTICE_FILE, JSON.stringify({ 
    content: 'Welcome to Milky Way! 🥛 Fresh milk delivery available daily to all RU and RMC halls!',
    updated_at: new Date().toISOString()
  }));
}

// Get current notice
app.get('/api/notice', (req, res) => {
  try {
    const data = fs.readFileSync(NOTICE_FILE, 'utf8');
    const notice = JSON.parse(data);
    res.json({ notice: notice.content || '' });
  } catch (err) {
    console.error('Notice read error:', err);
    res.json({ notice: '' });
  }
});

// Update notice (admin only)
app.put('/api/admin/notice', isAuthenticated, (req, res) => {
  try {
    const { content } = req.body;
    
    console.log('Updating notice with content:', content);
    
    fs.writeFileSync(NOTICE_FILE, JSON.stringify({ 
      content, 
      updated_at: new Date().toISOString() 
    }, null, 2));
    
    console.log('Notice updated successfully');
    res.json({ success: true, message: 'Notice updated successfully' });
  } catch (err) {
    console.error('Notice update error:', err);
    res.status(500).json({ error: 'Failed to update notice' });
  }
});

// ==================== EXPORT APIs ====================

// Export orders as CSV
app.get('/api/admin/export', isAuthenticated, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Orders fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    // Flatten the data for CSV
    const flattenedOrders = orders.map(order => ({
      'Order ID': order.id,
      'Customer Name': order.customers?.name || 'N/A',
      'Contact Number': order.customers?.contact_number || 'N/A',
      'Hall': order.customers?.hall || 'N/A',
      'Room': order.customers?.room || 'N/A',
      'Quantity': order.quantity,
      'Delivery Date': order.delivery_date,
      'Order Date': new Date(order.created_at).toLocaleString('en-GB', { 
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }));

    const parser = new Parser();
    const csv = parser.parse(flattenedOrders);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== ROUTE HANDLERS ====================

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Order page
app.get('/order', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'order.html'));
});

// Confirmation page
app.get('/confirmation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'confirmation.html'));
});

// Admin login page
app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// Admin route (redirect to login)
app.get('/admin', (req, res) => {
  if (req.session.adminUser) {
    res.redirect('/admin/panel');
  } else {
    res.redirect('/admin-login');
  }
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Mealky Way server running on http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin/panel`);
  console.log(`🔗 Using Supabase PostgreSQL database`);
});
