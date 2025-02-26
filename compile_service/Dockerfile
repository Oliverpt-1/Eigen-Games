# compile_service/Dockerfile
FROM node:18-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Install solc (Solidity compiler CLI)
RUN apt-get update && apt-get install -y solc

EXPOSE 4000

CMD ["npm", "start"]

