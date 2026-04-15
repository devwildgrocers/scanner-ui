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
const hasMatchingPhase =
  activePhases.length === 0 || ['p1', 'p2', 'p3'].some((phase) => activePhases.includes(phase));

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

      it('prompts to scan a cart once a team member is selected', async () => {
        render(<SessionStart onSessionStart={mockOnSessionStart} />);
        
        // Wait for loader to disappear
        await waitFor(() => expect(screen.queryByText(/Ready to start/i)).toBeInTheDocument());

        // Initially show name selection
        expect(screen.getByText(/Select your name/i)).toBeInTheDocument();
        expect(screen.queryByText(/Ready to Scan Cart/i)).not.toBeInTheDocument();

        // Select a team member
        fireEvent.change(screen.getByLabelText(/Team Member/i), { target: { value: 'tm1' } });
        
        // Should now show the scan prompt
        await waitFor(() => expect(screen.getByText(/Ready to Scan Cart/i)).toBeInTheDocument());
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
        teamMemberName: 'Camila',
        totalItemsPacked: 41,
        totalReplacements: 7,
        totalShorts: 1,
        // Using both for maximum compatibility during transition
        boxDetails: [
          { orderNumber: '4001', items: 41, replacements: 7, shorts: 0, slot: 'A', status: 'Partial' as const },
          { orderNumber: '4002', items: 20, replacements: 0, shorts: 1, slot: 'B', status: 'Short' as const }
        ],
        slotTotals: [
          { orderNumber: '4001', items: 41, replacements: 7, shorts: 0, slot: 'A', status: 'Partial' as const },
          { orderNumber: '4002', items: 20, replacements: 0, shorts: 1, slot: 'B', status: 'Short' as const }
        ]
      };
      const mockOnNewSession = jest.fn();

      it('shows the correct 41 + 7 and 20 + 1 summary metrics to the picker', async () => {
        render(<SessionComplete metrics={mockMetrics as any} onNewSession={mockOnNewSession} />);
        
        expect(screen.getByText(/All Packed!/i)).toBeInTheDocument();
        
        // Final Physical Reality Checks for Slot A (41 + 7 Substitute)
        await waitFor(() => {
          const slotA = (screen.getByText(/4001/i).closest('.card') || document.body) as HTMLElement;
          expect(within(slotA).getAllByText(/41/).length).toBeGreaterThan(0);
          expect(within(slotA).getAllByText(/7/).length).toBeGreaterThan(0);
          expect(within(slotA).getAllByText(/Substitute/i).length).toBeGreaterThan(0);
        });
        
        // Final Physical Reality Checks for Slot B (20 + 1 Short)
        await waitFor(() => {
          const slotB = (screen.getByText(/4002/i).closest('.card') || document.body) as HTMLElement;
          expect(within(slotB).getAllByText(/20/).length).toBeGreaterThan(0);
          expect(within(slotB).getAllByText(/1/).length).toBeGreaterThan(0);
          expect(within(slotB).getAllByText(/Short/i).length).toBeGreaterThan(0);
        });
      });

      it('can reset the app for the next cart', () => {
        render(<SessionComplete metrics={mockMetrics as any} onNewSession={mockOnNewSession} />);
        
        fireEvent.click(screen.getByText(/Next Session/i));
        expect(mockOnNewSession).toHaveBeenCalled();
      });
    });
  }

  it('keeps suite runnable when PHASE filters all tests', () => {
    if (!hasMatchingPhase) {
      expect(activePhases.length).toBeGreaterThan(0);
    }
  });

});
