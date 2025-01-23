const express = require('express');
const amqp = require('amqplib/callback_api');
const app = express();
const port = 3001;

let rabbitConnection;
let rabbitChannel;

function connectToRabbitMQ(retries = 5) {
  amqp.connect('amqp://admin:admin@localhost:5672', (error0, connection) => {
    if (error0) {
      if (retries === 0) {
        console.error('Failed to connect to RabbitMQ:', error0);
        process.exit(1);
      }
      console.log(`Retrying to connect to RabbitMQ... (${retries} attempts left)`);
      setTimeout(() => connectToRabbitMQ(retries - 1), 5000);
    } else {
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
      });
    }
  });
}

connectToRabbitMQ();

app.get('/order', (req, res) => {
  console.log('Order processed');
  const exchange = 'saga_exchange';
  const msg = 'Order completed';
  rabbitChannel.publish(exchange, 'order.completed', Buffer.from(msg));
  console.log(" [x] Sent %s", msg);
  res.send('Order Service');
});

process.on('exit', () => {
  if (rabbitConnection) {
    rabbitConnection.close();
  }
});

app.listen(port, () => {
  console.log(`Order Service listening at http://localhost:${port}`);
}); 