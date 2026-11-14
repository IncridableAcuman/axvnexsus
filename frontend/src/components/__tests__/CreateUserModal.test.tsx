import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateUserModal } from '../users/CreateUserModal';
import { userApi } from '@/api';

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

vi.mock('@/api', () => ({
  userApi: {
    createUser: vi.fn(),
  },
}));

describe('Module 01: CreateUserModal Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal dialog with form fields when isOpen is true', () => {
    render(
      <CreateUserModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Yangi Xodim / Administrator Qo‘shish')).toBeDefined();
    expect(screen.getByLabelText(/F.I.O \(Ism-familiya\) \*/i)).toBeDefined();
    expect(screen.getByLabelText(/Login \(Username\)/i)).toBeDefined();
    expect(screen.getByLabelText(/Asosiy rol \*/i)).toBeDefined();
  });

  it('validates required name field before submission', () => {
    render(
      <CreateUserModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/F.I.O \(Ism-familiya\) \*/i);
    const form = nameInput.closest('form')!;
    fireEvent.submit(form);

    expect(userApi.createUser).not.toHaveBeenCalled();
    expect(screen.getByText(/Xodim F.I.O sini kiriting/i)).toBeDefined();
  });

  it('provisions new administrator/staff user and renders credentials slip', async () => {
    vi.mocked(userApi.createUser).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 55,
          username: 'd.rahimov',
          email: 'd.rahimov@axm.uz',
          fullName: 'Dilshod Rahimov',
          primaryRole: 'ADMIN',
          roles: ['ADMIN'],
          temporaryPassword: 'TempPass987!#',
          temporaryPasswordExpiresAt: '2026-11-21T12:00:00Z',
        },
      },
    } as any);

    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <CreateUserModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    const nameInput = screen.getByLabelText(/F.I.O \(Ism-familiya\) \*/i);
    fireEvent.change(nameInput, { target: { value: 'Dilshod Rahimov' } });

    const form = nameInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(userApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Dilshod Rahimov',
          primaryRole: 'ADMIN',
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });

    // Verify credentials slip is shown
    expect(screen.getByText('Hisob muvaffaqiyatli faollashtirildi!')).toBeDefined();
    expect(screen.getByText('d.rahimov')).toBeDefined();
    expect(screen.getByText('TempPass987!#')).toBeDefined();

    // Test copying temporary password
    const copyBtn = screen.getByTitle('Nusxa olish');
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('TempPass987!#');

    // Test close button
    const closeBtn = screen.getByRole('button', { name: /Tushundim, yakunlash/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
