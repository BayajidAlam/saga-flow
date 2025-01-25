# Variables
COMPOSE_FILE := docker-compose.yml
SERVICES := rabbitmq order-service inventory-service notification-service payment-service

# Commands
.PHONY: build up down restart logs clean

# Build all services
build:
	docker-compose -f $(COMPOSE_FILE) build

# Start all services
up:
	docker-compose -f $(COMPOSE_FILE) up -d

# Stop all services
down:
	docker-compose -f $(COMPOSE_FILE) down

# Restart all services
restart: down up


# Clean up Docker resources (containers, networks, volumes)
clean:
	docker-compose -f $(COMPOSE_FILE) down --remove-orphans --volumes
	docker system prune -f

