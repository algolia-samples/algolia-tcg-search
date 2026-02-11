# Testing Guide

## Overview

This project uses Jest and React Testing Library for frontend testing.

**Current Coverage:** ~19% overall, 98.5% for new claim functionality (CardModal)

**Testing Strategy:**
- ✅ Frontend components: Co-located tests in `/src` (e.g., `CardModal.test.jsx`)
- ❌ API routes: Not currently tested via Jest (future: integration tests)
- 📝 New features: Add tests as features are built

## Running Tests

### Interactive Mode (development)
```bash
npm test
```
- Watches for file changes
- Re-runs tests automatically
- Press `a` to run all tests
- Press `p` to filter by filename
- Press `q` to quit

### CI Mode (one-time run with coverage)
```bash
npm run test:ci
```
- Runs all tests once
- Generates coverage report
- Use for pre-commit checks or CI/CD

### Coverage Report
```bash
npm run test:ci
```
Coverage reports appear in terminal and in `/coverage` directory.

## Test Structure

### Frontend Component Tests
- **Location:** Co-located with components in `/src`
- **Example:** `src/components/CardModal.test.jsx`
- **Pattern:** `ComponentName.test.jsx`

Tests cover:
- Rendering and user interactions
- Form validation
- API integration (mocked)
- Keyboard shortcuts
- Error states

### Example Test File Structure
```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Writing New Tests

When adding a new feature:

1. **Create test file** next to component: `MyComponent.test.jsx`
2. **Test user-facing behavior**, not implementation details
3. **Mock external dependencies** (APIs, databases)
4. **Use descriptive test names** that explain what they verify

## API Testing (Future)

Currently, API routes (`/api/*`) are not unit tested. Future options:
- Integration tests using Supertest or Playwright
- Manual testing via Postman/browser
- Separate Node.js test project

Rationale: create-react-app's Jest configuration is optimized for React components, not Node.js serverless functions.

## Dependencies

- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom Jest matchers for DOM
- `@testing-library/user-event` - Realistic user interaction simulation

All included via `react-scripts`.
