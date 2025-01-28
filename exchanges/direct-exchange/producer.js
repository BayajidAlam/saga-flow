const amqp = require("amqplib");

async function sendMessage() {
  try {

    const connection = await amqp.connect("amqp://localhost:5672");
    const channel = await connection.createChannel();

    const exchange = "oms-exchange";
    const queue = "oms_queue";
    const routingKey = "oms";

    await channel.assertExchange(exchange, "direct", {
      durable: false,
    });
    await channel.assertQueue(queue, { durable: false });
    await channel.bindQueue(queue, exchange, routingKey);

    const message = "Hello, RabbitMQ!";
    channel.publish(exchange, routingKey, Buffer.from(message));
    console.log(`Message sent to ${queue}: ${message}`);

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

sendMessage();
