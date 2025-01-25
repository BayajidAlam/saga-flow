const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq';
const ORDER_EXCHANGE = 'order_exchange';
const INVENTORY_EXCHANGE = 'inventory_exchange';

let rabbitConnection, rabbitChannel;

async function connectToRabbitMQ(retries = 5) {
  while (retries > 0) {
    try {
      rabbitConnection = await amqp.connect(RABBITMQ_URL);
      rabbitChannel = await rabbitConnection.createChannel();
      await rabbitChannel.assertExchange(ORDER_EXCHANGE, 'fanout', { durable: false });
      await rabbitChannel.assertExchange(INVENTORY_EXCHANGE, 'fanout', { durable: false });

      const queue = await rabbitChannel.assertQueue('', { exclusive: true });
      rabbitChannel.bindQueue(queue.queue, ORDER_EXCHANGE, '');

      console.log('Inventory Service connected to RabbitMQ');
      return queue;
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

async function listenForOrderCreated() {
  const queue = await connectToRabbitMQ();

  rabbitChannel.consume(queue.queue, async (msg) => {
    const orderCreatedEvent = JSON.parse(msg.content.toString());
    console.log('OrderCreated event received:', orderCreatedEvent);

    // Simulate inventory update
    await updateInventory(orderCreatedEvent.orderId);

    // Publish InventoryUpdated event
    const inventoryUpdatedEvent = { orderId: orderCreatedEvent.orderId };
    rabbitChannel.publish(INVENTORY_EXCHANGE, '', Buffer.from(JSON.stringify(inventoryUpdatedEvent)));
    console.log('InventoryUpdated event published:', inventoryUpdatedEvent);

    rabbitChannel.ack(msg);
  });
}

async function updateInventory(orderId) {
  console.log(`Updating inventory for order ID: ${orderId}`);
}

listenForOrderCreated().catch((error) => {
  console.error('Error starting Inventory Service:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (rabbitChannel) await rabbitChannel.close();
  if (rabbitConnection) await rabbitConnection.close();
  console.log('Inventory Service shutting down gracefully');
  process.exit(0);
});