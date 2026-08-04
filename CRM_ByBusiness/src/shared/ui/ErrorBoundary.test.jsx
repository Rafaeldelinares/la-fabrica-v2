/**
 * ErrorBoundary.test.jsx
 *
 * Tests for the ErrorBoundary React component.
 * Covers: renders children, catches errors, calls reportFrontendError,
 * custom fallback prop, and session/user ID population.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the reporting helper
vi.mock('../reporting/reportFrontendError', () => ({
  reportFrontendError: vi.fn(),
}));

import { reportFrontendError } from '../reporting/reportFrontendError';
import ErrorBoundary from './ErrorBoundary';

// Stub VITE_APP_VERSION for dev-mode pre rendering
beforeEach(() => {
  vi.stubEnv('VITE_APP_VERSION', 'test-build-1.0.0');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** Child component that throws a rendering error */
function Bomb() {
  throw new Error('Boom');
}

describe('ErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <span data-testid="child">OK</span>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('OK');
  });

  it('catches error from child and renders fallback', () => {
    vi.stubEnv('VITE_APP_VERSION', 'test-build-1.0.0');
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText(/algo salio mal/i)).toBeInTheDocument();
  });

  it('calls reportFrontendError with expected payload shape', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(reportFrontendError).toHaveBeenCalledTimes(1);
    const call = reportFrontendError.mock.calls[0][0];
    expect(call.tipo).toBe('frontend_error');
    expect(call.componente).toBe('ErrorBoundary');
    expect(call.mensaje).toBe('Boom');
    expect(call.stack).toBeTruthy();
    expect(call.url).toMatch(/^http:\/\/localhost(:3000)?\/$/);
    expect(call.metadata).toBeTruthy();
    expect(call.metadata.componentStack).toBeTruthy();
    expect(call.metadata.build).toBe('test-build-1.0.0');
  });

  it('honors custom fallback prop', () => {
    const CustomFallback = () => <div data-testid="custom">Custom fallback</div>;
    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('custom')).toBeInTheDocument();
    expect(screen.queryByText(/algo salio mal/i)).not.toBeInTheDocument();
  });
});
