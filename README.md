![Screenshot from 2025-01-27 02-51-16](https://github.com/user-attachments/assets/4a5a580b-215d-487e-9b2a-407070725720)

# SagaFlow - A Microservices Choreography with RabbitMQ

This project demonstrates a **choreography-based Saga pattern** using **RabbitMQ** for event-driven communication between microservices. The system consists of four independent services: **Order Service**, **Inventory Service**, **Payment Service**, and **Notification Service**. Each service performs its part of the workflow and emits events to trigger the next steps.

- [Services Overview](#services-overview)
- [Event Flow](#event-flow)
- [Prerequisites](#prerequisites)
- [Setup and Running the System](#setup-and-running-the-system)
- [Testing the System](#testing-the-system)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## **Services Overview**

### **1. Order Service**
- **Responsibility:** Accepts new orders via an API and publishes `OrderCreated` events.
- **Events:**
  - Publishes: `OrderCreated`
  - Listens for: `InventoryUpdateFailed`, `PaymentFailed`
  - Publishes: `OrderFailed` (when an order fails due to inventory or payment issues).

### **2. Inventory Service**
- **Responsibility:** Listens for `OrderCreated` events, updates inventory, and publishes `InventoryUpdated` or `InventoryUpdateFailed` events.
- **Events:**
  - Publishes: `InventoryUpdated`, `InventoryUpdateFailed`
  - Listens for: `OrderCreated`, `PaymentFailed`.
    
### **3. Payment Service**
- **Responsibility:** Listens for `OrderCreated` events, processes payments, and publishes `PaymentProcessed` or `PaymentFailed` events.
- **Events:**
  - Publishes: `PaymentProcessed`, `PaymentFailed`
  - Listens for: `OrderCreated`.


### **4. Notification Service**
- **Responsibility:** Listens for `InventoryUpdated`, `PaymentProcessed`, and `OrderFailed` events and sends notifications (e.g., logs to the console).
- **Events:**
  - Listens for: `InventoryUpdated`, `PaymentProcessed`, `OrderFailed`.



## **Event Flow**

1. **OrderCreated**:
   - Published by: Order Service
   - Consumed by: Inventory Service, Payment Service

2. **InventoryUpdated**:
   - Published by: Inventory Service
   - Consumed by: Notification Service

3. **InventoryUpdateFailed**:
   - Published by: Inventory Service
   - Consumed by: Order Service

4. **PaymentProcessed**:
   - Published by: Payment Service
   - Consumed by: Notification Service

5. **PaymentFailed**:
   - Published by: Payment Service
   - Consumed by: Order Service, Inventory Service

6. **OrderFailed**:
   - Published by: Order Service
   - Consumed by: Notification Service

---

## **Prerequisites**

- **Docker**: Ensure Docker and Docker Compose are installed.
- **Node.js**: Each service is built using Node.js. Install Node.js if running services locally without Docker.
---

## **Setup and Running the System**

### **1. Clone the Repository**
```bash
git clone https://github.com/BayajidAlam/saga-flow
cd saga-flow
```
### **2. Start the System with Docker Compose**
Run the following command to start all services and RabbitMQ:
```bash
make up
```
This will start:
- RabbitMQ (with management UI at http://localhost:15672)

- Order Service (port 3000)

- Inventory Service

- Notification Service

- Payment Service 

## Testing the System

###  1. Place an Order
 Send a POST request to the Order Service to create a new order:
 ```
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d '{
  "id": "1",
  "userId": "123",
  "productId": "456",
  "quantity": 2
}'
```

## 2. Check Logs

- Check the logs of each service to see the event flow.

- For example:

  - **Order Service:** Logs **OrderCreated** and **OrderFailed** events.

  - **Inventory Service:** Logs **InventoryUpdated** or **InventoryUpdateFailed** events.

  - **Payment Service:** Logs **PaymentProcessed** or **PaymentFailed** events.

  - **Notification Service:** Logs notifications for **InventoryUpdated**,  **PaymentProcessed**, and **OrderFailed** events.


## Project Structure

```plaintext
├── order-service/
│   ├── src/index.js
│   ├── Dockerfile
│   └── package.json
├── inventory-service/
│   ├── src/index.js
│   ├── Dockerfile
│   └── package.json
├── notification-service/
│   ├── src/index.js
│   ├── Dockerfile
│   └── package.json
├── payment-service/
│   ├── src/index.js
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── Makefile 
└── README.md
```

## **Contributing**

We welcome contributions from the community! If you'd like to contribute, please follow the guidelines outlined in our [CONTRIBUTING.md](CONTRIBUTING.md) file. Here's a quick overview of the process:

1. **Fork the repository** and clone it to your local machine.
2. **Create a new branch** for your feature, bugfix, or improvement.
3. **Commit your changes** with clear and descriptive messages.
4. **Submit a pull request** with a detailed explanation of your changes.

For **major changes**, please open an issue first to discuss your proposal with the maintainers. This ensures your work aligns with the project's goals and avoids duplication of effort.

Thank you for your interest in contributing! We appreciate your support.
## **License**

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
