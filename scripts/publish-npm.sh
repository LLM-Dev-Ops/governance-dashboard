#!/bin/bash

# Script to publish npm packages to npmjs.org
# This script publishes packages under the @llm-dev-ops organization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Publishing npm packages to npmjs.org${NC}"
echo ""

# Check if npm is logged in
if ! npm whoami &> /dev/null; then
    echo -e "${RED}Error: Not logged in to npm${NC}"
    echo "Please run: npm login"
    exit 1
fi

# Get the logged in npm user
NPM_USER=$(npm whoami)
echo -e "${GREEN}Logged in as: ${NPM_USER}${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Function to publish a package
publish_package() {
    local package_dir=$1
    local package_name=$2

    echo -e "${YELLOW}Publishing ${package_name}...${NC}"

    cd "$package_dir"

    # Install dependencies
    echo "  Installing dependencies..."
    npm install

    # Build the package
    echo "  Building package..."
    npm run build

    # Check if package version already exists
    PACKAGE_VERSION=$(node -p "require('./package.json').version")
    if npm view "${package_name}@${PACKAGE_VERSION}" version &> /dev/null; then
        echo -e "${YELLOW}  Version ${PACKAGE_VERSION} already published, skipping...${NC}"
        cd - > /dev/null
        return 0
    fi

    # Publish
    echo "  Publishing to npmjs.org..."
    npm publish --access public

    echo -e "${GREEN}  ✓ Successfully published ${package_name}@${PACKAGE_VERSION}${NC}"
    echo ""

    cd - > /dev/null
}

# Publish packages in order (types first, then sdk)
echo "Publishing packages..."
echo ""

# 1. Publish @llm-dev-ops/types
publish_package "packages/types" "@llm-dev-ops/types"

# 2. Publish @llm-dev-ops/sdk
publish_package "packages/sdk" "@llm-dev-ops/sdk"

echo -e "${GREEN}All packages published successfully!${NC}"
echo ""
echo "Packages published:"
echo "  - @llm-dev-ops/types"
echo "  - @llm-dev-ops/sdk"
echo ""
echo "View on npmjs.org:"
echo "  - https://www.npmjs.com/package/@llm-dev-ops/types"
echo "  - https://www.npmjs.com/package/@llm-dev-ops/sdk"
