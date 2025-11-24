const Order = require('../models/Order');
const Hostel = require('../models/Hostel');
const mongoose = require('mongoose');
const { createNotification } = require('./notificationController');


const createOrder = async (req, res, next) => {
    try {
        const { items, shippingInfo } = req.body;

        
        if (!items || !Array.isArray(items) || items.length === 0) {
            const error = new Error('Order must contain at least one item');
            error.status = 400;
            return next(error);
        }

        if (!shippingInfo || !shippingInfo.fullName || !shippingInfo.address || !shippingInfo.city || !shippingInfo.phone) {
            const error = new Error('Shipping information is required');
            error.status = 400;
            return next(error);
        }

        const customerId = req.user._id;
        let totalAmount = 0;
        const orderItems = [];

        
        for (const item of items) {
            if (!item.productId || !item.quantity || !item.price) {
                const error = new Error('Each item must have productId, quantity, and price');
                error.status = 400;
                return next(error);
            }

            
            if (!mongoose.Types.ObjectId.isValid(item.productId)) {
                const error = new Error(`Invalid product ID: ${item.productId}`);
                error.status = 400;
                return next(error);
            }

            
            const product = await Hostel.findById(item.productId);
            if (!product) {
                const error = new Error(`Hostel not found: ${item.productId}`);
                error.status = 404;
                return next(error);
            }

            
            if (product.listingType !== 'marketplace') {
                const error = new Error('Orders can only be placed for marketplace products');
                error.status = 400;
                return next(error);
            }

            
            if (product.status !== 'Approved') {
                const error = new Error('Cannot order unapproved products');
                error.status = 400;
                return next(error);
            }

            
            const itemTotal = item.price * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                product: product._id,
                quantity: item.quantity,
                price: item.price
            });
        }

        
        const order = new Order({
            customer: customerId,
            items: orderItems,
            shippingInfo: {
                fullName: shippingInfo.fullName,
                address: shippingInfo.address,
                city: shippingInfo.city,
                postalCode: shippingInfo.postalCode || '',
                phone: shippingInfo.phone
            },
            totalAmount,
            paymentMethod: 'Cash on Delivery',
            status: 'Pending'
        });

        await order.save();

        
        await order.populate('customer', 'username email fullName');
        await order.populate('items.product', 'name price images owner listingType');
        await order.populate('items.product.owner', 'username email fullName');

        
        const supplierIds = new Set();
        order.items.forEach(item => {
            if (item.product && item.product.owner && item.product.owner._id) {
                supplierIds.add(item.product.owner._id.toString());
            }
        });

        
        for (const supplierId of supplierIds) {
            const productNames = order.items
                .filter(item => item.product && item.product.owner && item.product.owner._id.toString() === supplierId)
                .map(item => item.product.name)
                .filter(Boolean)
                .join(', ') || 'your products';

            try {
                await createNotification(
                    supplierId,
                    'info',
                    `New order received for: ${productNames}`,
                    order._id,
                    'Order'
                );
            } catch (notifError) {
                console.error('Error creating notification for supplier:', notifError);
                
            }
        }

        res.status(201).json({
            message: 'Order created successfully',
            order
        });
    } catch (error) {
        next(error);
    }
};


const getCustomerOrders = async (req, res, next) => {
    try {
        const customerId = req.user._id;

        const orders = await Order.find({ customer: customerId })
            .populate('items.product', 'name price images owner listingType')
            .populate('items.product.owner', 'username email fullName')
            .sort({ createdAt: -1 });

        res.status(200).json({ orders });
    } catch (error) {
        next(error);
    }
};



const getSupplierOrders = async (req, res, next) => {
    try {
        const supplierId = req.user._id;

        
        const orders = await Order.find()
            .populate('items.product', 'name price images owner listingType')
            .populate('items.product.owner', 'username email fullName')
            .populate('customer', 'username email fullName')
            .sort({ createdAt: -1 });

        
        const supplierOrders = orders.filter(order => {
            return order.items.some(item =>
                item.product &&
                item.product.owner &&
                item.product.owner._id.toString() === supplierId.toString()
            );
        });

        
        const filteredOrders = supplierOrders.map(order => {
            const filteredItems = order.items.filter(item =>
                item.product &&
                item.product.owner &&
                item.product.owner._id.toString() === supplierId.toString()
            );
            return {
                ...order.toObject(),
                items: filteredItems
            };
        });

        res.status(200).json({ orders: filteredOrders });
    } catch (error) {
        next(error);
    }
};


const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error('Invalid order ID');
            error.status = 400;
            return next(error);
        }

        
        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            error.status = 400;
            return next(error);
        }

        
        const order = await Order.findById(id)
            .populate('items.product', 'owner');

        if (!order) {
            const error = new Error('Order not found');
            error.status = 404;
            return next(error);
        }

        
        const supplierId = req.user._id.toString();
        const ownsHostel = order.items.some(item =>
            item.product &&
            item.product.owner &&
            item.product.owner.toString() === supplierId
        );

        if (!ownsHostel) {
            const error = new Error('You can only update orders for your own products');
            error.status = 403;
            return next(error);
        }

        
        const previousStatus = order.status;

        
        order.status = status;
        await order.save();

        
        await order.populate('customer', 'username email fullName');
        await order.populate('items.product', 'name price images owner listingType');
        await order.populate('items.product.owner', 'username email fullName');

        
        if (previousStatus !== status && order.customer) {
            const productNames = order.items
                .map(item => item.product?.name)
                .filter(Boolean)
                .join(', ') || 'your products';

            let notificationMessage = '';
            let notificationType = 'info';

            if (status === 'Processing') {
                notificationMessage = `Your order for "${productNames}" is now being processed.`;
                notificationType = 'info';
            } else if (status === 'Shipped') {
                notificationMessage = `Your order for "${productNames}" has been shipped!`;
                notificationType = 'success';
            } else if (status === 'Delivered') {
                notificationMessage = `Your order for "${productNames}" has been delivered!`;
                notificationType = 'success';
            } else if (status === 'Cancelled') {
                notificationMessage = `Your order for "${productNames}" has been cancelled.`;
                notificationType = 'error';
            } else {
                notificationMessage = `Your order for "${productNames}" status has been updated to ${status}.`;
            }

            if (notificationMessage) {
                try {
                    await createNotification(
                        order.customer._id,
                        notificationType,
                        notificationMessage,
                        order._id,
                        'Order'
                    );
                } catch (notifError) {
                    console.error('Error creating notification:', notifError);
                    
                }
            }
        }

        res.status(200).json({
            message: 'Order status updated successfully',
            order
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrder,
    getCustomerOrders,
    getSupplierOrders,
    updateOrderStatus
};

