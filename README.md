# Microservices Choreography with RabbitMQ

## Overview
This project implements a choreography-type Saga using RabbitMQ for event-driven communication between microservices.

## Services
- **Order Service**: Accepts new orders and publishes `OrderCreated` events.
- **Inventory Service**: Listens for `OrderCreated` events, updates inventory, and publishes `InventoryUpdated` events.
- **Notification Service**: Listens for `InventoryUpdated` events and sends notifications.
- **Payment Service**: Listens for `OrderCreated` events, processes payments, and publishes `PaymentProcessed` events.

## Requirements
- Docker
- Docker Compose

## Setup
1. Clone the repository.
2. Navigate to the project directory.
3. Run `docker-compose up --build` to start all services.

## Testing
- Use a tool like Postman to send a POST request to `http://localhost:3000/orders` with a JSON body: