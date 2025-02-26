# Use Node 18 on Debian Bullseye as base image
FROM node:18-bullseye

# Set the working directory
WORKDIR /app

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Install solc, git, and curl (needed for Foundry installation)
RUN apt-get update && apt-get install -y solc git curl

# Install Foundry using Foundryup
RUN curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup

# Install Uniswap V4 core dependency via npm
RUN npm install @uniswap/v4-core

# Copy the rest of your test service code (including your Foundry project folder)
COPY . .

# Expose the desired port (e.g., 5000)
EXPOSE 5000

CMD ["npm", "start"]
