#!/bin/bash

echo "⏳ Waiting for relay chain to be ready..."
sleep 15

echo "📡 Opening HRMP channel 1000 -> 2000..."

# Install if not present
if ! command -v polkadot-js-api &> /dev/null; then
    echo "Installing @polkadot/api-cli..."
    # Use on first setup
    # sudo npm install -g @polkadot/api-cli
fi

# Open channel: 1000 -> 2000
polkadot-js-api \
  --ws ws://127.0.0.1:9944 \
  --sudo \
  --seed "//Alice" \
  tx.hrmp.forceOpenHrmpChannel 1000 2000 1 102400

echo "✅ HRMP channel opened!"
