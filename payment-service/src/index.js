const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq';
const ORDER_EXCHANGE = 'order_exchange';
const PAYMENT_EXCHANGE = 'payment_exchange';
const PAYMENT_FAILED_EXCHANGE = 'payment_failed_exchange';

let rabbitConnection, rabbitChannel;

async function connectToRabbitMQ(retries = 5) {
  while (retries > 0) {
    try {
      rabbitConnection = await amqp.connect(RABBITMQ_URL);
      rabbitChannel = await rabbitConnection.createChannel();

      // Assert exchanges
      await rabbitChannel.assertExchange(ORDER_EXCHANGE, 'fanout', { durable: false });
      await rabbitChannel.assertExchange(PAYMENT_EXCHANGE, 'fanout', { durable: false });
      await rabbitChannel.assertExchange(PAYMENT_FAILED_EXCHANGE, 'fanout', { durable: false });

      // Create and bind queue for OrderCreated events
      const orderQueue = await rabbitChannel.assertQueue('', { exclusive: true });
      rabbitChannel.bindQueue(orderQueue.queue, ORDER_EXCHANGE, '');

      console.log('Payment Service connected to RabbitMQ');
      return orderQueue;
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
  const orderQueue = await connectToRabbitMQ();

  // Listen for OrderCreated events
  rabbitChannel.consume(orderQueue.queue, async (msg) => {
    const orderCreatedEvent = JSON.parse(msg.content.toString());
    console.log('OrderCreated event received:', orderCreatedEvent);

    try {
      // Simulate payment processing
      await processPayment(orderCreatedEvent.orderId);

      // Publish PaymentProcessed event
      const paymentProcessedEvent = { orderId: orderCreatedEvent.orderId };
      rabbitChannel.publish(PAYMENT_EXCHANGE, '', Buffer.from(JSON.stringify(paymentProcessedEvent)));
      console.log('PaymentProcessed event published:', paymentProcessedEvent);

      rabbitChannel.ack(msg);
    } catch (error) {
      console.error('Failed to process payment:', error);

      // Publish PaymentFailed event
      const paymentFailedEvent = { orderId: orderCreatedEvent.orderId };
      rabbitChannel.publish(PAYMENT_FAILED_EXCHANGE, '', Buffer.from(JSON.stringify(paymentFailedEvent)));
      console.log('PaymentFailed event published:', paymentFailedEvent);

      rabbitChannel.ack(msg);
    }
  });
}

async function processPayment(orderId) {
  console.log(`Processing payment for order ID: ${orderId}`);
  // Simulate payment processing logic
  // Throw an error to simulate payment failure
  // throw new Error('Payment processing failed');
}

listenForOrderCreated().catch((error) => {
  console.error('Error starting Payment Service:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (rabbitChannel) await rabbitChannel.close();
  if (rabbitConnection) await rabbitConnection.close();
  console.log('Payment Service shutting down gracefully');
  process.exit(0);
});