# 🥛 MealkyWay - Milk Delivery Service Web Application

A complete, production-ready web application for **MealkyWay**, a milk delivery service operating in Rajshahi University. This project includes a customer-facing ordering system and a comprehensive admin panel for managing orders and customers.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Admin Panel](#admin-panel)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Design & Branding](#design--branding)

---

## ✨ Features

### Customer Features
- **Homepage**: Attractive landing page with branding, product info, and call-to-action
- **Order System**: 
  - Smart auto-fill for returning customers (by phone number)
  - Date picker for delivery date
  - Real-time price calculation
  - Form validation
- **Order Confirmation**: Success page with order details
- **Responsive Design**: Works perfectly on mobile, tablet, and desktop

### Admin Features
- **Secure Login**: Session-based authentication
- **Dashboard Statistics**:
  - Today's orders and quantity
  - Total customers and orders
- **Order Management**:
  - View all orders
  - Filter by hall, contact number, date range
  - Edit order details
  - Delete orders
- **Print Functionality**: Clean print layout for delivery lists

### Technical Features
- RESTful API architecture
- SQLite database (easy to migrate to PostgreSQL)
- Session-based authentication
- Input validation and sanitization
- CORS enabled
- Mobile-first responsive design
- Print-optimized CSS

---

## 🛠️ Tech Stack

**Backend:**
- Node.js
- Express.js
- SQLite3
- bcryptjs (password hashing)
- express-session
- dotenv

**Frontend:**
- HTML5
- CSS3 (Custom styling, no frameworks)
- Vanilla JavaScript (ES6+)
- Google Fonts (Poppins)

---

## 📁 Project Structure

```
MilkDelivery/
├── database/
│   ├── init-db.js          # Database initialization script
│   ├── db.js               # Database connection helper
│   └── mealkyway.db        # SQLite database (created on first run)
├── public/
│   ├── index.html          # Homepage
│   ├── order.html          # Order page
│   ├── confirmation.html   # Order confirmation page
│   ├── admin-login.html    # Admin login
│   ├── admin-panel.html    # Admin dashboard
│   ├── styles.css          # Complete CSS (all pages)
│   ├── app.js              # Homepage JavaScript
│   ├── order.js            # Order page JavaScript
│   ├── admin-login.js      # Login JavaScript
│   └── admin-panel.js      # Admin panel JavaScript
├── server.js               # Express server & API routes
├── package.json            # Dependencies
├── .env                    # Environment variables
├── .gitignore              # Git ignore file
└── README.md               # This file
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Step 1: Clone or Download the Project
```bash
git clone https://github.com/DewanNafis/MilkDeliveryWeb.git
cd MilkDeliveryWeb
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- express
- sqlite3
- bcryptjs
- dotenv
- cors
- body-parser
- express-session
- nodemon (dev dependency)

### Step 3: Initialize the Database
```bash
npm run init-db
```

This creates the SQLite database and tables:
- `customers` - Customer information
- `orders` - Order records
- `admin_users` - Admin credentials

**Default Admin Account (for local development / testing only):**
- Username: `admin`
- Password: `admin123`

> Important: Change the default admin credentials and SESSION_SECRET before deploying to production.

### Step 4: Configure Environment Variables
Create a `.env` file (or copy `.env.example` if provided) with the following values:
```
PORT=3000
SESSION_SECRET=mealkyway_secret_key_change_in_production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
NODE_ENV=development
```

⚠️ **Important**: Use a strong SESSION_SECRET (recommended minimum: 32 random characters) in production and change admin credentials.

---

## 🏃 Running the Application

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start at: **http://localhost:3000**

You'll see:
```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║          🥛 MealkyWay Server Running 🥛          ║
║                                                   ║
║  📍 Local:    http://localhost:3000               ║
║  🔧 API:      http://localhost:3000/api           ║
║  👤 Admin:    http://localhost:3000/admin         ║
║                                                   ║
║  Default Admin Credentials:                       ║
║  Username: admin                                  ║
║  Password: admin123                               ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```

---

## 📡 API Documentation

### Customer APIs

#### Check Customer Exists
```
GET /api/customer/:contactNumber
```
Returns customer data if exists (for auto-fill).

**Response:**
```json
{
  "exists": true,
  "customer": {
    "id": 1,
    "contact_number": "01703770715",
    "name": "John Doe",
    "hall": "শহীদ সৈয়দ নজরুল ইসলাম হল",
    "room": "201"
  }
}
```

#### Place Order
```
POST /api/order
Content-Type: application/json
```

**Request Body:**
```json
{
  "contactNumber": "01703770715",
  "name": "John Doe",
  "hall": "শহীদ সৈয়দ নজরুল ইসলাম হল",
  "room": "201",
  "quantity": 2,
  "date": "2025-11-19"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": 1,
  "message": "Order placed successfully!"
}
```

### Admin APIs

#### Admin Login
```
POST /api/admin/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

#### Admin Logout
```
POST /api/admin/logout
```

#### Check Authentication
```
GET /api/admin/check
```

#### Get Orders (with filters)
```
GET /api/admin/orders?hall=&contactNumber=&dateFrom=&dateTo=
```

**Response:**
```json
{
  "orders": [
    {
      "id": 1,
      "quantity": 2,
      "date": "2025-11-19",
      "contact_number": "01703770715",
      "name": "John Doe",
      "hall": "শহীদ সৈয়দ নজরুল ইসলাম হল",
      "room": "201"
    }
  ]
}
```

#### Get Single Order
```
GET /api/admin/orders/:id
```

#### Update Order
```
PUT /api/admin/orders/:id
Content-Type: application/json
```

**Request Body:**
```json
{
  "quantity": 3,
  "date": "2025-11-20"
}
```

#### Delete Order
```
DELETE /api/admin/orders/:id
```

#### Get Statistics
```
GET /api/admin/stats
```

**Response:**
```json
{
  "todayOrders": 5,
  "todayQuantity": 12,
  "totalCustomers": 50,
  "totalOrders": 200
}
```

---

## 👨‍💼 Admin Panel

### Accessing Admin Panel
1. Navigate to: `http://localhost:3000/admin`
2. Login with credentials:
   - Username: `admin`
   - Password: `admin123`

### Features

**Dashboard Statistics:**
- Today's orders count
- Today's total bottles
- Total registered customers
- Total orders (all time)

**Order Management:**
- View all orders in a table
- Filter by:
  - Hall name
  - Contact number
  - Date range (from - to)
- Edit order details (quantity, date)
- Delete orders
- Print order list (clean print layout)

**Security:**
- Session-based authentication
- Password hashing with bcryptjs
- Protected API routes
- Automatic redirect if not authenticated

---

## 🌐 Deployment

### Option 1: Deploy to Vercel (Recommended for Frontend)

Since Vercel doesn't support SQLite well, you'll need to:

1. **Convert to PostgreSQL or MongoDB Atlas** (recommended)
2. Install Vercel CLI:
```bash
npm install -g vercel
```

3. Deploy:
```bash
vercel
```

### Option 2: Deploy to Heroku

1. Install Heroku CLI
2. Create `Procfile`:
```
web: node server.js
```

3. Deploy:
```bash
heroku create mealkyway
git push heroku main
```

### Option 3: Deploy to Railway

1. Sign up at [railway.app](https://railway.app)
2. Connect GitHub repository
3. Railway auto-detects Node.js
4. Set environment variables
5. Deploy automatically

### Option 4: Deploy to Render

1. Sign up at [render.com](https://render.com)
2. Create new Web Service
3. Connect repository
4. Build command: `npm install`
5. Start command: `npm start`

### Option 5: VPS (DigitalOcean, Linode, AWS EC2)

1. Set up Ubuntu server
2. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Clone repository
4. Install dependencies
5. Use PM2 for process management:
```bash
npm install -g pm2
pm2 start server.js --name mealkyway
pm2 startup
pm2 save
```

6. Set up Nginx reverse proxy
7. Get SSL certificate with Let's Encrypt

---

## 🔐 Environment Variables

Create a `.env` file with:

```env
PORT=3000
SESSION_SECRET=your_secret_key_here_minimum_32_characters
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
NODE_ENV=production
```

**For Production:**
- Change `SESSION_SECRET` to a strong random string (recommended minimum: 32 characters)
- Change default admin credentials
- Set `NODE_ENV=production`
- Use PostgreSQL instead of SQLite for better scalability

---

## 🗄️ Database Schema

### customers Table
```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  hall TEXT NOT NULL,
  room TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### orders Table
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

### admin_users Table
```sql
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎨 Design & Branding

### Color Palette (from poster)
- **Primary Blue**: `#0057A3`
- **Bright Yellow**: `#F4C430`
- **White**: `#FFFFFF`
- **Light Blue**: `#E6F2FF`
- **Dark Blue**: `#003D73`

### Typography
- **Font**: Poppins (Google Fonts)
- **Weights**: 400 (Regular), 600 (Semi-Bold), 700 (Bold)

### Design Elements
- Rounded corners (border-radius: 10-20px)
- Soft shadows for depth
- Smooth transitions and hover effects
- Mobile-first responsive design
- Print-optimized layouts

### Logo Style
- Font style: Italic
- Text: "MealkyWay"
- Color: Primary Blue

---

## 📱 Pages Overview

### 1. Homepage (`/`)
- Hero section with tagline in Bengali
- Product info (250ml = 30৳)
- Delivery time (after 6 PM)
- Service area (Every Hall in RU)
- Features section
- How to order steps
- Contact information

### 2. Order Page (`/order`)
- Order form with validation
- Auto-fill for returning customers
- Date picker (default: today)
- Real-time price calculation
- Hall dropdown with all RU halls
- Responsive design

### 3. Confirmation Page (`/confirmation`)
- Success message
- Order ID display
- Delivery information
- Action buttons (Order more / Go home)
- Contact information

### 4. Admin Login (`/admin`)
- Simple login form
- Default credentials displayed (development only)
- Session-based authentication

### 5. Admin Panel (`/admin/panel`)
- Dashboard statistics
- Order filters
- Orders table with CRUD operations
- Print functionality
- Logout button

---

## 🔧 Configuration

### Changing Port
Edit `.env`:
```
PORT=5000
```

### Changing Admin Credentials
After initial setup, you can manually update in the database or create new admin user via SQL:

```sql
INSERT INTO admin_users (username, password_hash) 
VALUES ('newadmin', '<bcrypt_hash>');
```

### Migrating to PostgreSQL

1. Install PostgreSQL driver:
```bash
npm install pg
```

2. Update database connection in `database/db.js`
3. Update queries in `server.js`
4. Create PostgreSQL database and tables

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

### Database Not Created
```bash
npm run init-db
```

### Dependencies Not Installing
```bash
rm -rf node_modules package-lock.json
npm install
```

### Session Issues
- Clear browser cookies
- Check SESSION_SECRET in .env
- Restart server

---

## 📝 License

This project is created for **MealkyWay** milk delivery service.

---

## 👨‍💻 Developer Notes

### Future Enhancements
- [ ] SMS notifications for orders
- [ ] Payment gateway integration (bKash, Nagad)
- [ ] Customer order history page
- [ ] Delivery tracking
- [ ] Rating and feedback system
- [ ] Multi-admin support with roles
- [ ] Export orders to Excel/CSV
- [ ] Dark mode
- [ ] PWA (Progressive Web App) support
- [ ] Real-time notifications (WebSocket)

### Code Structure
- Clean separation of concerns
- RESTful API design
- Modular JavaScript
- Reusable CSS classes
- Comprehensive error handling
- Input validation on both client and server

---

## 📞 Support

For issues or questions:
- **Phone**: 01703770715, 01568088468
- **Website**: https://mealkyway.netlify.app

---

**Built with ❤️ for MealkyWay**

*আমরা দিচ্ছি রেডি টু ড্রিঙ্ক দুধ* 🥛