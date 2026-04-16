<div align="center">

# Student transfer between parachains
### Cross-Parachain Communication Demo (Polkadot Local Network)

<img height="70px" alt="Polkadot SDK Logo" src="https://github.com/paritytech/polkadot-sdk/raw/master/docs/images/Polkadot_Logo_Horizontal_Pink_White.png#gh-dark-mode-only"/>
<img height="70px" alt="Polkadot SDK Logo" src="https://github.com/paritytech/polkadot-sdk/raw/master/docs/images/Polkadot_Logo_Horizontal_Pink_Black.png#gh-light-mode-only"/>

**University Parachain (1000)** → **Company Parachain (2000)**  
Technologies and frameworks used: **XCM**, **HRMP**, **Zombienet**, and **Polkadot SDK**

</div>

---

## 🎯 Project Focus

This repository demonstrates **XCM (Cross-Consensus Messaging)** between two **sibling parachains** running on a **local Polkadot network**.

- Students are created on **Parachain 1000 (University)**
- Graduating a student triggers an **XCM `Transact`**
- Student data is executed and stored on **Parachain 2000 (Company)**
- State changes are visualized via a **React + Vite frontend**

The goal of the project is to showcase **real, executable cross-parachain calls**, not UI complexity or node setup.

---

## 🧩 Architecture

```
Relay Chain (9944)
│
├─ Parachain 1000 (University) ──▶ HRMP ──▶ Parachain 2000 (Company)
│        9988                                  9999
│
└─ React + Vite Frontend (5173)
```

---

## 🌐 Ports & Access

| Component            | Address / Port |
|---------------------|----------------|
| Relay Chain          | ws://127.0.0.1:9944 |
| Parachain 1000       | ws://127.0.0.1:9988 |
| Parachain 2000       | ws://127.0.0.1:9999 |
| Frontend UI          | http://localhost:5173 |

⚠️ **Port `5173` must be open** to access the UI.

---

## 🧪 Local Network (Zombienet)

The network is started using **Zombienet**:

```bash
zombienet --provider native spawn zombienet.toml
```

📖 Zombienet documentation:  
https://paritytech.github.io/zombienet/

---

## 🔁 HRMP Channel (Required for XCM)

An **HRMP channel (1000 → 2000)** must be opened on the relay chain.

Run the script **while Zombienet is starting** (after a few seconds):

```bash
./setup-channels.sh
```

This script uses `sudo` on the relay chain (Alice) to open the channel via `hrmp.forceOpenHrmpChannel`.

---

## 🖥️ Frontend

The frontend is built with:

- **React 18**
- **Vite**
- **Tailwind CSS**
- **polkadot.js API**
- **lucide-react** icons

### Run frontend

```bash
cd frontend
npm install
npm run dev
```

UI available at:  
👉 http://localhost:5173

The UI connects directly to:
- Parachain 1000 (`9988`)
- Parachain 2000 (`9999`)

and signs transactions using the **Alice dev account**.

---

## 🔍 Inspecting On‑Chain State

For detailed on-chain inspection, use **Polkadot.js Apps**:

- Relay Chain:  
  https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:9944

- University Parachain (1000):  
  https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:9988

- Company Parachain (2000):  
  https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:9999

Useful sections:
- **Developer → Extrinsics**
- **Developer → Chain state**
- **Network → Explorer**
- **XCM / HRMP events on relay chain**

---

## ✉️ XCM Flow (High Level)

1. User clicks **Graduate Student** in UI
2. `graduateStudent` extrinsic executes on Para 1000
3. Student data is encoded into an XCM `Transact`
4. XCM message routed via Relay Chain
5. Para 2000 executes `receiveStudent`
6. Student appears on Company parachain

Security is enforced via:
- XCM **Barriers**
- **SafeCallFilter**
- Sibling parachain origin checks

---

## 🔧 Development Notes

### Rebuilding Runtime / Pallets / Node

Whenever **binary code changes** (runtime, pallets, node):

```bash
cargo build --release
cargo install --path node
```

Zombienet must be restarted after rebuilding.

---

## 📁 Project Structure

```
.
├── node/                    # Parachain node
├── runtime/                 # Runtime + XCM config
├── pallets/                 # Student pallet
├── frontend/                # React + Vite UI
├── zombienet.toml
├── zombienet-omni-node.toml
├── setup-channels.sh        # HRMP setup script
├── dev_chain_spec.json
├── Cargo.toml
├── Cargo.lock
└── README.md
```

---

## 🧬 Origin

This project is based on the official:

**polkadot-sdk-parachain-template**  
https://github.com/paritytech/polkadot-sdk-parachain-template

and extended with:
- Custom student pallet
- XCM configuration
- HRMP messaging
- Frontend visualization

---

## 📜 License

Unlicensed / Public Domain.

---

<div align="center">

Built with ❤️ using Polkadot SDK, XCM & Zombienet

</div>
