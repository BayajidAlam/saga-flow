const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq';
const INVENTORY_EXCHANGE = 'inventory_exchange';
const PAYMENT_EXCHANGE = 'payment_exchange';
const ORDER_FAILED_EXCHANGE = 'order_failed_exchange';

let rabbitChannel;

async function connectToRabbitMQ() {
  const connection = await amqp.connect(RABBITMQ_URL);
  rabbitChannel = await connection.createChannel();
  await rabbitChannel.assertExchange(INVENTORY_EXCHANGE, 'fanout', { durable: false });
  await rabbitChannel.assertExchange(PAYMENT_EXCHANGE, 'fanout', { durable: false });
  await rabbitChannel.assertExchange(ORDER_FAILED_EXCHANGE, 'fanout', { durable: false });

  // Create queues and bind them to exchanges
  const inventoryQueue = await rabbitChannel.assertQueue('', { exclusive: true });
  const paymentQueue = await rabbitChannel.assertQueue('', { exclusive: true });
  const orderFailedQueue = await rabbitChannel.assertQueue('', { exclusive: true });

  rabbitChannel.bindQueue(inventoryQueue.queue, INVENTORY_EXCHANGE, '');
  rabbitChannel.bindQueue(paymentQueue.queue, PAYMENT_EXCHANGE, '');
  rabbitChannel.bindQueue(orderFailedQueue.queue, ORDER_FAILED_EXCHANGE, '');

  console.log('Notification Service connected to RabbitMQ');

  // Listen for InventoryUpdated events
  rabbitChannel.consume(inventoryQueue.queue, (msg) => {
    try {
      const inventoryUpdatedEvent = JSON.parse(msg.content.toString());
      console.log('InventoryUpdated event received:', inventoryUpdatedEvent);
      sendNotification(`Inventory updated for order ID: ${inventoryUpdatedEvent.orderId}`);
      rabbitChannel.ack(msg);
    } catch (error) {
      console.error('Error processing InventoryUpdated event:', error);
      rabbitChannel.nack(msg);
    }
  });

  // Listen for PaymentProcessed events
  rabbitChannel.consume(paymentQueue.queue, (msg) => {
    try {
      const paymentProcessedEvent = JSON.parse(msg.content.toString());
      console.log('PaymentProcessed event received:', paymentProcessedEvent);
      sendNotification(`Payment processed for order ID: ${paymentProcessedEvent.orderId}`);
      rabbitChannel.ack(msg);
    } catch (error) {
      console.error('Error processing PaymentProcessed event:', error);
      rabbitChannel.nack(msg);
    }
  });

  // Listen for OrderFailed events
  rabbitChannel.consume(orderFailedQueue.queue, (msg) => {
    try {
      const orderFailedEvent = JSON.parse(msg.content.toString());
      console.log('OrderFailed event received:', orderFailedEvent);
      sendNotification(`Order failed for order ID: ${orderFailedEvent.orderId}. Reason: ${orderFailedEvent.reason}`);
      rabbitChannel.ack(msg);
    } catch (error) {
      console.error('Error processing OrderFailed event:', error);
      rabbitChannel.nack(msg);
    }
  });
}

function sendNotification(message) {
  console.log(`Notification: ${message}`);
  // You can extend this to send emails, SMS, or write to a file.
}

connectToRabbitMQ().catch((error) => {
  console.error('Error starting Notification Service:', error);
  process.exit(1);
});