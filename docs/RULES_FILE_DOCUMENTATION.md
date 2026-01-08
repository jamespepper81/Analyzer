# .rules File Documentation

## Overview

The `.rules` file in the repository root provides a lightweight framework for enforcing security best practices, coding standards, and project-specific guardrails. It helps prevent common security vulnerabilities like hardcoded secrets and accidental commits of sensitive files.

## File Structure

The `.rules` file uses YAML format and consists of several sections:

### 1. Metadata
- `version`: Schema version (currently `1`)
- `description`: Brief explanation of the file's purpose

### 2. Policies
A list of security and coding rules that are enforced across the repository.

#### Policy: `security.no_hardcoded_secrets`
**Purpose**: Prevents committing hardcoded API keys, tokens, passwords, and other secrets.

**Severity**: Error (hard-stop)

**Applies to**:
- JavaScript/TypeScript files (`**/*.{js,jsx,ts,tsx}`)
- Python files (`**/*.py`)
- Go and Ruby files (`**/*.{go,rb}`)
- Configuration files (`**/*.{yml,yaml,json}`)
- Shell scripts (`**/*.{sh,bash}`)

**Detection patterns**:
- Generic secret patterns (e.g., `apiKey = "abc123"`)
- AWS Access Key IDs (`AKIA...`)
- GitHub Personal Access Tokens (`ghp_...`)
- Google API keys (`AIza...`)
- OpenAI API keys (`sk-...`)
- PEM private keys (`-----BEGIN PRIVATE KEY-----`)

**Exclusions**:
Safe placeholders containing keywords like: `example`, `sample`, `placeholder`, `dummy`, `test`, `changeme`, `<...>`, `REDACTED`

**Remediation**:
Use environment variables instead:
```javascript
// ❌ Bad
const apiKey = "sk-abc123xyz789"

// ✅ Good
const apiKey = process.env.OPENAI_API_KEY
```

#### Policy: `security.block_env_files`
**Purpose**: Prevents committing `.env` files that contain secrets.

**Severity**: Error (hard-stop)

**Applies to**:
- `**/.env`
- `**/.env.*` (e.g., `.env.local`, `.env.production`)
- `**/*.env` (e.g., `config.env`)

**Exclusions**:
Template and example files that should be committed:
- `**/.env.example`
- `**/.env.sample`
- `**/*.env.example`
- `**/*.env.sample`

**Why this matters**: The rule allows safe template files (`.env.example`) to be committed while blocking actual environment files that contain real secrets.

**Remediation**:
1. Add `.env*` to `.gitignore`
2. Commit only `.env.example` with placeholder values
3. Provide actual values via CI/CD, Docker/K8s secrets, or local `.env` files
4. Document required environment variables in README

#### Policy: `security.suspicious_config_keys`
**Purpose**: Warns about potential secrets in configuration files.

**Severity**: Warning (soft nudge)

**Applies to**:
- YAML files (`**/*.{yml,yaml}`)
- JSON files (`**/*.json`)

**Detection patterns**:
Looks for keys like `secret`, `token`, `apiKey`, `password`, `client_secret`, `private_key` followed by string values.

**Remediation**:
Use environment variable references or secret management tools (e.g., External Secrets, SOPS, HashiCorp Vault).

### 3. Settings

#### AI Coding Assistant Guardrails
Provides guidance for AI coding assistants:
- Never propose adding literal secrets to source files
- Default to environment variables or secure vaults
- Use obvious placeholders only (e.g., `<YOUR_API_KEY>`)

### 4. Ignore Paths

Directories and files excluded from rule enforcement:

**Documentation and Examples**:
- `tests/**` - Test files (may contain mock data)
- `examples/**` - Example code (may contain placeholders)
- `docs/**` - Documentation files

**Build Artifacts**:
- `node_modules/**` - Package dependencies
- `.next/**` - Next.js build output
- `build/**` - Build artifacts
- `dist/**` - Distribution files
- `.genkit/**` - Genkit AI flow cache
- `out/**` - Export output
- `coverage/**` - Test coverage reports

