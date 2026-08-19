/**
 * useGestorGuard.test.js
 *
 * Tests for useGestorGuard hook.
 * Run with: pnpm test src/shared/hooks/__tests__/useGestorGuard.test.jsx
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import useGestorGuard from '../useGestorGuard';

const APP_OPEN_FALTA_GESTOR = 'app:open-falta-gestor';

const makeCliente = (gestorId) => ({ id: 1, nombre: 'Test', gestor_id: gestorId });

describe('useGestorGuard', () => {
  let addEventListenerSpy;
  let removeEventListenerSpy;
  let dispatchEventSpy;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    dispatchEventSpy.mockRestore();
  });

  it('returns blocked:false and does NOT dispatch event when gestor_id is set', () => {
    const cliente = makeCliente(5);
    const { result } = renderHook(() => useGestorGuard(cliente));
    expect(result.current.blocked).toBe(false);
    expect(dispatchEventSpy).not.toHaveBeenCalled();
  });

  it('returns blocked:true and dispatches app:open-falta-gestor event when gestor_id is null', () => {
    const cliente = makeCliente(null);
    const { result } = renderHook(() => useGestorGuard(cliente));
    expect(result.current.blocked).toBe(true);
    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    const dispatchedEvent = dispatchEventSpy.mock.calls[0][0];
    expect(dispatchedEvent.type).toBe(APP_OPEN_FALTA_GESTOR);
    expect(dispatchedEvent.detail.cliente).toEqual(cliente);
  });

  it('returns blocked:true and dispatches event when gestor_id is undefined', () => {
    const cliente = makeCliente(undefined);
    const { result } = renderHook(() => useGestorGuard(cliente));
    expect(result.current.blocked).toBe(true);
    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
  });

  it('check function is stable across renders', () => {
    const cliente = makeCliente(5);
    const { result, rerender } = renderHook(() => useGestorGuard(cliente));
    const firstCheck = result.current.check;
    rerender();
    expect(result.current.check).toBe(firstCheck);
  });
});
