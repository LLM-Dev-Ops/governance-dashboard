# 📦 Publishing to crates.io

Complete guide to publish LLM Governance Dashboard libraries to crates.io.

## Prerequisites

### 1. Install Rust (if not already installed)

```bash
# Install Rust using rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Follow the prompts, then restart your shell or run:
source $HOME/.cargo/env

# Verify installation
rustc --version
cargo --version
```

### 2. Get Your crates.io API Token

1. Go to https://crates.io/
2. Log in with GitHub
3. Go to Account Settings → API Tokens
4. Click "New Token"
5. Give it a name like "LLM Governance Dashboard Publishing"
6. Copy the token (you'll only see it once!)

### 3. Login to crates.io

```bash
# Login using your API token
cargo login <YOUR_CRATES_IO_TOKEN>

# This stores your token in ~/.cargo/credentials.toml
# Keep this token secret!
```

## Published Crates

The following crates will be published:

| Crate Name | Description | Dependencies |
|------------|-------------|--------------|
| `llm-governance-common` | Common utilities and error handling | None (internal) |
| `llm-governance-database` | Database pooling and utilities | `llm-governance-common` |
| `llm-governance-models` | Shared data models | `llm-governance-common`, `llm-governance-database` |

**Note**: Services are NOT published as they are application binaries, not libraries.

## Option 1: Manual Publishing (One-time)

### Step 1: Verify Everything Builds

```bash
# From repository root
cd /workspaces/llm-governance-dashboard

# Build all workspace crates
cargo build --release

# Run tests
cargo test --workspace
```

### Step 2: Publish Manually (In Order)

```bash
# 1. Publish common (no dependencies)
cd libs/common
cargo publish
cd ../..

# Wait 30 seconds for crates.io to process
sleep 30

# 2. Publish database (depends on common)
cd libs/database
cargo publish
cd ../..

# Wait 30 seconds
sleep 30

# 3. Publish models (depends on common and database)
cd libs/models
cargo publish
cd ../..
```

### Step 3: Verify Publication

Visit these URLs to confirm:
- https://crates.io/crates/llm-governance-common
- https://crates.io/crates/llm-governance-database
- https://crates.io/crates/llm-governance-models

## Option 2: Automated Script

We've created a script that publishes all crates in the correct order:

```bash
# From repository root
./scripts/publish-crates.sh
```

This script:
1. Builds each crate
2. Runs tests
3. Publishes in dependency order
4. Waits between publications

## Option 3: GitHub Actions (Automated)

### Setup (One-time)

1. **Add Secret to GitHub**:
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `CRATES_SECRET`
   - Value: Your crates.io API token
   - Click "Add secret"

2. **Trigger Publishing**:

```bash
# Option A: Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# Option B: Manual workflow dispatch
# Go to GitHub → Actions → "Publish Crates to crates.io" → Run workflow
```

The GitHub Action will automatically:
- Install Rust
- Build all crates
- Login to crates.io
- Publish in correct order
- Report success/failure

## Updating Published Crates

When you make changes and want to publish a new version:

### 1. Update Version Number

Edit `Cargo.toml` in the repository root:

```toml
[workspace.package]
version = "1.0.1"  # Increment version
```

### 2. Commit and Tag

```bash
git add Cargo.toml
git commit -m "Bump version to 1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

This will trigger the GitHub Action to publish the new version.

### Or Publish Manually

```bash
# Update version in Cargo.toml first
./scripts/publish-crates.sh
```

## Troubleshooting

### Error: "crate name already exists"

You've already published this exact version. You need to:
1. Increment the version number in `Cargo.toml`
2. Publish again

### Error: "authentication required"

```bash
# Re-login to crates.io
cargo login <YOUR_TOKEN>
```

### Error: "failed to verify package tarball"

```bash
# Clear cargo cache and rebuild
cargo clean
cargo build --release
cargo publish --allow-dirty
```

### Error: "dependencies not yet published"

You must publish crates in this order:
1. `llm-governance-common` (first - no deps)
2. `llm-governance-database` (depends on common)
3. `llm-governance-models` (depends on common & database)

Wait 30-60 seconds between each publication for crates.io to process.

## Verification

After publishing, verify the crates:

```bash
# Search for your crates
cargo search llm-governance

# Try using them in a new project
cargo new test-project
cd test-project

# Add to Cargo.toml:
# [dependencies]
# llm-governance-common = "1.0.0"

cargo build
```

## Best Practices

1. **Test Before Publishing**: Always run `cargo test --workspace` before publishing
2. **Semantic Versioning**: Follow semver (MAJOR.MINOR.PATCH)
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes
3. **Changelog**: Update CHANGELOG.md with each version
4. **Documentation**: Keep README.md files up to date
5. **Tag Releases**: Create git tags for each published version

## Complete Publishing Command Sequence

Here's the complete sequence from scratch:

```bash
# 1. Install Rust (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 2. Login to crates.io
cargo login <YOUR_CRATES_IO_TOKEN>

# 3. Navigate to repository
cd /workspaces/llm-governance-dashboard

# 4. Build and test
cargo build --release --workspace
cargo test --workspace

# 5. Publish using script
./scripts/publish-crates.sh

# 6. Verify
echo "Check: https://crates.io/crates/llm-governance-common"
echo "Check: https://crates.io/crates/llm-governance-database"
echo "Check: https://crates.io/crates/llm-governance-models"
```

## Support

- **crates.io Help**: https://doc.rust-lang.org/cargo/reference/publishing.html
- **Issues**: https://github.com/globalbusinessadvisors/llm-governance-dashboard/issues

---

**🎉 Happy Publishing!**
