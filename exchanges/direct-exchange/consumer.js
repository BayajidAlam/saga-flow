const amqp = require("amqplib");

async function receiveMessage() {
  try {
    const connection = await amqp.connect("amqp://localhost:5672");
    const channel = await connection.createChannel();

    const queue = "oms_queue";

    await channel.assertQueue(queue, { durable: false });

    console.log(`Waiting for messages in ${queue}`);

    channel.consume(queue, (message) => {
      if (message != null) {
        console.log(`Received message: ${message.content.toString()}`);
        channel.ack(message);
      }
    });
  } catch (error) {
    console.error("Error receiving message:", error);
  }
}

receiveMessage();
