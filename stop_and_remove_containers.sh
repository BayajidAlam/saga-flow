#!/bin/bash

# Stop all running containers
sudo docker kill $(docker ps -q)

# Remove all containers (running and stopped)
sudo docker rm -f $(docker ps -a -q)

echo "All containers have been stopped and removed."
