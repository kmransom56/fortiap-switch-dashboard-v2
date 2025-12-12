# GitHub Repository Setup Guide

## Creating the New Repository

### Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `fortiap-switch-dashboard-v2` (or your preferred name)
3. Description: "Advanced Fortinet network monitoring dashboard with 3D visualization, connected device tracking, and force-directed graphs"
4. Visibility: Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### Step 2: Connect Local Repository to GitHub

```bash
cd /home/keransom/fortiap-switch-dashboard-v2

# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/fortiap-switch-dashboard-v2.git

# Or if using SSH:
# git remote add origin git@github.com:YOUR_USERNAME/fortiap-switch-dashboard-v2.git
```

### Step 3: Initial Commit and Push

```bash
# Stage all files
git add .

# Create initial commit
git commit -m "Initial commit: FortiAP/Switch Dashboard v2.0 with 3D visualization, connected devices, and force graph"

# Push to GitHub
git branch -M main
git push -u origin main
```

## Repository Settings

### Recommended Settings

1. **Branch Protection**: Enable branch protection for `main` branch
2. **Issues**: Enable issues for bug tracking
3. **Discussions**: Enable discussions for Q&A
4. **Wiki**: Optional, enable if needed
5. **Actions**: Enable GitHub Actions for CI/CD

### Topics/Tags

Add these topics to your repository:
- `fortinet`
- `fortigate`
- `fortiap`
- `fortiswitch`
- `network-monitoring`
- `3d-visualization`
- `babylonjs`
- `d3js`
- `dashboard`
- `network-management`
- `force-graph`
- `topology-visualization`

## GitHub Actions (Optional)

Create `.github/workflows/ci.yml` for automated testing:

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [14.x, 16.x, 18.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linting
      run: npm run lint
```

## Release Management

### Creating Releases

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a new release on GitHub:
   - Tag: `v2.0.0`
   - Title: `v2.0.0 - Initial Release`
   - Description: Copy from CHANGELOG.md

### Version Tags

Use semantic versioning:
- `v2.0.0` - Major release
- `v2.1.0` - Minor release (new features)
- `v2.0.1` - Patch release (bug fixes)

## Documentation

### README Badges

Add badges to README.md:

```markdown
![GitHub release](https://img.shields.io/github/release/YOUR_USERNAME/fortiap-switch-dashboard-v2)
![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/fortiap-switch-dashboard-v2)
![GitHub license](https://img.shields.io/github/license/YOUR_USERNAME/fortiap-switch-dashboard-v2)
![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)
![Python](https://img.shields.io/badge/python-%3E%3D3.7.0-brightgreen)
```

## Security

### Security Policy

Create `SECURITY.md`:

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

Please report security vulnerabilities to security@yourdomain.com
```

### Dependabot

Enable Dependabot for automated dependency updates:
- Go to repository Settings → Security → Dependabot alerts
- Enable Dependabot security updates

## Contributing

### Contributing Guidelines

Create `CONTRIBUTING.md` with:
- Code style guidelines
- Testing requirements
- Pull request process
- Development setup

## License

Add `LICENSE` file (MIT recommended):

```text
MIT License

Copyright (c) 2025 Your Name

Permission is hereby granted...
```

## Next Steps

1. ✅ Create GitHub repository
2. ✅ Push initial code
3. ⏳ Set up branch protection
4. ⏳ Configure GitHub Actions
5. ⏳ Add repository topics
6. ⏳ Create first release
7. ⏳ Set up documentation site (optional)
