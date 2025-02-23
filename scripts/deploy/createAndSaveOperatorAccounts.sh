#!/bin/bash

# Create three operator accounts
OPERATOR_ACCOUNT1=$(openssl rand -hex 32)
OPERATOR_ADDRESS1=$(cast wallet address --private-key $OPERATOR_ACCOUNT1)

OPERATOR_ACCOUNT2=$(openssl rand -hex 32)
OPERATOR_ADDRESS2=$(cast wallet address --private-key $OPERATOR_ACCOUNT2)

OPERATOR_ACCOUNT3=$(openssl rand -hex 32)
OPERATOR_ADDRESS3=$(cast wallet address --private-key $OPERATOR_ACCOUNT3)

# Create the operators directory if it doesn't exist
mkdir -p config/operators

# Save to operators.env file
cat > config/operators/operators.env << EOL
# Operator 1 (Performer, Attester, and Aggregator)
OPERATOR1_PRIVATE_KEY=$OPERATOR_ACCOUNT1
OPERATOR1_ADDRESS=$OPERATOR_ADDRESS1

# Operator 2 (Attester)
OPERATOR2_PRIVATE_KEY=$OPERATOR_ACCOUNT2
OPERATOR2_ADDRESS=$OPERATOR_ADDRESS2

# Operator 3 (Attester)
OPERATOR3_PRIVATE_KEY=$OPERATOR_ACCOUNT3
OPERATOR3_ADDRESS=$OPERATOR_ADDRESS3
EOL

# Save to a human-readable file
cat > config/operators/operator_accounts.txt << EOL
Operator Accounts for GateKeeper AVS

Operator 1 (Performer, Attester, and Aggregator)
Private Key: $OPERATOR_ACCOUNT1
Address: $OPERATOR_ADDRESS1

Operator 2 (Attester)
Private Key: $OPERATOR_ACCOUNT2
Address: $OPERATOR_ADDRESS2

Operator 3 (Attester)
Private Key: $OPERATOR_ACCOUNT3
Address: $OPERATOR_ADDRESS3

Note: These accounts need to be:
1. Funded with at least 0.02 holETH each on Holesky
2. Operator 1 needs additional funding on Amoy (L2)
3. Each operator needs to deposit 0.012 stETH into EigenLayer
EOL

echo "Operator accounts have been created and saved to:"
echo "- config/operators/operators.env (for script usage)"
echo "- config/operators/operator_accounts.txt (human readable)"
echo "Please keep these files secure and backed up!" 