# Stage 1: Build the application
FROM node:16 AS build
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN npm install

# Copy the rest of the application code
COPY . .

# Stage 2: Create the final image
FROM node:16-slim
WORKDIR /app

# Copy only necessary files from the build stage
COPY --from=build /app /app

# Run as a non-root user for security
USER node

# Command to run the service
CMD ["node", "src/index.js"]