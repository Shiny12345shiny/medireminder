import os
import sys
import json
import socket
import signal
import platform
import subprocess
import threading
import time
import re
import ctypes

# ─────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────
class C:
    GREEN  = '\033[92m'
    YELLOW = '\033[93m'
    RED    = '\033[91m'
    BLUE   = '\033[94m'
    CYAN   = '\033[96m'
    BOLD   = '\033[1m'
    RESET  = '\033[0m'

def green(msg):  return f"{C.GREEN}{msg}{C.RESET}"
def yellow(msg): return f"{C.YELLOW}{msg}{C.RESET}"
def red(msg):    return f"{C.RED}{msg}{C.RESET}"
def blue(msg):   return f"{C.BLUE}{msg}{C.RESET}"
def bold(msg):   return f"{C.BOLD}{msg}{C.RESET}"
def cyan(msg):   return f"{C.CYAN}{msg}{C.RESET}"

def ok(msg):   print(green(f"  ✓ {msg}"))
def warn(msg): print(yellow(f"  ⚠ {msg}"))
def err(msg):  print(red(f"  ✗ {msg}"))
def info(msg): print(f"  {msg}")

# ─────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────
ROOT         = os.path.dirname(os.path.abspath(__file__))
APP_DIR      = os.path.join(ROOT, "app")
SERVER_DIR   = os.path.join(ROOT, "server")
CONFIG_FILE  = os.path.join(ROOT, "run.config.json")
APP_JSON     = os.path.join(APP_DIR, "app.json")
NOTIF_CTX    = os.path.join(APP_DIR, "src", "context", "NotificationContext.js")
CONFIG_JS    = os.path.join(APP_DIR, "src", "constants", "config.js")
SERVER_ENV   = os.path.join(SERVER_DIR, ".env")
DRUG_API_DIR = os.path.join(SERVER_DIR, "packages", "medbot", "drugDatabase")

# ─────────────────────────────────────────
# GLOBAL PROCESSES
# ─────────────────────────────────────────
server_proc   = None
expo_proc     = None
drug_api_proc = None

# ─────────────────────────────────────────
# PHASE 1 — LOAD CONFIG
# ─────────────────────────────────────────
def load_config():
    print(bold("\n── Phase 1: Loading Config ──────────────────"))

    if not os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "w") as f:
            json.dump({
                "expo_project_id": "YOUR_PROJECT_ID_HERE",
                "expo_username":   "YOUR_EXPO_USERNAME_HERE",
                "groq_api_key":    "YOUR_GROQ_API_KEY_HERE",
                "mongo_uri":       "YOUR_MONGO_URI_HERE"
            }, f, indent=2)
        warn("run.config.json was missing — created with defaults.")
        info("Please fill in your details and run again:")
        info("  expo_project_id : from expo.dev → your project → Project ID")
        info("  expo_username   : your Expo account username")
        info("  groq_api_key    : from console.groq.com → API Keys")
        info("  mongo_uri       : your MongoDB connection string")
        sys.exit(1)

    with open(CONFIG_FILE, "r") as f:
        config = json.load(f)

    project_id   = config.get("expo_project_id", "")
    username     = config.get("expo_username", "")
    groq_api_key = config.get("groq_api_key", "")
    mongo_uri    = config.get("mongo_uri", "")

    if project_id == "YOUR_PROJECT_ID_HERE" or username == "YOUR_EXPO_USERNAME_HERE":
        err("run.config.json still has default values.")
        info("Please update:")
        info("  expo_project_id : from expo.dev → your project → Project ID")
        info("  expo_username   : your Expo account username")
        info("  groq_api_key    : from console.groq.com → API Keys")
        info("  mongo_uri       : your MongoDB connection string")
        sys.exit(1)

    if not groq_api_key or groq_api_key == "YOUR_GROQ_API_KEY_HERE":
        err("groq_api_key is missing or not set in run.config.json.")
        info("Get your key from: https://console.groq.com → API Keys")
        info("Then add it to run.config.json as: \"groq_api_key\": \"gsk_...\"")
        sys.exit(1)

    if not mongo_uri or mongo_uri == "YOUR_MONGO_URI_HERE":
        err("mongo_uri is missing or not set in run.config.json.")
        info("Format: mongodb+srv://username:password@cluster.mongodb.net/dbname")
        sys.exit(1)

    ok(f"Project ID   : {project_id}")
    ok(f"Expo user    : {username}")
    ok(f"Groq API key : {groq_api_key[:8]}{'*' * (len(groq_api_key) - 8)}")
    ok(f"Mongo URI    : {mongo_uri[:30]}...")
    return project_id, username, groq_api_key, mongo_uri

