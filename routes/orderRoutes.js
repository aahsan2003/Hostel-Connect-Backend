const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { requireRole } = require('../middleware/requireRole');
const {
    createOrder,
    getCustomerOrders,
    getSupplierOrders,
    updateOrderStatus
} = require('../controllers/orderController');


router.post('/order', requireAuth, createOrder);


router.get('/order/customer', requireAuth, getCustomerOrders);


router.get('/order/supplier', requireAuth, requireRole('CompanyOwner'), getSupplierOrders);


router.put('/order/:id/status', requireAuth, requireRole('CompanyOwner'), updateOrderStatus);

module.exports = router;