## Validation

The `.rules` file has been thoroughly tested and validated:

✅ YAML syntax is valid  
✅ All regex patterns compile correctly  
✅ Template files (`.env.example`) are properly excluded  
✅ Actual secret files (`.env`) are blocked  
✅ Build artifacts are ignored to reduce noise  

### Test Results

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| `.env.example` | ALLOWED | ALLOWED | ✅ |
| `.env.sample` | ALLOWED | ALLOWED | ✅ |
| `config.env.example` | ALLOWED | ALLOWED | ✅ |
| `.env` | BLOCKED | BLOCKED | ✅ |
| `.env.local` | BLOCKED | BLOCKED | ✅ |
| `.env.production` | BLOCKED | BLOCKED | ✅ |
| `config.env` | BLOCKED | BLOCKED | ✅ |

## Usage

### For Developers

The `.rules` file is designed to work with:
1. **Git hooks** (pre-commit hooks)
2. **CI/CD pipelines** (GitHub Actions, GitLab CI)
3. **AI coding assistants** (GitHub Copilot, cursor, etc.)
4. **Manual code review** (as a reference guide)

### Adding New Rules

To add a new policy:

1. Copy an existing policy block as a template
2. Update the `id`, `severity`, `message`, and `applies_to` sections
3. Define appropriate `match` patterns
4. Add `exclude` or `exclude_if` clauses if needed
5. Provide clear `remediation` guidance
6. Test the new rule thoroughly

Example:
```yaml
- id: custom.my_new_rule
  severity: warning
  message: Description of the issue
  applies_to:
    globs:
      - "**/*.ts"
  match:
    any:
      - regex: "pattern-to-match"
  remediation:
    guidance: |
      How to fix this issue...
```

### Severity Levels

- `error`: Hard-stop, must be fixed (security risks)
- `warning`: Soft nudge, should be addressed (best practices)
- `info`: Team reminders (code style, documentation)

## Best Practices

1. **Keep rules minimal**: Start with security essentials, expand gradually
2. **Balance strictness**: Too many rules create noise, too few miss issues
3. **Provide clear remediation**: Every rule should explain how to fix the issue
4. **Use appropriate severity**: Reserve `error` for security and compliance
5. **Test patterns thoroughly**: Ensure regex patterns don't cause false positives
6. **Document exceptions**: Use `exclude` and `exclude_if` wisely

## Troubleshooting

### False Positives

If a rule incorrectly flags safe code:
1. Check if the code matches an exclusion pattern
2. Add specific exclusions to the rule
3. Consider using `exclude_if` for pattern-based exclusions

### False Negatives

If a rule misses actual issues:
1. Review and strengthen the regex patterns
2. Add additional patterns to the `match` section
3. Test with real examples from the codebase

### Performance Issues

If rule checking is slow:
1. Add appropriate paths to the `ignore` section
2. Use more specific glob patterns in `applies_to`
3. Optimize complex regex patterns

## Maintenance

### Regular Reviews

Periodically review the `.rules` file to:
- Add patterns for new secret types
- Update exclusion patterns based on false positives
- Expand ignored paths for new build tools
- Adjust severity levels based on team feedback

### Version History

- **v1.0** (2026-01-08):
  - Initial implementation with 3 security policies
  - Critical fix: Allow `.env.example` and `.env.sample` files
  - Added build artifacts to ignore list
  - Comprehensive validation and testing

## Related Files

- `.gitignore` - Prevents committing files to git (complementary to `.rules`)
- `README.md` - Documents environment variables and setup
- `AGENTS.md` - References `.env.example` in installation instructions

## Support

For questions or issues related to the `.rules` file:
1. Review this documentation
2. Check the validation tests in `/tmp/validate_rules.py`
3. Consult the team for guidance on adding new rules

---

**Last Updated**: 2026-01-08  
**Maintained By**: BitSleuth Development Team