# ─────────────────────────────────────────
# PHASE 2 — PREREQUISITE CHECKS
# ─────────────────────────────────────────
def check_prerequisites():
    print(bold("\n── Phase 2: Prerequisite Checks ─────────────"))
    issues = []

    # Python version
    if sys.version_info < (3, 6):
        err(f"Python 3.6+ required. Found: {sys.version}")
        issues.append("python")
    else:
        ok(f"Python {sys.version.split()[0]}")

    # Node.js
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        version = result.stdout.strip().lstrip("v")
        major = int(version.split(".")[0])
        if major < 16:
            err(f"Node.js v16+ required. Found: v{version}")
            issues.append("node")
        else:
            ok(f"Node.js v{version}")
    except FileNotFoundError:
        err("Node.js not found. Install from nodejs.org")
        issues.append("node")

    # npm
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True, shell=(platform.system() == "Windows"))
        ok(f"npm v{result.stdout.strip()}")
    except FileNotFoundError:
        err("npm not found.")
        issues.append("npm")

    # EAS CLI
    try:
        result = subprocess.run(["eas", "--version"], capture_output=True, text=True, shell=(platform.system() == "Windows"))
        ok(f"EAS CLI found")
    except FileNotFoundError:
        err("EAS CLI not found.")
        info("    Run: npm install -g eas-cli")
        issues.append("eas")

    # EAS login
    if "eas" not in issues:
        try:
            result = subprocess.run(
                ["eas", "whoami"],
                capture_output=True, text=True,
                shell=(platform.system() == "Windows")
            )
            if result.returncode == 0:
                ok(f"EAS logged in as: {result.stdout.strip()}")
            else:
                err("Not logged into EAS.")
                info("    Run: eas login")
                issues.append("eas_login")
        except Exception:
            err("Could not verify EAS login.")
            issues.append("eas_login")

    if issues:
        err("Fix the above issues and run again.")
        sys.exit(1)

# ─────────────────────────────────────────
# FIREWALL CHECK (Windows only)
# ─────────────────────────────────────────
def check_firewall():
    print(bold("\n── Firewall Check ───────────────────────────"))

    if platform.system() != "Windows":
        ok("Non-Windows system — firewall check skipped.")
        return

    is_admin = False
    try:
        is_admin = ctypes.windll.shell32.IsUserAnAdmin()
    except Exception:
        pass

    rules = {
        "Expo Metro": "8081",
        "App Server": "5000",
        "App Socket": "5001",
        "Drug API":   "8000"
    }

    if not is_admin:
        warn("Not running as Administrator — cannot auto-configure firewall.")
        info("    Run these commands manually in an admin terminal:")
        for name, port in rules.items():
            info(f'    netsh advfirewall firewall add rule name="{name}" dir=in action=allow protocol=TCP localport={port}')
        return

    for name, port in rules.items():
        check = subprocess.run(
            ["netsh", "advfirewall", "firewall", "show", "rule", f"name={name}"],
            capture_output=True, text=True
        )
        if "No rules match" in check.stdout or check.returncode != 0:
            subprocess.run([
                "netsh", "advfirewall", "firewall", "add", "rule",
                f"name={name}", "dir=in", "action=allow",
                "protocol=TCP", f"localport={port}"
            ], capture_output=True)
            ok(f"Firewall rule added: {name} (port {port})")
        else:
            ok(f"Firewall rule exists: {name} (port {port})")

# ─────────────────────────────────────────
# PHASE 3 — UPDATE FILES FROM CONFIG
# ─────────────────────────────────────────
def update_files_from_config(project_id, username):
    print(bold("\n── Phase 3: Updating Files from Config ──────"))

    # Update app.json
    with open(APP_JSON, "r") as f:
        app_json = json.load(f)

    app_json["expo"]["extra"] = {
        "eas": {
            "projectId": project_id
        }
    }
    app_json["expo"]["owner"] = username

    with open(APP_JSON, "w") as f:
        json.dump(app_json, f, indent=2)
    ok("app.json updated with projectId and owner")

    # Update NotificationContext.js
    with open(NOTIF_CTX, "r") as f:
        content = f.read()

    old_pattern = r'Notifications\.getExpoPushTokenAsync\(.*?\)'
    new_call = f'Notifications.getExpoPushTokenAsync({{ projectId: \'{project_id}\' }})'
    new_content = re.sub(old_pattern, new_call, content, flags=re.DOTALL)

    with open(NOTIF_CTX, "w") as f:
        f.write(new_content)
    ok("NotificationContext.js updated with projectId")

