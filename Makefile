# ============================================================================
# LLM Governance Dashboard - Makefile
# ============================================================================
# Convenient make commands for development, testing, and deployment
# ============================================================================

.PHONY: help install build test dev clean deploy lint format check security \
        docker-build docker-up docker-down k8s-deploy db-migrate db-seed \
        start stop restart logs perf ci

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

# ============================================================================
# Help
# ============================================================================

help: ## Show this help message
	@echo ""
	@echo "$(CYAN)LLM Governance Dashboard - Available Commands$(NC)"
	@echo "$(CYAN)================================================$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Quick Start:$(NC)"
	@echo "  1. make install    - Install dependencies"
	@echo "  2. make setup      - Setup development environment"
	@echo "  3. make dev        - Start development mode"
	@echo ""

# ============================================================================
# Setup & Installation
# ============================================================================

install: ## Install all dependencies
	@echo "$(CYAN)Installing dependencies...$(NC)"
	@cargo --version || (echo "$(RED)Rust not found. Install from https://rustup.rs/$(NC)" && exit 1)
	@node --version || (echo "$(RED)Node.js not found. Install from https://nodejs.org/$(NC)" && exit 1)
	@cargo install cargo-watch cargo-llvm-cov sqlx-cli --no-default-features --features postgres || true
	@cd frontend && npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

setup: install ## Setup development environment (databases, migrations, seeds)
	@echo "$(CYAN)Setting up development environment...$(NC)"
	@bash scripts/setup-dev.sh
	@echo "$(GREEN)✓ Development environment ready$(NC)"

# ============================================================================
# Development
# ============================================================================

dev: ## Start all services in development mode
	@echo "$(CYAN)Starting development environment...$(NC)"
	@bash scripts/start-services.sh

start: dev ## Alias for 'make dev'

stop: ## Stop all running services
	@echo "$(CYAN)Stopping all services...$(NC)"
	@bash scripts/stop-services.sh

restart: stop start ## Restart all services

watch: ## Watch and rebuild services on file changes
	@echo "$(CYAN)Starting watch mode...$(NC)"
	@cargo watch -x 'build --workspace'

# ============================================================================
# Building
# ============================================================================

build: ## Build all services (debug mode)
	@echo "$(CYAN)Building all services...$(NC)"
	@bash scripts/build-all.sh

build-release: ## Build all services (release mode)
	@echo "$(CYAN)Building all services (release mode)...$(NC)"
	@bash scripts/build-all.sh --release

build-clean: clean build ## Clean and rebuild everything

# ============================================================================
# Testing
# ============================================================================

test: ## Run all tests
	@echo "$(CYAN)Running all tests...$(NC)"
	@bash scripts/test-all.sh

test-coverage: ## Run tests with coverage
	@echo "$(CYAN)Running tests with coverage...$(NC)"
	@bash scripts/test-all.sh --coverage

test-backend: ## Run only backend tests
	@echo "$(CYAN)Running backend tests...$(NC)"
	@cargo test --workspace

test-frontend: ## Run only frontend tests
	@echo "$(CYAN)Running frontend tests...$(NC)"
	@cd frontend && npm run test

test-e2e: ## Run E2E tests
	@echo "$(CYAN)Running E2E tests...$(NC)"
	@cd frontend && npm run test:e2e

test-watch: ## Run tests in watch mode
	@cargo watch -x 'test --workspace'

# ============================================================================
# Code Quality
# ============================================================================

lint: ## Run all linters
	@echo "$(CYAN)Running linters...$(NC)"
	@cargo fmt --all -- --check
	@cargo clippy --all-targets --all-features -- -D warnings
	@cd frontend && npm run check

format: ## Format all code
	@echo "$(CYAN)Formatting code...$(NC)"
	@cargo fmt --all
	@echo "$(GREEN)✓ Code formatted$(NC)"

check: lint test ## Run linters and tests

security: ## Run security audit
	@echo "$(CYAN)Running security audit...$(NC)"
	@cargo audit || echo "$(YELLOW)Install cargo-audit: cargo install cargo-audit$(NC)"
	@cd frontend && npm audit

# ============================================================================
# Database
# ============================================================================

db-migrate: ## Run database migrations
	@echo "$(CYAN)Running database migrations...$(NC)"
	@bash scripts/db-migrate.sh

db-seed: ## Seed database with initial data
	@echo "$(CYAN)Seeding database...$(NC)"
	@bash scripts/db-seed.sh

db-reset: ## Reset database (migrate + seed)
	@echo "$(CYAN)Resetting database...$(NC)"
	@bash scripts/db-migrate.sh
	@bash scripts/db-seed.sh

db-shell: ## Open PostgreSQL shell
	@echo "$(CYAN)Opening database shell...$(NC)"
	@PGPASSWORD=password psql -h localhost -p 5432 -U postgres -d llm_governance

# ============================================================================
# Docker & Docker Compose
# ============================================================================

docker-build: ## Build Docker images
	@echo "$(CYAN)Building Docker images...$(NC)"
	@docker-compose build

docker-up: ## Start services with docker-compose
	@echo "$(CYAN)Starting Docker services...$(NC)"
	@docker-compose up -d

docker-down: ## Stop docker-compose services
	@echo "$(CYAN)Stopping Docker services...$(NC)"
	@docker-compose down

docker-logs: ## View docker-compose logs
	@docker-compose logs -f

