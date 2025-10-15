# Git Commit Conventions

This document outlines the commit message format used in this project.

## Format

```
<type>: <subject>

[optional body]

[optional footer]
```

## Types

- **feat**: A new feature for the user
- **fix**: A bug fix
- **docs**: Documentation only changes
- **chore**: Changes to build process, dependencies, or auxiliary tools
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **style**: Changes that don't affect code meaning (formatting, whitespace, etc.)
- **test**: Adding or updating tests
- **perf**: Performance improvements
- **delete**: Removing code or files

## Guidelines

### Subject Line

- Use imperative mood ("add feature" not "added feature")
- Don't capitalize first letter
- No period at the end
- Keep under 50 characters when possible

### Body (Optional)

- Use bullet points with `-` or `*`
- Explain **what** and **why**, not **how**
- Wrap at 72 characters

### Examples

#### Simple commit

```
feat: add user authentication
```

#### Commit with body

```
fix: resolve database connection timeout

- Increase connection pool size to 20
- Add retry logic for failed connections
- Update timeout from 5s to 30s
```

#### Multiple changes

```
feat: implement guild management dashboard

- Add guild detail page with auth checks
- Create channels list component
- Implement owner verification
- Add navigation from guild list to detail page
```

#### Breaking changes

```
feat: migrate to new API version

BREAKING CHANGE: API endpoints now require authentication token
in header instead of query parameter
```

## Tips

- Commit early and often
- Each commit should be a logical unit of work
- If you use "and" in your subject, consider splitting into multiple commits
- Reference issue numbers when applicable: `fix: resolve login issue (#123)`
