# Contributing to Unified FortiAP/Switch Dashboard

Thank you for your interest in contributing! This guide will help you get started with contributing to the Unified FortiAP/Switch Dashboard project.

---

## 🚀 Quick Start for Contributors

### **1. Fork and Clone**
```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/fortiap-switch-dashboard.git
cd fortiap-switch-dashboard

# Add upstream repository
git remote add upstream https://github.com/ORIGINAL_OWNER/fortiap-switch-dashboard.git
```

### **2. Setup Development Environment**
```bash
# Run the setup script for your platform
# Windows
.\setup-unified.bat

# Linux/macOS
chmod +x setup-unified.sh
./setup-unified.sh

# Copy and configure environment
cp shared/.env.example shared/.env
# Edit shared/.env with your development settings
```

### **3. Install Dependencies**
```bash
# Node.js dependencies
npm install

# Python dependencies
pip install -r babylon_3d/requirements.txt
pip install aiohttp-cors  # Required for Python service
```

### **4. Start Development Services**
```bash
# Start all services
# Windows
.\start-dev.bat

# Linux/macOS
./start-dev.sh

# Or start manually for debugging
# Terminal 1: API Gateway
node shared/api-gateway.js

# Terminal 2: Python Service
cd babylon_3d && py python_api_service.py

# Terminal 3: Dashboard
cd shared && node combined-dashboard.js
```

### **5. Verify Setup**
```bash
python test-integration.py
```

You should see: `🎉 Integration test successful!`

---

## 🏗️ Project Structure

```
fortiap-switch-dashboard/
├── shared/                          # Shared components
│   ├── api-gateway.js              # Main API Gateway ⭐
│   ├── combined-dashboard.js        # Unified dashboard
│   ├── model-library.js            # 3D model management
│   └── .env.example                # Environment template
├── babylon_3d/                      # 3D visualization
│   ├── python_api_service.py       # Python discovery service ⭐
│   ├── fortigate_api_integration.py # FortiGate API client
│   └── babylon_app/                # Babylon.js frontend
├── test-integration.py             # Integration tests ⭐
├── setup-unified.sh/.bat           # Setup scripts
├── start-dev.sh/.bat               # Startup scripts
├── Dockerfile & docker-compose.yml # Docker configuration
└── README.md                       # Main documentation
```

**⭐ Key files for contributors**

---

## 🧪 Testing Before Contributing

### **Run Integration Tests**
```bash
python test-integration.py
```

**Expected output:**
```
🧪 Starting Comprehensive Integration Tests
==================================================
✅ File Structure: PASS
✅ Package Json: PASS
✅ Shared Config: PASS
✅ Javascript Modules: PASS
✅ Python Dependencies: PASS
✅ Docker Configuration: PASS
✅ Api Gateway Service: PASS
✅ Api Gateway Endpoints: PASS
📈 Summary: 8 passed, 0 failed, 2 skipped (10 total)
🎉 Integration test successful!
```

### **Manual Testing**
```bash
# Test API Gateway
curl http://localhost:13001/health
curl http://localhost:13001/api/topology

# Test Python Service
curl http://localhost:13002/topology

# Test Dashboard
curl http://localhost:13000/
```

### **Service Status Check**
```bash
# Check all services are running
netstat -an | grep -E ":13001|:13002|:13000|:3001"
```

---

## 🐛 Bug Reports

