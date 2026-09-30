import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { getMaterials } from '../api/material.api';
import { demoMaterials, useMaterials } from './useMaterials';

vi.mock('../api/material.api', () => ({
  getMaterials: vi.fn(),
}));

describe('useMaterials', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uses materials returned by the backend', async () => {
    getMaterials.mockResolvedValue({
      data: { data: { materials: [{ id: 'cement', name: 'Portland Cement', category: 'cement' }] } },
    });

    const { result } = renderHook(() => useMaterials());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.materials).toEqual([
      { id: 'cement', name: 'Portland Cement', category: 'cement' },
    ]);
    expect(result.current.error).toBeNull();
  });

  it('matches backend category values when the user filters materials', async () => {
    getMaterials.mockResolvedValue({
      data: { data: { materials: [{ id: 'cement', name: 'Portland Cement', category: 'cement' }] } },
    });

    const { result } = renderHook(() => useMaterials());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCategory('cement'));

    await waitFor(() => expect(getMaterials).toHaveBeenLastCalledWith({
      search: undefined,
      category: 'cement',
    }));
    expect(result.current.materials).toEqual([
      { id: 'cement', name: 'Portland Cement', category: 'cement' },
    ]);
  });

  it('surfaces backend failures instead of silently masking them', async () => {
    getMaterials.mockRejectedValue(new Error('backend unavailable'));

    const { result } = renderHook(() => useMaterials());

    await waitFor(() => expect(result.current.error).toMatch(/Unable to load live materials/));

    if (import.meta.env.DEV) {
      expect(result.current.materials).toEqual(demoMaterials);
    } else {
      expect(result.current.materials).toEqual([]);
    }
  });
});
