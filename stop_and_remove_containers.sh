#!/bin/bash

# Stop all running containers
docker kill $(docker ps -q)

# Remove all containers (running and stopped)
docker rm -f $(docker ps -a -q)

echo "All containers have been stopped and removed."