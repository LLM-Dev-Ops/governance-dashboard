# Contributing to LLM Governance Dashboard

Thank you for your interest in contributing to the LLM Governance Dashboard! We welcome contributions from the community and are grateful for your support.

**Version:** 1.0
**Last Updated:** November 16, 2025

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
3. [Development Setup](#development-setup)
4. [Code Style Guide](#code-style-guide)
5. [Testing Requirements](#testing-requirements)
6. [Pull Request Process](#pull-request-process)
7. [Issue Reporting](#issue-reporting)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. We pledge to make participation in our project a harassment-free experience for everyone, regardless of:

- Age
- Body size
- Disability
- Ethnicity
- Gender identity and expression
- Level of experience
- Nationality
- Personal appearance
- Race
- Religion
- Sexual identity and orientation

### Our Standards

**Positive Behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards others

**Unacceptable Behavior:**
- Trolling, insulting, or derogatory comments
- Personal or political attacks
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the project team at conduct@llm-governance.example. All complaints will be reviewed and investigated promptly and fairly.

---

## How to Contribute

### Types of Contributions

We welcome many types of contributions:

**Code Contributions:**
- Bug fixes
- New features
- Performance improvements
- Security enhancements
- Test coverage improvements

**Documentation:**
- Fixing typos or errors
- Adding examples
- Improving clarity
- Translating documentation

**Community:**
- Answering questions in discussions
- Reviewing pull requests
- Reporting bugs
- Suggesting features
- Writing blog posts or tutorials

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a branch** for your changes
4. **Make your changes** following our guidelines
5. **Test your changes** thoroughly
6. **Submit a pull request**

---

## Development Setup

### Prerequisites

**Required:**
- Rust 1.75 or later
- Node.js 18 or later
- PostgreSQL 14 or later
- Redis 7 or later
- Git
- Docker (optional, for containerized development)

**Recommended:**
- Visual Studio Code or IntelliJ IDEA
- Rust Analyzer extension
- PostgreSQL client (psql or pgAdmin)
- Redis client (redis-cli or RedisInsight)

### Initial Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/llm-governance-dashboard.git
cd llm-governance-dashboard

# 2. Add upstream remote
git remote add upstream https://github.com/your-org/llm-governance-dashboard.git

# 3. Install Rust dependencies
cargo build

# 4. Install frontend dependencies
cd frontend
npm install
cd ..

# 5. Set up environment variables
cp .env.example .env
# Edit .env with your local configuration

# 6. Set up databases
createdb llm_governance_auth
createdb llm_governance_users
createdb llm_governance_policies
createdb llm_governance_audit
createdb llm_governance_metrics
createdb llm_governance_cost
createdb llm_governance_gateway
createdb llm_governance_integrations

# 7. Run migrations
./scripts/migrate-all.sh

# 8. Start Redis
redis-server &

# 9. Run tests to verify setup
cargo test --workspace
```

### Development Workflow

```bash
# Start all backend services
./scripts/dev-start.sh

# Or start individual services
cargo run -p auth-service
cargo run -p user-service
# etc.

# Start frontend (in separate terminal)
cd frontend
npm run dev

# Run tests
cargo test --workspace
cargo test -p auth-service  # specific service

# Format code
cargo fmt --all

# Lint code
cargo clippy --workspace -- -D warnings

# Build for production
cargo build --release --workspace
```

### Docker Development

```bash
# Start all services with Docker Compose
docker-compose -f docker-compose.dev.yml up

# Rebuild after code changes
docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose logs -f auth-service

# Stop all services
docker-compose down
```

---

## Code Style Guide

### Rust Code Style

**Follow Rust conventions:**

```rust
// Use descriptive names
fn calculate_total_cost(requests: &[LlmRequest]) -> f64 {
    requests.iter().map(|r| r.cost).sum()
}

// Document public APIs
/// Calculates the total cost of all LLM requests
///
/// # Arguments
/// * `requests` - Slice of LLM requests to sum
///
/// # Returns
/// Total cost in USD
pub fn calculate_total_cost(requests: &[LlmRequest]) -> f64 {
    requests.iter().map(|r| r.cost).sum()
}

// Use Result for error handling
pub async fn create_user(data: CreateUserRequest) -> Result<User, AppError> {
    // Implementation
}

// Prefer idiomatic Rust
// Good
let user_ids: Vec<Uuid> = users.iter().map(|u| u.id).collect();

// Avoid
let mut user_ids = Vec::new();
for user in users {
    user_ids.push(user.id);
}
```

**Error Handling:**

```rust
// Use thiserror for custom errors
#[derive(Debug, thiserror::Error)]
pub enum PolicyError {
    #[error("Policy not found: {0}")]
    NotFound(Uuid),

    #[error("Invalid policy configuration: {0}")]
    InvalidConfiguration(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
}
```

**Testing:**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_calculate_cost() {
        let requests = vec![
            LlmRequest { cost: 0.05, ..Default::default() },
            LlmRequest { cost: 0.03, ..Default::default() },
        ];

        let total = calculate_total_cost(&requests);
        assert_eq!(total, 0.08);
    }
}
```

### TypeScript/React Code Style

**Follow modern React conventions:**

```typescript
// Use functional components with hooks
export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Spinner />;
  if (!user) return <NotFound />;

  return <div>{user.name}</div>;
};

// Use TypeScript types
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

type UserRole = 'admin' | 'user' | 'auditor';

// Prefer async/await
async function fetchUser(id: string): Promise<User> {
  const response = await api.get(`/users/${id}`);
  return response.data;
}
```

### General Guidelines

**File Organization:**
- One component/module per file
- Group related files in directories
- Use index.ts for barrel exports
- Keep files under 300 lines

**Naming Conventions:**
- `snake_case` for Rust (files, functions, variables)
- `PascalCase` for types and structs
- `SCREAMING_SNAKE_CASE` for constants
- `camelCase` for TypeScript (functions, variables)
- `PascalCase` for React components

**Comments:**
- Explain WHY, not WHAT
- Use doc comments for public APIs
- Keep comments up to date
- Remove commented-out code

---

## Testing Requirements

### Test Coverage

We aim for high test coverage:

- **Minimum:** 70% code coverage
- **Target:** 85% code coverage
- **Critical paths:** 100% coverage (auth, policy engine, audit logs)

### Types of Tests

**Unit Tests:**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_validation() {
        assert!(validate_password("StrongP@ss123").is_ok());
        assert!(validate_password("weak").is_err());
    }

    #[tokio::test]
    async fn test_user_creation() {
        let pool = setup_test_db().await;
        let user = create_user(&pool, "test@example.com").await.unwrap();
        assert_eq!(user.email, "test@example.com");
    }
}
```

**Integration Tests:**

```rust
#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_full_auth_flow() {
        let app = spawn_app().await;

        // Register user
        let response = app.post_register(/* ... */).await;
        assert_eq!(response.status(), 201);

        // Login
        let response = app.post_login(/* ... */).await;
        assert_eq!(response.status(), 200);

        // Access protected resource
        let token = extract_token(&response);
        let response = app.get_profile(token).await;
        assert_eq!(response.status(), 200);
    }
}
```

**Frontend Tests:**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('displays user information', async () => {
    render(<UserProfile userId="123" />);

    await screen.findByText('John Doe');
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    render(<UserProfile userId="123" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
# Run all tests
cargo test --workspace
npm test

# Run specific test
cargo test test_password_validation
npm test UserProfile

# Run with coverage
cargo tarpaulin --out Html
npm test -- --coverage

# Run integration tests only
cargo test --test '*'

# Run in watch mode (frontend)
npm test -- --watch
```

### Test Database

```bash
# Tests should use a separate test database
export DATABASE_URL=postgresql://localhost/llm_governance_test

# Clean up between tests
async fn setup_test_db() -> PgPool {
    let pool = PgPool::connect(&database_url).await.unwrap();
    sqlx::query("TRUNCATE TABLE users CASCADE")
        .execute(&pool)
        .await
        .unwrap();
    pool
}
```

---

## Pull Request Process

### Before Submitting

**Checklist:**

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No merge conflicts
- [ ] Commit messages are clear

### Creating a Pull Request

```bash
# 1. Update your fork
git fetch upstream
git checkout main
git merge upstream/main

# 2. Create a feature branch
git checkout -b feature/add-email-notifications

# 3. Make your changes
# ... code, commit, repeat ...

# 4. Push to your fork
git push origin feature/add-email-notifications

# 5. Create PR on GitHub
```

### PR Title Format

Use conventional commits format:

```
type(scope): description

Examples:
feat(auth): add email verification
fix(policy): correct rate limit calculation
docs(readme): update installation instructions
test(audit): add integration tests for log export
refactor(cost): simplify budget calculation
perf(api): optimize database queries
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where needed
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
- [ ] Any dependent changes have been merged

## Screenshots (if applicable)
Add screenshots here

## Related Issues
Closes #123
Relates to #456
```

### Review Process

1. **Automated Checks**
   - CI/CD pipeline runs automatically
   - Code formatting checked
   - Tests must pass
   - No security vulnerabilities

2. **Code Review**
   - At least one approval required
   - Reviewers assigned automatically
   - Address review comments
   - Re-request review after changes

3. **Merge**
   - Squash and merge (default)
   - Delete branch after merge
   - PR author merges after approval

### Review Guidelines

**For Reviewers:**

- Be respectful and constructive
- Review within 2 business days
- Focus on:
  - Correctness
  - Security
  - Performance
  - Maintainability
  - Test coverage
- Use GitHub suggestions for simple fixes
- Approve when satisfied

**For Authors:**

- Respond to all comments
- Don't take feedback personally
- Ask for clarification if needed
- Mark conversations as resolved
- Re-request review after changes

---

## Issue Reporting

### Bug Reports

**Before reporting:**

1. Check existing issues
2. Try latest version
3. Verify it's reproducible
4. Gather necessary information

**Bug Report Template:**

```markdown
## Bug Description
Clear description of the bug

## To Reproduce
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Environment
- OS: [e.g., Ubuntu 22.04]
- Version: [e.g., 1.0.0]
- Browser: [e.g., Chrome 118]
- Deployment: [Docker/K8s/Source]

## Logs
```
Paste relevant logs here
```

## Screenshots
Add screenshots if applicable

## Additional Context
Any other relevant information
```

### Feature Requests

**Feature Request Template:**

```markdown
## Problem Statement
What problem does this solve?

## Proposed Solution
Describe your proposed solution

## Alternatives Considered
Other approaches you've thought about

## Use Cases
Real-world scenarios where this would be useful

## Priority
- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low

## Additional Context
Any other relevant information
```

### Security Issues

**DO NOT** open public issues for security vulnerabilities!

Instead:
1. Email security@llm-governance.example
2. Include detailed description
3. Include steps to reproduce
4. Allow time for fix before public disclosure
5. We'll credit you in the security advisory

---

## Additional Resources

### Documentation

- [User Guide](USER_GUIDE.md)
- [Admin Guide](ADMIN_GUIDE.md)
- [API Documentation](https://api-docs.llm-governance.example)
- [Architecture Overview](ARCHITECTURE.md)

### Community

- **Discord**: https://discord.gg/llm-governance
- **Forum**: https://community.llm-governance.example
- **Blog**: https://blog.llm-governance.example
- **Twitter**: @llmgovernance

### Development

- **GitHub**: https://github.com/your-org/llm-governance-dashboard
- **CI/CD**: https://github.com/your-org/llm-governance-dashboard/actions
- **Project Board**: https://github.com/orgs/your-org/projects/1

---

## Recognition

### Contributors

All contributors will be recognized in:

- CONTRIBUTORS.md file
- Release notes
- Project website
- Annual thank you blog post

### Levels of Recognition

**Bronze**: 1-5 merged PRs
**Silver**: 6-20 merged PRs
**Gold**: 21+ merged PRs
**Platinum**: Significant contributions (maintainer level)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

**Contact:**
- Email: contribute@llm-governance.example
- Discord: #contributors channel
- GitHub Discussions: Q&A section

---

**Thank you for contributing to the LLM Governance Dashboard!**

We appreciate your time and effort in making this project better for everyone.

---

**Version:** 1.0
**Last Updated:** November 16, 2025
