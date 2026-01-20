# FortiAP/Switch Dashboard - Ralph Specification

## Project Overview
**Project Name**: Unified FortiAP/Switch Dashboard
**Current Version**: 2.0.0
**Status**: Production Ready
**Primary Language**: JavaScript (Node.js), Python

## Current Architecture

### Services
1. **Shared API Gateway** (Port 13001)
   - Node.js + Express
   - Central hub for multi-service coordination
   - Unified caching layer
   - Configuration management

2. **Python Discovery Service** (Port 13002)
   - Python + aiohttp
   - FortiGate API integration
   - Network topology discovery
   - Device inventory management

3. **Combined Dashboard** (Port 13000)
   - Node.js + Express + D3.js
   - 2D/3D visualizations
   - Real-time data updates

4. **Babylon 3D Visualizer** (Port 3001)
   - Babylon.js + Three.js
   - Interactive 3D network visualization
   - Authentic FortiGate 3D models

## Development Goals

### High Priority Tasks
- [ ] Enhance error handling across all services
- [ ] Implement comprehensive logging with Winston
- [ ] Add unit tests for critical components (target: 80% coverage)
- [ ] Improve API documentation with OpenAPI/Swagger
- [ ] Implement rate limiting on all API endpoints
- [ ] Add WebSocket support for real-time updates
- [ ] Enhance security with input validation and sanitization

### Medium Priority Tasks
- [ ] Optimize database queries and caching strategies
- [ ] Add metrics and monitoring endpoints
- [ ] Implement user authentication and authorization
- [ ] Create admin dashboard for configuration
- [ ] Add support for multiple FortiGate devices
- [ ] Implement data export functionality (CSV, JSON, PDF)
- [ ] Add dark mode support to dashboards

### Low Priority Tasks
- [ ] Refactor legacy code for better maintainability
- [ ] Add internationalization (i18n) support
- [ ] Implement automated backup system
- [ ] Create mobile-responsive views
- [ ] Add keyboard shortcuts for power users

## Quality Standards

### Code Quality
- **Linting**: ESLint with Airbnb style guide
- **Formatting**: Prettier with consistent rules
- **Testing**: Jest for unit tests, Supertest for integration tests
- **Documentation**: JSDoc comments for all functions
- **Type Safety**: Consider migrating to TypeScript

### Performance Requirements
- **API Response Time**: < 200ms for cached data, < 1s for fresh data
- **Page Load Time**: < 3s for initial load
- **Memory Usage**: < 512MB per service
- **CPU Usage**: < 50% under normal load

### Security Requirements
- **Input Validation**: Validate all user inputs
- **Rate Limiting**: 100 requests per minute per IP
- **CORS**: Properly configured for allowed origins
- **Headers**: Use Helmet.js for security headers
- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control (RBAC)

## Technical Constraints

### Dependencies
- Node.js >= 14.0.0
- Python >= 3.7.0
- No breaking changes to existing APIs
- Maintain backward compatibility

### Architecture Constraints
- Microservices architecture must be preserved
- Each service should be independently deployable
- Services communicate via REST API or WebSocket
- Shared configuration via environment variables

### Coding Standards
1. **JavaScript/Node.js**
   - Use ES6+ features
   - Async/await for asynchronous operations
   - Modular code with clear separation of concerns
   - Error-first callbacks or Promises

2. **Python**
   - Follow PEP 8 style guide
   - Use type hints where applicable
   - Async/await with asyncio for I/O operations

3. **Git Workflow**
   - Feature branches for new development
   - Descriptive commit messages
   - Pull requests for code review
   - Automated testing before merge

## Testing Strategy

### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Aim for 80% code coverage
- Run on every commit

### Integration Tests
- Test service-to-service communication
- Test API endpoints end-to-end
- Validate data flow through the system
- Run before deployment

### Performance Tests
- Load testing with Artillery or k6
- Monitor response times under load
- Identify bottlenecks and optimize

## Exit Conditions for Ralph

Ralph should stop iterating when:
1. All tests pass (npm test returns 0)
2. No linting errors (npm run lint returns 0)
3. No git diff changes for 2 consecutive iterations
4. Maximum iteration limit reached (default: 10)
5. Build succeeds (npm run build returns 0)

## Progress Tracking

### Success Metrics
- **Test Coverage**: Track percentage of code covered by tests
- **Passing Tests**: All tests should pass
- **Linting**: Zero linting errors
- **Build Status**: Build should succeed
- **Git Status**: Clean working directory

### Failure Conditions
- Tests fail for 3 consecutive iterations
- Build fails for 2 consecutive iterations
- Same error occurs 3 times without resolution
- Service starts failing health checks

## Ralph Iteration Guidelines

### On Each Iteration
1. Read this spec file to understand current goals
2. Check git status to see what changed
3. Run tests to validate changes
4. Run linter to check code quality
5. Build the project to ensure no breaking changes
6. Log progress and any errors encountered

### Priority Order
1. Fix failing tests first
2. Address linting errors second
3. Implement new features third
4. Refactor code fourth
5. Update documentation last

### Safe Practices
- Always create a new branch for significant changes
- Never modify .env files or credentials
- Preserve existing functionality unless explicitly refactoring
- Add tests for new code
- Update documentation when adding features

## Additional Context

### File Structure
```
fortiap-switch-dashboard/
├── shared/
│   ├── api-gateway.js        # Main API gateway
│   ├── combined-dashboard.js # Dashboard logic
│   ├── combined-dashboard.html # Dashboard UI
│   └── model-library.js      # 3D model library
├── babylon_3d/               # Babylon.js visualizer
├── test/                     # Test files
├── cache/                    # Cache storage
└── node_modules/             # Dependencies
```

### Important Files to Preserve
- `.env` - Environment configuration
- `.gitignore` - Git ignore rules
- `package.json` - Dependencies and scripts
- `README.md` - Project documentation
- All test files in `test/`

### Resources and Documentation
- FortiGate API Documentation: https://docs.fortinet.com/
- Babylon.js Documentation: https://doc.babylonjs.com/
- D3.js Documentation: https://d3js.org/
- Express.js Documentation: https://expressjs.com/

---

**Last Updated**: 2026-01-19
**Spec Version**: 1.0.0
