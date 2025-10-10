# Documentation Guide Overview

## Purpose

This document explains how to use the documentation suite and which guide to reference for different needs.

## Documentation Structure

### Quick Reference Docs
For understanding what's built and how to use it:

- **[README.md](./README.md)** - Start here for navigation
- **[FUNCTIONALITY_SUMMARY.md](./FUNCTIONALITY_SUMMARY.md)** - What's implemented
- **[bot/](./bot/)** - How components work
- **[sql/](./sql/)** - Database schema details

### Implementation Guides
For building and maintaining the system:

- **[FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md)** - Requirements and behaviors
- **[TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md)** - Architecture and patterns
- **[OPERATIONAL_GUIDE.md](./OPERATIONAL_GUIDE.md)** - Running in production
- **[SECURITY_GUIDE.md](./SECURITY_GUIDE.md)** - Security practices

## When to Use Each Guide

### "I'm new to this project"
1. Start with [README.md](./README.md)
2. Read [FUNCTIONALITY_SUMMARY.md](./FUNCTIONALITY_SUMMARY.md)
3. Review [bot/architecture.md](./bot/architecture.md)

### "I'm implementing a new feature"
1. Check [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) for requirements
2. Follow [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) for patterns
3. Implement security from [SECURITY_GUIDE.md](./SECURITY_GUIDE.md)
4. Reference [bot/services.md](./bot/services.md) for integration

### "I'm deploying to production"
1. Follow [OPERATIONAL_GUIDE.md](./OPERATIONAL_GUIDE.md) deployment steps
2. Implement [SECURITY_GUIDE.md](./SECURITY_GUIDE.md) checklist
3. Set up monitoring per operational guide

### "I'm debugging an issue"
1. Check [OPERATIONAL_GUIDE.md](./OPERATIONAL_GUIDE.md) troubleshooting
2. Review [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) error handling
3. Examine [bot/events.md](./bot/events.md) for event flow

### "I'm reviewing code"
1. Verify SOLID/DRY from [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md)
2. Check validation from [SECURITY_GUIDE.md](./SECURITY_GUIDE.md)
3. Confirm error handling patterns
4. Review SQL injection prevention

### "I'm maintaining the database"
1. Reference [sql/tables.md](./sql/tables.md) for schema
2. Follow [OPERATIONAL_GUIDE.md](./OPERATIONAL_GUIDE.md) for maintenance
3. Check [sql/indexes.md](./sql/indexes.md) for performance

## Key Concepts Cross-Reference

### SOLID Principles
- **Explained**: [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md#solid-principles)
- **Examples**: [bot/services.md](./bot/services.md), [bot/architecture.md](./bot/architecture.md)
- **Pattern**: Service layer, repository pattern

### DRY Principle
- **Explained**: [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md#dry-principle-implementation)
- **Examples**: `lib/build_snapshot.py`, `lib/gather*.py`
- **Pattern**: Shared utilities, reusable functions

### Error Handling
- **Strategy**: [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md#error-handling-strategy)
- **Discord Errors**: [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md#discord-api-errors)
- **Implementation**: [bot/events.md](./bot/events.md#error-handling)
- **Operations**: [OPERATIONAL_GUIDE.md](./OPERATIONAL_GUIDE.md#troubleshooting)

### Input Validation
- **Rules**: [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md#validation-rules)
- **Implementation**: [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md#validation-strategy)
- **Security**: [SECURITY_GUIDE.md](./SECURITY_GUIDE.md#input-validation)

### Discord API
- **Considerations**: [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md#discord-api-considerations)
- **Integration**: [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md#discord-api-integration)
- **Events**: [bot/events.md](./bot/events.md)

### Security
- **Authentication**: [SECURITY_GUIDE.md](./SECURITY_GUIDE.md#authentication--authorization)
- **SQL Injection**: [SECURITY_GUIDE.md](./SECURITY_GUIDE.md#sql-injection-prevention)
- **Data Protection**: [SECURITY_GUIDE.md](./SECURITY_GUIDE.md#data-protection)
- **Operations**: [OPERATIONAL_GUIDE.md](./OPERATIONAL_GUIDE.md#security)

### Database
- **Schema**: [sql/tables.md](./sql/tables.md)
- **Operations**: [bot/database.md](./bot/database.md)
- **Maintenance**: [OPERATIONAL_GUIDE.md](./OPERATIONAL_GUIDE.md#database-maintenance)

## Documentation Principles

### Keep It Simple
- No overly complex explanations
- Practical examples
- Clear action items

### Stay Current
- Update docs with code changes
- Document new features
- Remove obsolete information

### Be Comprehensive
- Cover functional, technical, operational, security
- Include examples and patterns
- Provide troubleshooting steps

### Focus on Reuse
- Reference existing docs
- Avoid duplication
- Link related content

## Contributing to Docs

### When Adding Features
1. Update FUNCTIONALITY_SUMMARY.md
2. Add to relevant bot/ or sql/ docs
3. Update FUNCTIONAL_SPEC.md if requirements change
4. Document security considerations

### When Fixing Bugs
1. Update OPERATIONAL_GUIDE.md troubleshooting
2. Document root cause
3. Add prevention measures

### When Refactoring
1. Update TECHNICAL_SPEC.md if patterns change
2. Update architecture diagrams
3. Verify SOLID/DRY principles maintained

## Quick Links

### For Developers
- [Architecture](./bot/architecture.md)
- [Technical Spec](./TECHNICAL_SPEC.md)
- [Security Guide](./SECURITY_GUIDE.md)

### For Operators
- [Operational Guide](./OPERATIONAL_GUIDE.md)
- [Database Schema](./sql/README.md)

### For Security Review
- [Security Guide](./SECURITY_GUIDE.md)
- [Functional Spec](./FUNCTIONAL_SPEC.md) (validation)
- [Technical Spec](./TECHNICAL_SPEC.md) (error handling)

### For Architecture Review
- [Architecture](./bot/architecture.md)
- [Technical Spec](./TECHNICAL_SPEC.md) (SOLID/DRY)
- [Services](./bot/services.md)
