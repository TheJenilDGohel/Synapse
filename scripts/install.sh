#!/bin/bash
# Loci Universal Installer for Linux & macOS
# Usage: curl -sSL https://raw.githubusercontent.com/TheJenilDGohel/Loci/main/scripts/install.sh | bash

set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e ""
echo -e "  ${CYAN}Loci Universal Installer${NC}"
echo -e "  ${GRAY}----------------------------${NC}"
echo -e ""

# 1. Check for Node.js
echo -n "[1/3] Checking environment..."
if ! command -v node &> /dev/null; then
    echo -e " ${RED}FAILED${NC}"
    echo -e " Error: Node.js is not installed. Please install it from https://nodejs.org/"
    exit 1
fi
node_version=$(node -v | cut -d 'v' -f 2)
major_version=$(echo $node_version | cut -d '.' -f 1)
echo -e " ${GREEN}OK (v$node_version)${NC}"

if [ "$major_version" -lt 22 ]; then
    echo -e " ${GRAY}Note: Node.js 22+ is recommended for full feature support (local memory & vector search).${NC}"
fi

# 2. Install Loci
echo -e "[2/3] Installing Loci via NPM..."
if npm install -g loci-mcp 2>/dev/null; then
    echo -e " ${GREEN}Installation successful.${NC}"
else
    echo -e " ${GRAY}Standard install failed, trying with sudo...${NC}"
    sudo npm install -g loci-mcp
fi

# 3. Trigger Onboarding
echo -e "[3/3] Launching neural link..."
loci onboard

echo -e ""
echo -e "  ${GREEN}Setup Complete! Type 'loci' to get started.${NC}"
echo -e ""
