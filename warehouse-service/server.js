const express = require('express');
const amqp = require('amqplib/callback_api');
const app = express();
const port = 3003;
let rabbitConnection;
let rabbitChannel;

amqp.connect('amqp://admin:admin@localhost:5672', (error0, connection) => {
  if (error0) {
    throw error0;
  }
  rabbitConnection = connection;
  connection.createChannel((error1, channel) => {
    if (error1) {
      throw error1;
    }
    rabbitChannel = channel;
    const exchange = 'saga_exchange';
    channel.assertExchange(exchange, 'topic', {
      durable: false
    });

    // Listen for warehouse started messages
    channel.assertQueue('', { exclusive: true }, (error2, q) => {
      if (error2) {
        throw error2;
      }
      console.log(' [*] Waiting for messages in %s. To exit press CTRL+C', q.queue);
      channel.bindQueue(q.queue, exchange, 'warehouse.started');

      channel.consume(q.queue, (msg) => {
        if (msg.content) {
          console.log(" [x] Received %s", msg.content.toString());
          // Simulate warehouse processing
          console.log('Warehouse processed for order');
        }
      }, {
        noAck: true
      });
    });
  });
});

// Ensure the connection is closed when the process exits
process.on('exit', () => {
  if (rabbitConnection) {
    rabbitConnection.close();
  }
});

app.listen(port, () => {
  console.log(`Warehouse Service listening at http://localhost:${port}`);
}); 