# ─────────────────────────────────────────
# PHASE 3b — INJECT KEYS INTO SERVER/.ENV
# ─────────────────────────────────────────
def update_server_env(groq_api_key, mongo_uri):
    print(bold("\n── Phase 3b: Updating server/.env ───────────"))

    if not os.path.exists(SERVER_ENV):
        err(f"server/.env not found at: {SERVER_ENV}")
        info("    Create server/.env and run again.")
        sys.exit(1)

    with open(SERVER_ENV, "r") as f:
        lines = f.readlines()

    groq_line      = f"GROQ_API_KEY={groq_api_key}\n"
    drug_api_line  = "MEDICINE_API_URL=http://localhost:8000\n"
    mongo_line     = f"MONGO_URI={mongo_uri}\n"

    groq_found     = False
    drug_api_found = False
    mongo_found    = False
    new_lines      = []

    for line in lines:
        if line.startswith("GROQ_API_KEY="):
            new_lines.append(groq_line)
            groq_found = True
        elif line.startswith("MEDICINE_API_URL="):
            new_lines.append(drug_api_line)
            drug_api_found = True
        elif line.startswith("MONGO_URI="):
            new_lines.append(mongo_line)
            mongo_found = True
        else:
            new_lines.append(line)

    if not groq_found:
        new_lines.append(groq_line)
    if not drug_api_found:
        new_lines.append(drug_api_line)
    if not mongo_found:
        new_lines.append(mongo_line)

    with open(SERVER_ENV, "w") as f:
        f.writelines(new_lines)

    ok("GROQ_API_KEY injected into server/.env")
    ok("MEDICINE_API_URL set in server/.env")
    ok("MONGO_URI injected into server/.env")

# ─────────────────────────────────────────
# PHASE 4 — AUTO IP DETECTION & CONFIG UPDATE
# ─────────────────────────────────────────
def detect_and_update_ip(usb_mode=False):
    print(bold("\n── Phase 4: IP Detection & config.js Update ─"))

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        warn("Could not detect local IP automatically.")
        local_ip = input("    Enter your PC's local IP manually: ").strip()

    ok(f"Detected IP: {local_ip}")

    api_host = "localhost" if usb_mode else local_ip

    with open(CONFIG_JS, "r") as f:
        content = f.read()

    content = re.sub(
        r"(API_BASE_URL\s*=\s*process\.env\.API_BASE_URL\s*\|\|\s*')[^']*(')",
        rf"\g<1>http://{api_host}:5000\g<2>",
        content
    )
    content = re.sub(
        r"(SOCKET_URL\s*=\s*process\.env\.SOCKET_URL\s*\|\|\s*')[^']*(')",
        rf"\g<1>http://{api_host}:5001\g<2>",
        content
    )

    with open(CONFIG_JS, "w") as f:
        f.write(content)

    if usb_mode:
        ok("config.js updated — using localhost (USB mode)")
    else:
        ok(f"config.js updated — using {local_ip} (WiFi mode)")

    return local_ip

