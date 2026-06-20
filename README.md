# ShopEase - E-Commerce Web Application

## Tech Stack
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT Auth
- **Frontend**: Vanilla HTML/CSS/JS (no framework)

## Project Structure
```
ecommerce/
├── backend/
│   ├── models/         # User, Product, Order schemas
│   ├── routes/         # auth, products, orders APIs
│   ├── middleware/      # JWT protect + admin guard
│   ├── server.js
│   ├── .env
│   └── package.json
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js
```

## Setup

### Prerequisites
- Node.js >= 16
- MongoDB running locally (or provide a MongoDB Atlas URI)

### Backend
```bash
cd backend
npm install
# Edit .env: set MONGO_URI and JWT_SECRET
npm run dev
```
Server starts on http://localhost:5000

### Frontend
Open `frontend/index.html` directly in a browser, or serve with:
```bash
npx serve frontend
```
README
cd C:\Users\deepa\Downloads\ecommerce
git add .
git commit -m "Final deployment"
git push

## API Endpoints

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/products | Public |
| POST | /api/products | Admin |
| PUT | /api/products/:id | Admin |
| DELETE | /api/products/:id | Admin |
| POST | /api/orders | User |
| GET | /api/orders/my | User |
| GET | /api/orders | Admin |
| PUT | /api/orders/:id/status | Admin |

## Features
- Product catalog with search & category filter
- Add to cart, update quantities, remove items
- Checkout with shipping address
- Order tracking with status badges
- JWT-based login/register
- Role-based access: Admin can manage products & update order statuses
- Persistent cart via localStorage
