#!/usr/bin/env python3
"""Install or refresh the MyInvestor LaunchAgent on the destination Mac."""
import os
from pathlib import Path
import plistlib
import shutil
import subprocess

root = Path(__file__).resolve().parent.parent
home = Path.home()
label = "com.myinvestor.api"
domain = f"gui/{os.getuid()}"
target = f"{domain}/{label}"
node = shutil.which("node")
port = int(os.environ.get("PORT", "3003"))

if not node or not (root / "apps/web/dist/index.html").is_file():
    raise SystemExit("Ejecutá npm ci && npm run build con Node en el PATH.")
if not 1024 <= port <= 65535:
    raise SystemExit("Elegí un puerto entre 1024 y 65535.")

agents = home / "Library/LaunchAgents"
logs = home / "Library/Logs/MyInvestor"
agents.mkdir(parents=True, exist_ok=True)
logs.mkdir(parents=True, exist_ok=True)
plist = agents / f"{label}.plist"
config = plistlib.dumps({
    "Label": label,
    "ProgramArguments": [node, str(root / "apps/api/server.js")],
    "WorkingDirectory": str(root),
    "EnvironmentVariables": {"PORT": str(port)},
    "RunAtLoad": True,
    "KeepAlive": True,
    "StandardOutPath": str(logs / "api.log"),
    "StandardErrorPath": str(logs / "api.err"),
})
loaded = subprocess.run(["launchctl", "print", target], capture_output=True).returncode == 0
if loaded and plist.exists() and plist.read_bytes() == config:
    subprocess.run(["launchctl", "kickstart", "-k", target], check=True)
else:
    if loaded:
        subprocess.run(["launchctl", "bootout", target], check=True)
    plist.write_bytes(config)
    subprocess.run(["launchctl", "bootstrap", domain, str(plist)], check=True)
print(f"MyInvestor: verificá http://127.0.0.1:{port}/health")
