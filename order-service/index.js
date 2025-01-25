const express = require('express');
const amqp = require('amqplib');

const app = express();
const port = 3000;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq';
const ORDER_EXCHANGE = 'order_exchange';

let rabbitConnection, rabbitChannel;

async function connectToRabbitMQ(retries = 5) {
  while (retries > 0) {
    try {
      rabbitConnection = await amqp.connect(RABBITMQ_URL);
      rabbitChannel = await rabbitConnection.createChannel();
      await rabbitChannel.assertExchange(ORDER_EXCHANGE, 'fanout', { durable: false });
      console.log('Order Service connected to RabbitMQ');
      return;
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

app.post('/orders', async (req, res) => {
  const order = req.body;
  const orderCreatedEvent = { orderId: order.id, userId: order.userId, productId: order.productId, quantity: order.quantity };

  try {
    rabbitChannel.publish(ORDER_EXCHANGE, '', Buffer.from(JSON.stringify(orderCreatedEvent)));
    console.log('OrderCreated event published:', orderCreatedEvent);
    res.status(201).send(order);
  } catch (error) {
    console.error('Error publishing event:', error);
    res.status(500).send('Error processing order');
  }
});

// Start the service
connectToRabbitMQ().catch((error) => {
  console.error('Failed to initialize RabbitMQ connection:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (rabbitChannel) await rabbitChannel.close();
  if (rabbitConnection) await rabbitConnection.close();
  console.log('Order Service shutting down gracefully');
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Order Service running on port ${port}`);
});