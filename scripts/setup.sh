#!/bin/bash

set -e

echo "========================================="
echo "LLM Governance Dashboard - Setup Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Rust is installed
echo "Checking for Rust installation..."
if ! command -v rustc &> /dev/null; then
    echo -e "${YELLOW}Rust is not installed. Installing Rust...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    echo -e "${GREEN}Rust installed successfully!${NC}"
else
    echo -e "${GREEN}Rust is already installed: $(rustc --version)${NC}"
fi

# Check if PostgreSQL is installed
echo ""
echo "Checking for PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL is not installed. Please install PostgreSQL 14 or later.${NC}"
    echo "Visit: https://www.postgresql.org/download/"
else
    echo -e "${GREEN}PostgreSQL is installed: $(psql --version)${NC}"
fi

# Check if Redis is installed
echo ""
echo "Checking for Redis installation..."
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}Redis is not installed. Please install Redis 7 or later.${NC}"
    echo "Visit: https://redis.io/download"
else
    echo -e "${GREEN}Redis is installed: $(redis-cli --version)${NC}"
fi

# Copy .env.example to .env if it doesn't exist
echo ""
echo "Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}.env file created from .env.example${NC}"
    echo -e "${YELLOW}Please edit .env and configure your environment variables!${NC}"
else
    echo -e "${GREEN}.env file already exists${NC}"
fi

# Install sqlx-cli if not present
echo ""
echo "Checking for sqlx-cli..."
if ! command -v sqlx &> /dev/null; then
    echo -e "${YELLOW}Installing sqlx-cli...${NC}"
    cargo install sqlx-cli --no-default-features --features postgres
    echo -e "${GREEN}sqlx-cli installed successfully!${NC}"
else
    echo -e "${GREEN}sqlx-cli is already installed${NC}"
fi

# Build the workspace
echo ""
echo "Building the workspace..."
cargo build
echo -e "${GREEN}Workspace built successfully!${NC}"

echo ""
echo "========================================="
echo -e "${GREEN}Setup complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env with your configuration"
echo "2. Set up PostgreSQL databases (see README.md)"
echo "3. Start Redis: redis-server"
echo "4. Run migrations for each service"
echo "5. Start the services: cargo run -p <service-name>"
echo ""