### **Before Creating a Bug Report**
1. Check existing [Issues](../../issues)
2. Run integration tests: `python test-integration.py`
3. Check the [Troubleshooting Guide](README.md#troubleshooting)

### **Creating a Bug Report**
Use the bug report template:

```markdown
## Bug Description
Brief description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 11, Ubuntu 22.04]
- Node.js version: [e.g., 18.17.0]
- Python version: [e.g., 3.9.0]
- Browser: [e.g., Chrome 119]

## Integration Test Results
```
🧪 Starting Comprehensive Integration Tests
[Paste test output here]
```

## Additional Context
Logs, screenshots, or other relevant information
```

---

## ✨ Feature Requests

### **Before Requesting a Feature**
1. Check existing [Issues](../../issues) and [Pull Requests](../../pulls)
2. Review the [Roadmap](README.md#roadmap)
3. Consider if it fits the project scope

### **Creating a Feature Request**
```markdown
## Feature Description
Clear description of the proposed feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches you've thought about

## Implementation Ideas
Technical suggestions or implementation approach
```

---

## 🔧 Development Workflow

### **1. Create a Feature Branch**
```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-number-description
```

### **2. Make Changes**
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed
- Test your changes frequently

### **3. Test Your Changes**
```bash
# Run integration tests
python test-integration.py

# Test specific functionality
curl http://localhost:13001/api/your-new-endpoint

# Check all services still work
./start-dev.sh
```

### **4. Commit Changes**
```bash
# Stage changes
git add .

# Commit with clear message
git commit -m "feat: add new feature description

- Add new endpoint for XYZ
- Update documentation
- Add integration tests

Closes #123"
```

### **5. Push and Create Pull Request**
```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# Use the PR template and fill it out completely
```

---

## 📝 Code Style Guidelines

### **JavaScript/Node.js**
- Use 2 spaces for indentation
- Use single quotes for strings
- Add JSDoc comments for functions
- Follow existing naming conventions

```javascript
/**
 * Get network topology data
 * @param {Object} options - Query options
 * @param {string} options.deviceType - Filter by device type
 * @returns {Promise<Object>} Topology data
 */
async function getTopology(options = {}) {
  // Implementation
}
```

### **Python**
- Follow PEP 8 style
- Use 4 spaces for indentation
- Add docstrings for functions and classes
- Use type hints when possible

```python
async def get_topology(self, request: web.Request) -> web.Response:
    """Get network topology data.
    
    Args:
        request: HTTP request object
        
    Returns:
        JSON response with topology data
    """
    # Implementation
```

### **General Guidelines**
- Write clear, descriptive variable names
- Keep functions small and focused
- Add error handling for external calls
- Log important events and errors

---

## 🧪 Adding Tests

### **Integration Tests**
Add tests to `test-integration.py`:

```python
def test_new_feature(self) -> bool:
    """Test new feature functionality"""
    print("\n🔍 Testing New Feature...")
    
    try:
        # Test your new feature
        response = requests.get('http://localhost:13001/api/new-feature')
        
        if response.status_code == 200:
            data = response.json()
            # Validate response structure
            if 'expected_key' in data:
                self.test_results['new_feature'] = {
                    'status': 'PASS',
                    'response_time': response.elapsed.total_seconds()
                }
                print("✅ New Feature: Working correctly")
                return True
            else:
                print("❌ New Feature: Invalid response structure")
                return False
        else:
            print(f"❌ New Feature: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ New Feature: {e}")
        return False
```

### **Unit Tests**
Create unit tests for new modules:

```bash
# Create test file
touch shared/tests/test-new-feature.js

# Add test framework if needed
npm install --save-dev jest
```

---

## 📚 Documentation Updates

### **When to Update Documentation**
- Adding new API endpoints
- Changing configuration options
- Modifying service architecture
- Adding new features

### **Documentation Files to Update**
- `README.md` - Main documentation
- `API_DOCUMENTATION.md` - API reference
- `CHANGELOG.md` - Version history
- Code comments and docstrings

### **Documentation Style**
- Use clear, concise language
- Include code examples
- Add diagrams for complex concepts
- Keep it up-to-date with code changes

---

## 🔍 Code Review Process

### **Before Submitting PR**
1. [ ] Run integration tests: `python test-integration.py`
2. [ ] Test all affected functionality
3. [ ] Update documentation
4. [ ] Follow code style guidelines
5. [ ] Add tests for new features

### **PR Review Checklist**
- [ ] Code is well-documented
- [ ] Tests are included and passing
- [ ] Integration tests pass
- [ ] Documentation is updated
- [ ] No breaking changes (or clearly documented)
- [ ] Security considerations addressed

### **Review Process**
1. Automated tests run
2. Code review by maintainers
3. Feedback and requested changes
4. Approval and merge

---

## 🏷️ Version Management

### **Semantic Versioning**
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### **Release Process**
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release tag
4. Update documentation

---

## 🤝 Community Guidelines

### **Code of Conduct**
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Maintain professional communication

### **Getting Help**
- Check [Issues](../../issues) for similar problems
- Ask questions in [Discussions](../../discussions)
- Tag maintainers for urgent issues
- Join community channels (if available)

---

## 🎯 Priority Areas for Contribution

### **High Priority**
- [ ] Bug fixes and stability improvements
- [ ] Documentation improvements
- [ ] Test coverage enhancements
- [ ] Performance optimizations

### **Medium Priority**
- [ ] New visualization features
- [ ] Additional device support
- [ ] Enhanced error handling
- [ ] Mobile responsiveness

### **Low Priority**
- [ ] UI/UX improvements
- [ ] Plugin system development
- [ ] Advanced analytics features
- [ ] Multi-language support

---

## 🏆 Recognition

Contributors will be recognized in:
- `README.md` contributors section
- Release notes for significant contributions
- Commit history attribution
- Community recognition

---

## 📞 Getting Help

### **Maintainer Contact**
- Create an issue for bugs and feature requests
- Use discussions for questions and ideas
- Tag maintainers for urgent issues

### **Resources**
- [Main Documentation](README.md)
- [API Reference](API_DOCUMENTATION.md)
- [GitHub Setup Guide](GITHUB_SETUP.md)
- [Troubleshooting Guide](README.md#troubleshooting)

---

**Thank you for contributing! 🎉**

Your contributions help make the Unified FortiAP/Switch Dashboard better for everyone. Whether it's a bug fix, new feature, documentation improvement, or community support, it's all valuable and appreciated.
