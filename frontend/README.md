<div align="center">

# XCM Student Transfer: Cross-Parachain Communication Demo

<img height="70px" alt="Polkadot SDK Logo" src="https://github.com/paritytech/polkadot-sdk/raw/master/docs/images/Polkadot_Logo_Horizontal_Pink_White.png#gh-dark-mode-only"/>
<img height="70px" alt="Polkadot SDK Logo" src="https://github.com/paritytech/polkadot-sdk/raw/master/docs/images/Polkadot_Logo_Horizontal_Pink_Black.png#gh-light-mode-only"/>

> A demonstration of XCM (Cross-Consensus Messaging) for transferring student data between parachains on a local Polkadot network.
>
> **University Parachain (1000)** → **Company Parachain (2000)**

</div>

---

## 📚 Table of Contents

- [Project Overview](#-project-overview)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running the Project](#-running-the-project)
- [Using the Frontend UI](#-using-the-frontend-ui)
- [How XCM Works in This Project](#-how-xcm-works-in-this-project)
- [Development Workflow](#-development-workflow)
- [Troubleshooting](#-troubleshooting)
- [Project Structure](#-project-structure)

---

## 🎯 Project Overview

This project demonstrates **Cross-Consensus Messaging (XCM)** between two parachains in a local Polkadot development environment:

- **University Parachain (Para ID: 1000)**: Students are created and managed here
- **Company Parachain (Para ID: 2000)**: Graduated students are transferred here via XCM

**Key Features:**
- ✅ Create students with personal information (name, surname, age, gender)
- ✅ Graduate students, triggering automatic XCM transfer to Company Parachain
- ✅ Real-time visualization of cross-chain data transfer
- ✅ Interactive React frontend with live blockchain connection

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Relay Chain (Rococo Local)               │
│                                                              │
│  ┌──────────────────┐          ┌──────────────────┐         │
│  │   Alice (9944)   │          │    Bob (9955)    │         │
│  │    Validator     │          │    Validator     │         │
│  └──────────────────┘          └──────────────────┘         │
│                                                              │
│        ┌──────────────────────────────────────┐             │
│        │       HRMP Channel (1000 → 2000)     │             │
│        └──────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
           │                              │
           │                              │
    ┌──────▼──────────┐          ┌───────▼─────────┐
    │  University     │   XCM    │    Company      │
    │  Parachain      │ ────────►│   Parachain     │
    │  (1000:9988)    │          │   (2000:9999)   │
    └─────────────────┘          └─────────────────┘
           │                              │
           └──────────────┬───────────────┘
                          │
                   ┌──────▼──────┐
                   │   Frontend  │
                   │   (5173)    │
                   └─────────────┘
```

---

## 📋 Prerequisites

### 1. Install Rust

```bash
# Install Rust using rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Configure current shell
source $HOME/.cargo/env

# Add WebAssembly target
rustup target add wasm32-unknown-unknown

# Verify installation
rustc --version
cargo --version
```

### 2. Install System Dependencies

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y build-essential git clang curl libssl-dev llvm libudev-dev protobuf-compiler pkg-config
```

**macOS:**
```bash
brew install openssl cmake llvm protobuf
```

### 3. Install Polkadot Binary

Download the latest Polkadot release:
```bash
# Create a binaries directory
mkdir -p ~/polkadot-bins
cd ~/polkadot-bins

# Download Polkadot (replace version with latest)
wget https://github.com/paritytech/polkadot-sdk/releases/download/polkadot-stable2412-2/polkadot
wget https://github.com/paritytech/polkadot-sdk/releases/download/polkadot-stable2412-2/polkadot-execute-worker
wget https://github.com/paritytech/polkadot-sdk/releases/download/polkadot-stable2412-2/polkadot-prepare-worker

# Make executable
chmod +x polkadot polkadot-execute-worker polkadot-prepare-worker

# Add to PATH (add to ~/.bashrc or ~/.zshrc for persistence)
export PATH="$HOME/polkadot-bins:$PATH"

# Verify
polkadot --version
```

### 4. Install Zombienet

```bash
# Download Zombienet
wget https://github.com/paritytech/zombienet/releases/latest/download/zombienet-linux-x64 -O ~/polkadot-bins/zombienet
# For macOS: zombienet-macos

# Make executable
chmod +x ~/polkadot-bins/zombienet

# Verify
zombienet --version
```

### 5. Install Node.js & npm

```bash
# Install Node.js (v18 or higher recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Verify
node --version
npm --version
```

### 6. Install Polkadot.js API CLI

```bash
npm install -g @polkadot/api-cli
```

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd parachain-xcm-communication
```

### 2. Build the Parachain Node

```bash
# Build in release mode (this will take some time on first build)
cargo build --release

# Install the node binary (required for zombienet)
cargo install --path node

# Verify the binary is available
parachain-template-node --version
```

**⚠️ Important:** Whenever you modify the runtime or node code, you must rebuild and reinstall:
```bash
cargo build --release
cargo install --path node
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Install additional dependencies
npm install @polkadot/api @polkadot/keyring @polkadot/util @polkadot/util-crypto lucide-react

# Install Tailwind CSS v4
npm install tailwindcss @tailwindcss/postcss

# Verify installation
npm list
```

---

## 🎮 Running the Project

### Step 1: Start the Local Network with Zombienet

```bash
# From project root, start the relay chain + parachains
zombienet --provider native spawn zombienet.toml
```

**What this does:**
- Starts 2 relay chain validators (Alice on port 9944, Bob on port 9955)
- Starts University Parachain collator (Para 1000 on port 9988)
- Starts Company Parachain collator (Para 2000 on port 9999)
- Establishes basic parachain registration

You should see output like:
```
Network launched 🚀🚀
```

**Keep this terminal open!**

### Step 2: Open HRMP Channel (Required for XCM)

The HRMP (Horizontal Relay-routed Message Passing) channel enables communication between parachains.

**Option A: Using the Automated Script**

Create `setup-hrmp-channel.sh`:

```bash
#!/bin/bash

echo "⏳ Waiting for relay chain to be ready..."
sleep 15

echo "📡 Opening HRMP channel 1000 → 2000..."

polkadot-js-api \
  --ws ws://127.0.0.1:9944 \
  --sudo \
  --seed "//Alice" \
  tx.hrmp.forceOpenHrmpChannel 1000 2000 1 102400

echo "✅ HRMP channel opened!"
```

Make it executable and run:
```bash
chmod +x setup-hrmp-channel.sh
./setup-hrmp-channel.sh
```

**Option B: Using Polkadot.js Apps UI (Manual)**

1. Navigate to https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:9944
2. Go to **Developer** → **Sudo**
3. Select `hrmp.forceOpenHrmpChannel(id, recipient, maxCapacity, maxMessageSize)`
4. Enter parameters:
   - `id`: `1000`
   - `recipient`: `2000`
   - `maxCapacity`: `1`
   - `maxMessageSize`: `102400`
5. Click **Submit Sudo**
6. Sign with Alice

**Verify Channel:**
```bash
polkadot-js-api --ws ws://127.0.0.1:9944 query.hrmp.hrmpChannels 1000 2000
```

You should see channel details (not null).

### Step 3: Start the Frontend

Open a new terminal:

```bash
cd frontend

# Start the development server
npm run dev
```

You should see:
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:5173/
```

### Step 4: Open the UI

Navigate to **http://localhost:5173** in your browser.

You should see:
- ✅ Connection status: "Connected | Pallet: templatePallet | Alice"
- University Parachain panel (left)
- Company Parachain panel (right)

---

## 🖥️ Using the Frontend UI

### Creating a Student

1. Fill in the form at the top:
   - **Name**: e.g., "John"
   - **Surname**: e.g., "Doe"
   - **Age**: e.g., "22"
   - **Gender**: Select from dropdown (Male/Female/Other)

2. Click **"Add Student"**

3. Wait for confirmation (~6 seconds for block finalization)

4. Student appears in the University Parachain panel

### Graduating a Student (XCM Transfer)

1. Find the student in the University Parachain panel

2. Click **"Graduate Student"**

3. Watch the transfer animation (arrow icon)

4. After ~9 seconds (includes 3-second XCM processing delay):
   - Student disappears from University Parachain
   - Student appears in Company Parachain with "Graduated" badge

### Browser Console

Open browser DevTools (F12) to see detailed logs:
- Connection status
- Detected pallet name
- Transaction hashes
- XCM events
- Student data

---

## 🔧 How XCM Works in This Project

### Custom Pallet: `pallet_parachain_template`

Located in `pallets/template/src/lib.rs`

**Extrinsic Functions:**

1. **`create_student`**: Creates a student on University Parachain
   ```rust
   pub fn create_student(
       origin: OriginFor<T>,
       name: Vec<u8>,
       surname: Vec<u8>,
       age: u32,
       gender: Gender,
   ) -> DispatchResult
   ```

2. **`graduate_student`**: Graduates and transfers student via XCM
   ```rust
   pub fn graduate_student(
       origin: OriginFor<T>,
       student_id: u32,
   ) -> DispatchResult
   ```
   
   **This function:**
   - Validates student ownership
   - Marks student as graduated
   - Encodes `receive_student` call
   - Builds XCM message with `Transact` instruction
   - Sends XCM to Para 2000
   - Removes student from Para 1000

3. **`receive_student`**: Receives student on Company Parachain (called by XCM)
   ```rust
   pub fn receive_student(
       origin: OriginFor<T>,
       student: Student<T>,
   ) -> DispatchResult
   ```

### XCM Configuration Changes

**Key files modified:**

#### 1. `runtime/src/configs/xcm_config.rs`

**Added Safe Call Filter:**
```rust
pub struct SafeCallFilter;
impl Contains<RuntimeCall> for SafeCallFilter {
    fn contains(call: &RuntimeCall) -> bool {
        match call {
            RuntimeCall::TemplatePallet(_) => true, // Allow our pallet
            _ => false,
        }
    }
}
```

**Added Sibling Parachain Unpaid Execution:**
```rust
pub struct AllowSiblingParachains;
impl Contains<Location> for AllowSiblingParachains {
    fn contains(location: &Location) -> bool {
        matches!(location.unpack(), (1, [Parachain(_)]))
    }
}
```

**Updated Barrier:**
```rust
pub type Barrier = TrailingSetTopicAsId<
    DenyThenTry<
        DenyRecursively<DenyReserveTransferToRelayChain>,
        (
            TakeWeightCredit,
            WithComputedOrigin<
                (
                    AllowTopLevelPaidExecutionFrom<Everything>,
                    AllowExplicitUnpaidExecutionFrom<ParentOrParentsExecutivePlurality>,
                    AllowExplicitUnpaidExecutionFrom<AllowSiblingParachains>, // Added
                ),
                UniversalLocation,
                ConstU32<8>,
            >,
        ),
    >,
>;
```

#### 2. `runtime/src/configs/mod.rs`

**Configured Destination Parachain:**
```rust
parameter_types! {
    pub const GraduationDestinationPara: u32 = 2000; // Company Parachain
}
```

### XCM Message Flow

```
1. User clicks "Graduate Student" on Frontend
   ↓
2. Frontend calls graduate_student extrinsic on Para 1000
   ↓
3. Para 1000 builds XCM message:
   Xcm(vec![
       UnpaidExecution { weight_limit: Unlimited, check_origin: None },
       Transact {
           origin_kind: SovereignAccount,
           call: encoded_receive_student_call,
       }
   ])
   ↓
4. XCM sent to Relay Chain → routed to Para 2000
   ↓
5. Para 2000 receives XCM, passes Barrier checks
   ↓
6. SafeCallFilter allows TemplatePallet call
   ↓
7. receive_student executed on Para 2000
   ↓
8. Student stored on Para 2000
   ↓
9. Frontend polls both chains, updates UI
```

---

## 🛠️ Development Workflow

### Making Changes to Runtime

1. Edit your code in `runtime/` or `pallets/`

2. Rebuild:
   ```bash
   cargo build --release
   ```

3. **Reinstall the node binary** (critical!):
   ```bash
   cargo install --path node
   ```

4. Restart zombienet:
   ```bash
   # Stop current zombienet (Ctrl+C)
   zombienet --provider native spawn zombienet.toml
   ```

5. Re-open HRMP channel (if needed)

### Making Changes to Frontend

1. Edit files in `frontend/src/`

2. Vite will auto-reload

3. For dependency changes:
   ```bash
   npm install
   ```

### Testing XCM Locally

1. Check relay chain events:
   ```bash
   polkadot-js-api --ws ws://127.0.0.1:9944 query.system.events
   ```

2. Check parachain events:
   ```bash
   # University Parachain
   polkadot-js-api --ws ws://127.0.0.1:9988 query.system.events
   
   # Company Parachain
   polkadot-js-api --ws ws://127.0.0.1:9999 query.system.events
   ```

3. Query student data:
   ```bash
   # Check student count
   polkadot-js-api --ws ws://127.0.0.1:9988 query.templatePallet.studentCount
   
   # Check specific student
   polkadot-js-api --ws ws://127.0.0.1:9988 query.templatePallet.students 0
   ```

---

## 🐛 Troubleshooting

### Issue: "Failed to connect"

**Solution:**
- Ensure zombienet is running
- Wait 15-20 seconds after starting zombienet
- Check if ports 9988 and 9999 are not in use:
  ```bash
  lsof -i :9988
  lsof -i :9999
  ```

### Issue: "Could not find student pallet"

**Solution:**
- Check browser console for "Available pallets"
- Pallet should be named `templatePallet`
- Verify in `runtime/src/lib.rs`:
  ```rust
  pub type TemplatePallet = pallet_parachain_template;
  ```

### Issue: Students not transferring

**Solution:**
1. Verify HRMP channel is open:
   ```bash
   polkadot-js-api --ws ws://127.0.0.1:9944 query.hrmp.hrmpChannels 1000 2000
   ```

2. Check XCM configuration in `xcm_config.rs`

3. Look for XCM errors in relay chain events

### Issue: "Transaction failed"

**Solution:**
- Open browser console for detailed error
- Check if student exists and you own it
- Verify student hasn't already graduated
- Check Alice has funds on the parachain

### Issue: Frontend CSS not loading

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm install tailwindcss @tailwindcss/postcss
npm run dev
```

### Issue: Binary not found after rebuild

**Solution:**
```bash
cargo install --path node
export PATH="$HOME/.cargo/bin:$PATH"
```

---

## 📁 Project Structure

```
parachain-xcm-communication/
├── node/                          # Parachain node implementation
│   └── src/
│       └── main.rs
├── pallets/
│   └── template/
│       └── src/
│           └── lib.rs            # Student pallet with XCM logic
├── runtime/
│   └── src/
│       ├── lib.rs                # Runtime configuration
│       └── configs/
│           ├── mod.rs            # Pallet configurations
│           └── xcm_config.rs     # XCM setup ⭐
├── frontend/                      # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx               # Main UI component
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── postcss.config.js
│   └── vite.config.js
├── zombienet.toml                 # Network configuration
├── setup-hrmp-channel.sh          # HRMP channel script
├── Cargo.toml
└── README.md
```

---

## 🎓 Key Concepts Learned

- ✅ **XCM**: Cross-chain messaging protocol
- ✅ **HRMP**: Horizontal message passing between parachains
- ✅ **Transact**: XCM instruction for executing calls on remote chains
- ✅ **Barriers**: Security filters for incoming XCM messages
- ✅ **SafeCallFilter**: Whitelist specific extrinsics for XCM
- ✅ **Sovereign Account**: Parachain's account on other chains
- ✅ **Polkadot.js API**: JavaScript library for blockchain interaction

---

## 📚 Additional Resources

- [Polkadot SDK Documentation](https://paritytech.github.io/polkadot-sdk/master/polkadot_sdk_docs/index.html)
- [XCM Format Documentation](https://wiki.polkadot.network/docs/learn-xcm)
- [Zombienet Documentation](https://paritytech.github.io/zombienet/)
- [Polkadot.js API Docs](https://polkadot.js.org/docs/)
- [Substrate Documentation](https://docs.substrate.io/)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with zombienet
5. Submit a pull request

---

## 📝 License

This project is unlicensed and released into the public domain.

---

<div align="center">

**Built with ❤️ using Polkadot SDK**

</div>
