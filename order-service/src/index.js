const express = require('express');
const amqp = require('amqplib');

const app = express();
const port = 3000;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq';
const ORDER_EXCHANGE = 'order_exchange';
const ORDER_FAILED_EXCHANGE = 'order_failed_exchange';
const INVENTORY_FAILED_EXCHANGE = 'inventory_failed_exchange';
const PAYMENT_FAILED_EXCHANGE = 'payment_failed_exchange';

let rabbitChannel;

app.use(express.json());

async function connectToRabbitMQ() {
  const connection = await amqp.connect(RABBITMQ_URL);
  rabbitChannel = await connection.createChannel();
  await rabbitChannel.assertExchange(ORDER_EXCHANGE, 'fanout', { durable: false });
  await rabbitChannel.assertExchange(ORDER_FAILED_EXCHANGE, 'fanout', { durable: false });
  await rabbitChannel.assertExchange(INVENTORY_FAILED_EXCHANGE, 'fanout', { durable: false });
  await rabbitChannel.assertExchange(PAYMENT_FAILED_EXCHANGE, 'fanout', { durable: false });

  console.log('Order Service connected to RabbitMQ');

  // Listen for failure events
  const inventoryFailedQueue = await rabbitChannel.assertQueue('', { exclusive: true });
  const paymentFailedQueue = await rabbitChannel.assertQueue('', { exclusive: true });

  rabbitChannel.bindQueue(inventoryFailedQueue.queue, INVENTORY_FAILED_EXCHANGE, '');
  rabbitChannel.bindQueue(paymentFailedQueue.queue, PAYMENT_FAILED_EXCHANGE, '');

  rabbitChannel.consume(inventoryFailedQueue.queue, (msg) => {
    const inventoryUpdateFailedEvent = JSON.parse(msg.content.toString());
    console.log('InventoryUpdateFailed event received:', inventoryUpdateFailedEvent);

    markOrderAsFailed(inventoryUpdateFailedEvent.orderId, 'Inventory update failed');
    rabbitChannel.ack(msg);
  });

  rabbitChannel.consume(paymentFailedQueue.queue, (msg) => {
    const paymentFailedEvent = JSON.parse(msg.content.toString());
    console.log('PaymentFailed event received:', paymentFailedEvent);

    markOrderAsFailed(paymentFailedEvent.orderId, 'Payment processing failed');
    rabbitChannel.ack(msg);
  });
}

function markOrderAsFailed(orderId, reason) {
  console.log(`Marking order ${orderId} as failed: ${reason}`);
  const orderFailedEvent = { orderId, reason };
  rabbitChannel.publish(ORDER_FAILED_EXCHANGE, '', Buffer.from(JSON.stringify(orderFailedEvent)));
  console.log('OrderFailed event published:', orderFailedEvent);
}

app.post('/orders', async (req, res) => {
  try {
    const order = req.body;

    if (!order || !order.id || !order.userId || !order.productId || !order.quantity) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    console.log('Order received:', order);

    const orderCreatedEvent = { orderId: order.id, userId: order.userId, productId: order.productId, quantity: order.quantity };
    rabbitChannel.publish(ORDER_EXCHANGE, '', Buffer.from(JSON.stringify(orderCreatedEvent)));
    console.log('OrderCreated event published:', orderCreatedEvent);

    res.status(201).json(order);
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

connectToRabbitMQ().catch((error) => {
  console.error('Failed to connect to RabbitMQ:', error);
  process.exit(1);
});

app.listen(port, () => {
  console.log(`Order Service running on port ${port}`);
});