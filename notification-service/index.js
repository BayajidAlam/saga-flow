const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq';
const INVENTORY_EXCHANGE = 'inventory_exchange';
const PAYMENT_EXCHANGE = 'payment_exchange';

let rabbitConnection, rabbitChannel;

async function connectToRabbitMQ(retries = 5) {
  while (retries > 0) {
    try {
      rabbitConnection = await amqp.connect(RABBITMQ_URL);
      rabbitChannel = await rabbitConnection.createChannel();
      await rabbitChannel.assertExchange(INVENTORY_EXCHANGE, 'fanout', { durable: false });
      await rabbitChannel.assertExchange(PAYMENT_EXCHANGE, 'fanout', { durable: false });

      const inventoryQueue = await rabbitChannel.assertQueue('', { exclusive: true });
      const paymentQueue = await rabbitChannel.assertQueue('', { exclusive: true });

      rabbitChannel.bindQueue(inventoryQueue.queue, INVENTORY_EXCHANGE, '');
      rabbitChannel.bindQueue(paymentQueue.queue, PAYMENT_EXCHANGE, '');

      console.log('Notification Service connected to RabbitMQ');
      return { inventoryQueue, paymentQueue };
    } catch (error) {
      retries -= 1;
      console.error(`Failed to connect to RabbitMQ. Retries left: ${retries}`, error);
      if (retries === 0) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
    }
  }
}

async function listenForEvents() {
  const { inventoryQueue, paymentQueue } = await connectToRabbitMQ();

  rabbitChannel.consume(inventoryQueue.queue, (msg) => {
    const inventoryUpdatedEvent = JSON.parse(msg.content.toString());
    console.log('InventoryUpdated event received:', inventoryUpdatedEvent);
    sendNotification(`Inventory updated for order ID: ${inventoryUpdatedEvent.orderId}`);
    rabbitChannel.ack(msg);
  });

  rabbitChannel.consume(paymentQueue.queue, (msg) => {
    const paymentProcessedEvent = JSON.parse(msg.content.toString());
    console.log('PaymentProcessed event received:', paymentProcessedEvent);
    sendNotification(`Payment processed for order ID: ${paymentProcessedEvent.orderId}`);
    rabbitChannel.ack(msg);
  });
}

function sendNotification(message) {
  console.log(`Notification: ${message}`);
}

listenForEvents().catch((error) => {
  console.error('Error starting Notification Service:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (rabbitChannel) await rabbitChannel.close();
  if (rabbitConnection) await rabbitConnection.close();
  console.log('Notification Service shutting down gracefully');
  process.exit(0);
});