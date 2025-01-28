const amqp = require("amqplib");

async function sendMessage() {
  try {
    const connection = await amqp.connect("amqp://localhost:5672");
    const channel = await connection.createChannel();
    const queue = "oms";

    await channel.assertQueue(queue, { durable: false });

    const message = "Hello, RabbitMQ!";
    channel.sendToQueue(queue, Buffer.from(message));

    console.log(`Message sent to ${queue}: ${message}`);

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

sendMessage();
