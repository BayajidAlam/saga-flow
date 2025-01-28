const amqp = require("amqplib");

async function sendMessage() {
  try {
    const connection = await amqp.connect("amqp://localhost:5672");
    const channel = await connection.createChannel();
    const exchange = "order-finish-notification";

    const payment = "payment";
    const shipping = "shipping";
    const invoice = "invoice";
    const warehouse = "warehouse";

    await channel.assertExchange(exchange, "fanout", {
      durable: false,
    });

    await channel.assertQueue(payment, { durable: true });
    await channel.assertQueue(shipping, { durable: true });
    await channel.assertQueue(invoice, { durable: true });
    await channel.assertQueue(warehouse, { durable: true });

    await channel.bindQueue(payment, exchange, "");
    await channel.bindQueue(shipping, exchange, "");
    await channel.bindQueue(invoice, exchange, "");
    await channel.bindQueue(warehouse, exchange, "");

    const message = "Hello, RabbitMQ!";
    channel.publish(exchange, "", Buffer.from(message));
    console.log(`Message sent to ${message}`);

    setTimeout(async () => {
      await channel.close();
      await connection.close();
    }, 500);
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

sendMessage();
