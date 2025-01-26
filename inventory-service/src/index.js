const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq';

const ORDER_EXCHANGE = 'order_exchange';
const INVENTORY_EXCHANGE = 'inventory_exchange';
const INVENTORY_FAILED_EXCHANGE = 'inventory_failed_exchange';
const PAYMENT_FAILED_EXCHANGE = 'payment_failed_exchange';

let rabbitChannel;

async function connectToRabbitMQ() {
  const connection = await amqp.connect(RABBITMQ_URL);
  rabbitChannel = await connection.createChannel();

  await rabbitChannel.assertExchange(ORDER_EXCHANGE, 'fanout', { durable: false });
  await rabbitChannel.assertExchange(INVENTORY_EXCHANGE, 'fanout', { durable: false });
  await rabbitChannel.assertExchange(INVENTORY_FAILED_EXCHANGE, 'fanout', { durable: false });
  await rabbitChannel.assertExchange(PAYMENT_FAILED_EXCHANGE, 'fanout', { durable: false });

  const orderQueue = await rabbitChannel.assertQueue('', { exclusive: true });
  const paymentFailedQueue = await rabbitChannel.assertQueue('', { exclusive: true });

  rabbitChannel.bindQueue(orderQueue.queue, ORDER_EXCHANGE, '');
  rabbitChannel.bindQueue(paymentFailedQueue.queue, PAYMENT_FAILED_EXCHANGE, '');

  console.log('Inventory Service connected to RabbitMQ');

  // Listen for OrderCreated events
  rabbitChannel.consume(orderQueue.queue, async (msg) => {
    const orderCreatedEvent = JSON.parse(msg.content.toString());
    console.log('OrderCreated event received:', orderCreatedEvent);

    try {
      await updateInventory(orderCreatedEvent.orderId);

      const inventoryUpdatedEvent = { orderId: orderCreatedEvent.orderId };
      rabbitChannel.publish(INVENTORY_EXCHANGE, '', Buffer.from(JSON.stringify(inventoryUpdatedEvent)));
      console.log('InventoryUpdated event published:', inventoryUpdatedEvent);

      rabbitChannel.ack(msg);
    } catch (error) {
      console.error('Failed to update inventory:', error);

      const inventoryUpdateFailedEvent = { orderId: orderCreatedEvent.orderId };
      rabbitChannel.publish(INVENTORY_FAILED_EXCHANGE, '', Buffer.from(JSON.stringify(inventoryUpdateFailedEvent)));
      console.log('InventoryUpdateFailed event published:', inventoryUpdateFailedEvent);

      rabbitChannel.ack(msg);
    }
  });

  // Listen for PaymentFailed events to revert inventory
  rabbitChannel.consume(paymentFailedQueue.queue, async (msg) => {
    const paymentFailedEvent = JSON.parse(msg.content.toString());
    console.log('PaymentFailed event received:', paymentFailedEvent);

    await revertInventory(paymentFailedEvent.orderId);
    rabbitChannel.ack(msg);
  });
}

async function updateInventory(orderId) {
  console.log(`Updating inventory for order ID: ${orderId}`);
  // Simulate inventory update logic
}

async function revertInventory(orderId) {
  console.log(`Reverting inventory for order ID: ${orderId}`);
  // Simulate inventory revert logic
}

connectToRabbitMQ().catch((error) => {
  console.error('Error starting Inventory Service:', error);
  process.exit(1);
});