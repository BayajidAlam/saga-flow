const amqp = require("amqplib");

async function consumeMessages(queue) {
  try {
    const connection = await amqp.connect("amqp://localhost:5672");
    const channel = await connection.createChannel();

    await channel.assertQueue(queue, { durable: true });

    channel.consume(queue, (message) => {
      if (message) {
        console.log(
          `Message received from ${queue}: ${message.content.toString()}`
        );
        channel.ack(message);
      }
    });

    console.log(`Waiting for messages in ${queue}...`);
  } catch (error) {
    console.error("Error consuming message:", error);
  }
}

// Start consumers for each queue
consumeMessages("payment");
consumeMessages("shipping");
consumeMessages("invoice");
consumeMessages("warehouse");
