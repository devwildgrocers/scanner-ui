import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import SessionStart from './SessionStart';
import PickList from './PickList';
import SessionComplete from './SessionComplete';
import scannerService from '@/services/scanner.service';

/**
 * MASTER WAREHOUSE FLOW TEST
 * This file combines all critical feature tests into a single sequence.
 * Use .only on any describe or it block to focus on one specific part.
 */

const activePhases = process.env.PHASE ? process.env.PHASE.split(',') : [];

// 1. GLOBAL MOCKS
jest.mock('@/services/scanner.service', () => ({
  __esModule: true,
  default: {
    getTeamMembers: jest.fn(),
    getCarts: jest.fn(),
    getPickList: jest.fn(),
    startSession: jest.fn(),
    syncCart: jest.fn(),
  },
  scannerService: {
    getTeamMembers: jest.fn(),
    getCarts: jest.fn(),
    getPickList: jest.fn(),
    startSession: jest.fn(),
    syncCart: jest.fn(),
  }
}));

jest.mock('@/lib/notifications', () => ({
  error: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
}));

describe('WAREHOUSE SCANNER: FULL FLOW', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------
  // PHASE 1: SESSION INITIALIZATION
  // ---------------------------------------------------------
  if (activePhases.length === 0 || activePhases.includes('p1')) {
    describe('PHASE 1 (p1): Session Initialization (SessionStart)', () => {
      const mockOnSessionStart = jest.fn();

      beforeEach(() => {
        (scannerService.getTeamMembers as jest.Mock).mockResolvedValue({ 
          data: [{ id: 'tm1', name: 'John Doe' }] 
        });
        (scannerService.getCarts as jest.Mock).mockResolvedValue({ 
          data: [{ id: 'c1', cartId: 'CART001' }] 
        });
      });

      it('enables the start button only when a user and cart are selected', async () => {
        render(<SessionStart onSessionStart={mockOnSessionStart} />);
        
        // Wait for loader to disappear
        await waitFor(() => expect(screen.queryByText(/Connecting/i)).not.toBeInTheDocument());

        const startButton = screen.getByRole('button', { name: /START SESSION/i });
        expect(startButton).toBeDisabled();

        // Selection logic
        fireEvent.change(screen.getByLabelText(/Team Member/i), { target: { value: 'tm1' } });
        fireEvent.change(screen.getByLabelText(/Active Cart/i), { target: { value: 'CART001' } });
        
        expect(startButton).not.toBeDisabled();
      });
    });
  }

  if (activePhases.length === 0 || activePhases.includes('p2')) {
    describe('PHASE 2 (p2): Picking Progress (PickList)', () => {
      const mockOnSelectItem = jest.fn();
      const mockOnSessionComplete = jest.fn();
      const mockItems = [
        { productId: 'p1', name: 'Product A', location: 'A-01', totalQty: 5, pickedQty: 0, items: [] },
      ];

      beforeEach(() => {
        (scannerService.getPickList as jest.Mock).mockResolvedValue({ data: mockItems });
      });

      it('displays items to be picked and calculates progress', async () => {
        render(
          <PickList 
            cartId="CART001" 
            pickerId="tm1" 
            onSelectItem={mockOnSelectItem} 
            onSessionComplete={mockOnSessionComplete} 
          />
        );

        await waitFor(() => expect(screen.getByText('Product A')).toBeInTheDocument());
        
        // Check for quantity display (0/5)
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      it('allows finishing the cart only when all items are picked', async () => {
        // Re-render with a completed overlay
        const completedOverlay = {
          'p1': { pickedQty: 5, replacedQty: 0, shortQty: 0, items: [] }
        };

        render(
          <PickList 
            cartId="CART001" 
            pickerId="tm1" 
            onSelectItem={mockOnSelectItem} 
            onSessionComplete={mockOnSessionComplete} 
            localPickedOverlay={completedOverlay}
          />
        );

        await waitFor(() => expect(screen.getByText(/FINISH PACKING/i)).toBeInTheDocument());
        
        fireEvent.click(screen.getByText(/FINISH PACKING/i));
        
        await waitFor(() => {
          expect(scannerService.syncCart).toHaveBeenCalled();
        });
      });
    });
  }

  if (activePhases.length === 0 || activePhases.includes('p3')) {
    describe('PHASE 3 (p3): Summary & Finalization (SessionComplete)', () => {
      const mockMetrics = {
        cartId: 'CART001',
        teamMemberId: 'tm1',
        totalItemsPacked: 10,
        totalReplacements: 0,
        totalShorts: 0,
      };
      const mockOnNewSession = jest.fn();

      it('shows the correct summary metrics to the picker', () => {
        render(<SessionComplete metrics={mockMetrics} onNewSession={mockOnNewSession} />);
        
        expect(screen.getByText(/Session Complete!/i)).toBeInTheDocument();
        expect(screen.getAllByText(/CART001/i).length).toBeGreaterThan(0);
        expect(screen.getByText('10')).toBeInTheDocument();
      });

      it('can reset the app for the next cart', () => {
        render(<SessionComplete metrics={mockMetrics} onNewSession={mockOnNewSession} />);
        
        fireEvent.click(screen.getByText(/Start Next Cart/i));
        expect(mockOnNewSession).toHaveBeenCalled();
      });
    });
  }

});
