<div align="center">

# XCM Student Transfer  
### Cross-Parachain Communication Demo on Polkadot

<img height="70px" alt="Polkadot SDK Logo" src="https://github.com/paritytech/polkadot-sdk/raw/master/docs/images/Polkadot_Logo_Horizontal_Pink_White.png#gh-dark-mode-only"/>
<img height="70px" alt="Polkadot SDK Logo" src="https://github.com/paritytech/polkadot-sdk/raw/master/docs/images/Polkadot_Logo_Horizontal_Pink_Black.png#gh-light-mode-only"/>

**University Parachain (1000)** → **Company Parachain (2000)**  
Local Polkadot network powered by **XCM** and **Zombienet**

</div>

---

## 🚀 Overview

This project demonstrates **XCM (Cross-Consensus Messaging)** between two parachains running on a **local Polkadot network**.

A student is created on the **University parachain (ParaId 1000)** and, upon graduation, is transferred to the **Company parachain (ParaId 2000)** using an **XCM `Transact` message** over an **HRMP channel**.

The project focuses on:
- XCM configuration and message flow
- HRMP-based parachain communication
- Executing remote calls on sibling parachains
- Observing cross-chain state changes via a React UI

---

## 🧩 Architecture

```
Relay Chain (9944)
│
├─ Parachain 1000 (University) ──▶ HRMP ──▶ Parachain 2000 (Company)
│        9988                                  9999
│
└─ React Frontend (5173)
```

---

## 🌐 Network & Ports

| Component            | Port |
|---------------------|------|
| Relay Chain          | 9944 |
| Parachain 1000       | 9988 |
| Parachain 2000       | 9999 |
| Frontend (React UI)  | 5173 |

⚠️ **Port `5173` must be open** to access the UI.

---

## 🧪 Local Network

The local Polkadot network is started using **Zombienet**:

```bash
zombienet --provider native spawn zombienet.toml
```

📖 Zombienet documentation:  
https://paritytech.github.io/zombienet/

---

## 🔁 HRMP Channel Setup

An **HRMP channel (1000 → 2000)** is required for XCM.

Use the provided script:

```bash
./setup-channels.sh
```

### Script (reference)

```bash
#!/bin/bash

echo "⏳ Waiting for relay chain to be ready..."
sleep 15

echo "📡 Opening HRMP channel 1000 -> 2000..."

if ! command -v polkadot-js-api &> /dev/null; then
    echo "Installing @polkadot/api-cli..."
fi

polkadot-js-api   --ws ws://127.0.0.1:9944   --sudo   --seed "//Alice"   tx.hrmp.forceOpenHrmpChannel 1000 2000 1 102400

echo "✅ HRMP channel opened!"
```

---

## 🖥️ Frontend

The frontend is a **React + Vite** application that:
- Connects to both parachains
- Creates students on Para 1000
- Graduates students via XCM
- Displays students on Para 2000

### Run frontend

```bash
cd frontend
npm install
npm run dev
```

UI will be available at:  
👉 http://localhost:5173

---

## 🔧 Development Notes

### Rebuilding Node / Runtime / Pallets

Whenever **binary-related code** changes (runtime, pallets, node):

```bash
cargo build --release
cargo install --path node
```

Restart Zombienet after rebuilding.

---

## ✉️ XCM Summary

- HRMP channel connects Para 1000 → Para 2000
- `graduate_student` extrinsic builds an XCM message
- XCM uses:
  - `UnpaidExecution`
  - `Transact`
- Remote call executes `receive_student` on Para 2000
- XCM security enforced via:
  - Barriers
  - Safe call filtering

---

## 📁 Project Structure

```
.
├── node/                   # Parachain node
├── runtime/                # Runtime + XCM config
├── pallets/                # Student pallet
├── frontend/               # React UI (Vite)
├── zombienet.toml          # Local network config
├── zombienet-omni-node.toml
├── setup-channels.sh       # HRMP setup script
├── dev_chain_spec.json
├── Cargo.toml
├── Cargo.lock
└── README.md
```

---

## 📚 References

- Polkadot SDK  
  https://paritytech.github.io/polkadot-sdk/

- XCM Overview  
  https://wiki.polkadot.network/docs/learn-xcm

- Zombienet  
  https://paritytech.github.io/zombienet/

- Polkadot.js API  
  https://polkadot.js.org/docs/

---

## 📜 License

This project is released under the **Unlicense** (public domain).

---

<div align="center">

Built with ❤️ using Polkadot SDK & XCM

</div>
