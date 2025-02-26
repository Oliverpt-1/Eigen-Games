#!/bin/bash

# Create a script to merge the frontends
# This script copies the necessary files from new_front_end to frontend

# Create directories if they don't exist
mkdir -p frontend/src/components
mkdir -p frontend/public/image

# Copy components
echo "Copying components..."
cp -f new_front_end/src/components/TestingSuite.tsx frontend/src/components/
cp -f new_front_end/src/components/SolidityEditor.tsx frontend/src/components/
cp -f new_front_end/src/components/AIAgent.tsx frontend/src/components/
cp -f new_front_end/src/components/ConnectWallet.tsx frontend/src/components/

# Copy main files
echo "Copying main files..."
cp -f new_front_end/src/App.tsx frontend/src/
cp -f new_front_end/src/index.css frontend/src/

# Copy images
echo "Copying images..."
cp -f new_front_end/image/jacked_unicorn.jpg frontend/public/image/

echo "Frontend merge complete!"
echo "You can now run the frontend with: cd frontend && npm run dev"
echo "And the backend with: cd deployer_and_tester && npm start" 