const express = require('express');
const amqp = require('amqplib/callback_api');
const app = express();
const port = 3002;

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

        channel.assertQueue('', { exclusive: true }, (error2, q) => {
          if (error2) {
            throw error2;
          }
          console.log(' [*] Waiting for messages in %s. To exit press CTRL+C', q.queue);
          channel.bindQueue(q.queue, exchange, 'payment.started');

          channel.consume(q.queue, (msg) => {
            if (msg.content) {
              console.log(" [x] Received %s", msg.content.toString());
              console.log('Payment processed for order');
              const paymentMsg = 'Payment completed';
              rabbitChannel.publish(exchange, 'payment.completed', Buffer.from(paymentMsg));
              console.log(" [x] Sent %s", paymentMsg);
            }
          }, {
            noAck: true
          });
        });
      });
    }
  });
}

connectToRabbitMQ();

process.on('exit', () => {
  if (rabbitConnection) {
    rabbitConnection.close();
  }
});

app.listen(port, () => {
  console.log(`Payment Service listening at http://localhost:${port}`);
});