docker-ps: ## Show running containers
	@docker-compose ps

docker-clean: ## Clean Docker images and containers
	@echo "$(CYAN)Cleaning Docker resources...$(NC)"
	@docker-compose down -v
	@docker system prune -f

# ============================================================================
# Deployment
# ============================================================================

deploy-local: ## Deploy locally with Docker Compose
	@echo "$(CYAN)Deploying locally...$(NC)"
	@bash scripts/deploy-local.sh

deploy-k8s: ## Deploy to Kubernetes
	@echo "$(CYAN)Deploying to Kubernetes...$(NC)"
	@bash scripts/deploy-k8s.sh

deploy-k8s-helm: ## Deploy to Kubernetes using Helm
	@echo "$(CYAN)Deploying to Kubernetes with Helm...$(NC)"
	@bash scripts/deploy-k8s.sh --use-helm

# ============================================================================
# Performance & CI
# ============================================================================

perf: ## Run performance tests
	@echo "$(CYAN)Running performance tests...$(NC)"
	@bash scripts/run-performance-tests.sh

perf-stress: ## Run stress tests
	@echo "$(CYAN)Running stress tests...$(NC)"
	@bash scripts/run-performance-tests.sh --scenario stress

ci: ## Run CI/CD pipeline simulation
	@echo "$(CYAN)Running CI/CD pipeline...$(NC)"
	@bash scripts/ci-pipeline.sh

# ============================================================================
# Logs & Monitoring
# ============================================================================

logs: ## Tail all service logs
	@tail -f logs/services/*.log

logs-auth: ## Tail auth service logs
	@tail -f logs/services/auth-service.log

logs-gateway: ## Tail API gateway logs
	@tail -f logs/services/api-gateway.log

logs-frontend: ## Tail frontend logs
	@tail -f logs/services/frontend.log

# ============================================================================
# Cleaning
# ============================================================================

clean: ## Clean build artifacts
	@echo "$(CYAN)Cleaning build artifacts...$(NC)"
	@cargo clean
	@rm -rf frontend/build frontend/.svelte-kit
	@rm -rf logs/* coverage/* ci-artifacts/*
	@echo "$(GREEN)✓ Cleaned$(NC)"

clean-all: clean docker-clean ## Clean everything including Docker

# ============================================================================
# Utilities
# ============================================================================

version: ## Show versions of all tools
	@echo "$(CYAN)Tool Versions:$(NC)"
	@echo "  Rust:       $$(rustc --version)"
	@echo "  Cargo:      $$(cargo --version)"
	@echo "  Node.js:    $$(node --version)"
	@echo "  npm:        $$(npm --version)"
	@echo "  Docker:     $$(docker --version 2>/dev/null || echo 'not installed')"
	@echo "  kubectl:    $$(kubectl version --client --short 2>/dev/null || echo 'not installed')"
	@echo "  Helm:       $$(helm version --short 2>/dev/null || echo 'not installed')"

status: ## Show status of all services
	@echo "$(CYAN)Service Status:$(NC)"
	@if [ -f logs/services/services.pid ]; then \
		while IFS=: read -r service pid port; do \
			if kill -0 $$pid 2>/dev/null; then \
				echo "  $(GREEN)✓$(NC) $$service (PID: $$pid, Port: $$port)"; \
			else \
				echo "  $(RED)✗$(NC) $$service (not running)"; \
			fi; \
		done < logs/services/services.pid; \
	else \
		echo "  $(YELLOW)No services running$(NC)"; \
	fi

health: ## Check health of all services
	@echo "$(CYAN)Health Check:$(NC)"
	@curl -sf http://localhost:8080/health && echo "  $(GREEN)✓$(NC) API Gateway" || echo "  $(RED)✗$(NC) API Gateway"
	@curl -sf http://localhost:8081/health && echo "  $(GREEN)✓$(NC) Auth Service" || echo "  $(RED)✗$(NC) Auth Service"
	@curl -sf http://localhost:8082/health && echo "  $(GREEN)✓$(NC) User Service" || echo "  $(RED)✗$(NC) User Service"
	@curl -sf http://localhost:8083/health && echo "  $(GREEN)✓$(NC) Policy Service" || echo "  $(RED)✗$(NC) Policy Service"
	@curl -sf http://localhost:8084/health && echo "  $(GREEN)✓$(NC) Audit Service" || echo "  $(RED)✗$(NC) Audit Service"
	@curl -sf http://localhost:8085/health && echo "  $(GREEN)✓$(NC) Metrics Service" || echo "  $(RED)✗$(NC) Metrics Service"
	@curl -sf http://localhost:8086/health && echo "  $(GREEN)✓$(NC) Cost Service" || echo "  $(RED)✗$(NC) Cost Service"
	@curl -sf http://localhost:8087/health && echo "  $(GREEN)✓$(NC) Integration Service" || echo "  $(RED)✗$(NC) Integration Service"

docs: ## Generate and open documentation
	@echo "$(CYAN)Generating documentation...$(NC)"
	@cargo doc --workspace --no-deps --open

# ============================================================================
# Git Hooks
# ============================================================================

hooks: ## Install git hooks
	@echo "$(CYAN)Installing git hooks...$(NC)"
	@echo "#!/bin/bash\nmake lint" > .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "$(GREEN)✓ Git hooks installed$(NC)"