# ─────────────────────────────────────────
# PHASE 5 — DEPENDENCY INSTALLATION
# ─────────────────────────────────────────
def run_install(label, cmd, cwd):
    print(f"  ⟳ {label}...")
    result = subprocess.run(
        cmd, cwd=cwd, shell=(platform.system() == "Windows"),
        stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    if result.returncode == 0:
        ok(label)
    else:
        warn(f"{label} had warnings (may be okay)")

def install_dependencies():
    print(bold("\n── Phase 5: Installing Dependencies ─────────"))

    run_install("npm install (root)",   "npm install",   ROOT)
    run_install("npm install (server)", "npm install",   SERVER_DIR)
    run_install(
        "npm install nodemailer --legacy-peer-deps (server)",
        "npm install nodemailer --legacy-peer-deps", SERVER_DIR
    )
    run_install("npm install (app)", "npm install --legacy-peer-deps", APP_DIR)
    run_install(
        "npx expo install expo-camera expo-asset expo-document-picker (app)",
        "npx expo install expo-camera expo-asset expo-document-picker",
        APP_DIR
    )
    run_install(
        "npm install expo-camera expo-asset expo-document-picker (root)",
        "npm install expo-camera expo-asset expo-document-picker",
        ROOT
    )

    # Install Python dependencies for Drug API
    run_install(
        "pip install -r requirements.txt (drug API)",
        "pip install -r requirements.txt",
        DRUG_API_DIR
    )

# ─────────────────────────────────────────
# PHASE 6 — ADB / USB DEVICE SETUP
# ─────────────────────────────────────────
def setup_adb():
    print(bold("\n── Phase 6: Android USB Device Setup ────────"))

    try:
        result = subprocess.run(
            ["adb", "version"],
            capture_output=True, text=True,
            shell=(platform.system() == "Windows")
        )
        if result.returncode != 0:
            raise FileNotFoundError
        ok("ADB found")
    except FileNotFoundError:
        warn("ADB not found — USB debugging unavailable.")
        info("    Falling back to WiFi mode.")
        return False

    result = subprocess.run(
        ["adb", "devices"],
        capture_output=True, text=True,
        shell=(platform.system() == "Windows")
    )
    lines = [
        l.strip() for l in result.stdout.strip().splitlines()
        if l.strip() and "List of devices" not in l
    ]
    devices      = [l for l in lines if "device" in l and "offline" not in l and "unauthorized" not in l]
    unauthorized = [l for l in lines if "unauthorized" in l]
    offline      = [l for l in lines if "offline" in l]

    if unauthorized:
        warn("Device found but unauthorized.")
        info("    Please check your phone and tap 'Allow USB Debugging'.")
        info("    Falling back to WiFi mode.")
        return False

    if offline:
        warn("Device found but offline.")
        info("    Try unplugging and replugging your USB cable.")
        info("    Falling back to WiFi mode.")
        return False

    if not devices:
        warn("No Android device detected via USB.")
        info("    Make sure USB Debugging is enabled.")
        info("    Falling back to WiFi mode.")
        return False

    ok(f"Device connected: {devices[0].split()[0]}")

    ports = [
        ("Metro bundler", "8081"),
        ("API server",    "5000"),
        ("Socket server", "5001"),
        ("Drug API",      "8000"),
    ]

    all_ok = True
    for label, port in ports:
        result = subprocess.run(
            ["adb", "reverse", f"tcp:{port}", f"tcp:{port}"],
            capture_output=True, text=True,
            shell=(platform.system() == "Windows")
        )
        if result.returncode == 0:
            ok(f"ADB reverse port {port} ({label})")
        else:
            warn(f"Failed to reverse port {port} ({label}): {result.stderr.strip()}")
            all_ok = False

    if all_ok:
        ok("USB mode ready — open Expo Go and enter: exp://localhost:8081")
        return True
    else:
        warn("Some ports failed — falling back to WiFi mode.")
        return False

# ─────────────────────────────────────────
# PHASE 7 — CONFIRMATION PROMPT
# ─────────────────────────────────────────
def confirm_start(project_id, username, local_ip, usb_mode):
    print(bold("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"))
    print(bold("  Smart Medicine Reminder — Ready Summary"))
    print(bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"))
    ok(f"Expo user     : {username}")
    ok(f"Project ID    : {project_id}")
    ok(f"Detected IP   : {local_ip}")
    ok("config.js     : updated")
    ok("app.json      : updated")
    ok("server/.env   : GROQ_API_KEY + MONGO_URI + MEDICINE_API_URL updated")
    ok("NotificationContext.js : updated")
    ok("Dependencies  : installed")
    if usb_mode:
        ok("Connection    : USB (ADB) — use exp://localhost:8081 in Expo Go")
    else:
        ok(f"Connection    : WiFi — use exp://{local_ip}:8081 in Expo Go")
    print(bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"))

    answer = input(cyan("  Ready to start servers? (Y/n): ")).strip().lower()
    if answer == "n":
        print(yellow("\n  Aborted. Run again when ready."))
        sys.exit(0)

# ─────────────────────────────────────────
# PHASE 8 — START SERVERS
# ─────────────────────────────────────────
def stream_output(proc, prefix, color):
    for line in iter(proc.stdout.readline, b""):
        try:
            print(f"{color}[{prefix}]{C.RESET} {line.decode('utf-8', errors='replace').rstrip()}")
        except Exception:
            pass

def wait_for_port(port, label, timeout=60):
    print(f"\n  ⟳ Waiting for {label} on port {port}...")
    start = time.time()
    while time.time() - start < timeout:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1)
            s.connect(("localhost", port))
            s.close()
            ok(f"{label} is ready!")
            return True
        except Exception:
            time.sleep(2)
    warn(f"{label} did not respond within timeout — continuing anyway.")
    return False

def launch_on_device():
    try:
        result = subprocess.run(
            ["adb", "shell", "am", "start",
             "-a", "android.intent.action.VIEW",
             "-d", "exp://localhost:8081",
             "host.exp.exponent"],
            capture_output=True, text=True,
            shell=(platform.system() == "Windows")
        )
        if result.returncode == 0:
            ok("App launched on device via Expo Go")
        else:
            warn(f"Could not auto-launch app: {result.stderr.strip()}")
            info("    Open Expo Go manually and enter: exp://localhost:8081")
    except Exception as e:
        warn(f"Could not auto-launch app: {e}")
        info("    Open Expo Go manually and enter: exp://localhost:8081")

def keyboard_listener(usb_mode):
    if usb_mode:
        print(cyan("  [r + Enter] to restart app on device  |  [Ctrl+C] to stop\n"))
    else:
        print(cyan("  [Ctrl+C] to stop\n"))
    while True:
        try:
            cmd = input().strip().lower()
            if cmd == "r":
                if usb_mode:
                    print(cyan("\n  ⟳ Restarting app on device..."))
                    launch_on_device()
                else:
                    warn("Restart only available in USB mode.")
                    info(f"    Open Expo Go manually and enter: exp://localhost:8081")
        except (EOFError, KeyboardInterrupt):
            break

def start_servers(usb_mode=False):
    global server_proc, expo_proc, drug_api_proc

    print(bold("\n── Phase 8: Starting Servers ─────────────────"))

    # Start Drug API (FastAPI)
    print(f"\n  ⟳ Starting Drug API (FastAPI on port 8000)...")
    drug_api_proc = subprocess.Popen(
        "python medicine_api.py",
        cwd=DRUG_API_DIR,
        shell=(platform.system() == "Windows"),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )
    threading.Thread(
        target=stream_output,
        args=(drug_api_proc, "DRUG-API", C.CYAN),
        daemon=True
    ).start()
    wait_for_port(8000, "Drug API")

    # Start backend
    print(f"\n  ⟳ Starting backend server...")
    server_proc = subprocess.Popen(
        "npm run dev",
        cwd=SERVER_DIR,
        shell=(platform.system() == "Windows"),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )
    threading.Thread(
        target=stream_output,
        args=(server_proc, "SERVER", C.GREEN),
        daemon=True
    ).start()
    wait_for_port(5000, "Backend")

    # Start Expo
    print(f"\n  ⟳ Starting Expo...")
    expo_proc = subprocess.Popen(
        "npx expo start --clear --tunnel" if not usb_mode else "npx expo start --clear",
        cwd=APP_DIR,
        shell=(platform.system() == "Windows"),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )
    threading.Thread(
        target=stream_output,
        args=(expo_proc, "EXPO", C.BLUE),
        daemon=True
    ).start()

    if usb_mode:
        wait_for_port(8081, "Metro bundler")
        launch_on_device()

    ok("All servers started.")

    threading.Thread(
        target=keyboard_listener,
        args=(usb_mode,),
        daemon=True
    ).start()

    try:
        while True:
            time.sleep(1)
            if drug_api_proc.poll() is not None:
                warn("Drug API stopped unexpectedly.")
                break
            if server_proc.poll() is not None:
                warn("Backend server stopped unexpectedly.")
                break
            if expo_proc.poll() is not None:
                warn("Expo stopped unexpectedly.")
                break
    except KeyboardInterrupt:
        pass

# ─────────────────────────────────────────
# PHASE 9 — CLEAN EXIT
# ─────────────────────────────────────────
def shutdown(sig=None, frame=None):
    print(yellow("\n\n  Shutting down servers..."))
    if drug_api_proc and drug_api_proc.poll() is None:
        drug_api_proc.terminate()
        ok("Drug API stopped")
    if server_proc and server_proc.poll() is None:
        server_proc.terminate()
        ok("Backend stopped")
    if expo_proc and expo_proc.poll() is None:
        expo_proc.terminate()
        ok("Expo stopped")
    print(green("  ✓ Done\n"))
    sys.exit(0)

signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────
if __name__ == "__main__":
    if platform.system() == "Windows":
        os.system("color")

    print(bold(cyan("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")))
    print(bold(cyan("   Smart Medicine Reminder — Dev Runner")))
    print(bold(cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")))

    project_id, username, groq_api_key, mongo_uri = load_config()
    check_prerequisites()
    check_firewall()
    update_files_from_config(project_id, username)
    update_server_env(groq_api_key, mongo_uri)
    local_ip = detect_and_update_ip()
    install_dependencies()
    usb_mode = setup_adb()
    if usb_mode:
        detect_and_update_ip(usb_mode=True)
    confirm_start(project_id, username, local_ip, usb_mode)
    start_servers(usb_mode)