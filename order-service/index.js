const amqp = require('amqplib');
const express = require('express');

const app = express();
app.use(express.json());

const RABBITMQ_URL = 'amqp://admin:admin@rabbitmq';

async function connectToRabbitMQ(retries = 5) {
    while (retries) {
        try {
            const connection = await amqp.connect(RABBITMQ_URL);
            const channel = await connection.createChannel();
            await channel.assertExchange('order_exchange', 'fanout', { durable: false });
            return { connection, channel };
        } catch (error) {
            console.error('Error connecting to RabbitMQ:', error);
            retries -= 1;
            console.log(`Retrying to connect to RabbitMQ... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 5000)); 
        }
    }
    throw new Error('Failed to connect to RabbitMQ after multiple attempts');
}

app.post('/orders', async (req, res) => {
    const order = req.body;
    const orderCreatedEvent = { orderId: order.id, userId: order.userId };

    try {
        const { connection, channel } = await connectToRabbitMQ();
        channel.publish('order_exchange', '', Buffer.from(JSON.stringify(orderCreatedEvent)));
        console.log('OrderCreated event published:', orderCreatedEvent);
        res.status(201).send(order);
        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('Error publishing event:', error);
        res.status(500).send('Error processing order');
    }
});

app.listen(3000, () => {
    console.log('Order Service running on port 3000');
});