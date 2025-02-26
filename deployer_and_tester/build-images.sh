#!/bin/bash

echo "Building compiler image..."
docker build -t compiler-image -f Dockerfile.compiler .

echo "Building tester image..."
docker build -t tester-image -f Dockerfile.tester .

echo "Docker images built successfully!"
echo "You can now run the server with: npm start" 