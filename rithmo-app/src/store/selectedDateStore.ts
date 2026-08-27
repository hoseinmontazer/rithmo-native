/**
 * selectedDateStore — the one selected calendar date, shared between Home's
 * day strip and the Cycle calendar so tapping a day in either place moves
 * the other: the "Rhythmo App" design mockup treats the day strip and the
 * Cycle tab as views onto the same selection, not two independent pickers.
 *
 * Session-only by design — not persisted. Reopening the app should land on
 * today, the same way the day strip itself always re-centers on today.
 */
import { create } from 'zustand';
import { todayISO } from '@utils/dateUtils';

interface SelectedDateState {
  selectedDate: string;
  setSelectedDate: (dateISO: string) => void;
  resetToToday: () => void;
}

export const useSelectedDateStore = create<SelectedDateState>((set) => ({
  selectedDate: todayISO(),
  setSelectedDate: (dateISO) => set({ selectedDate: dateISO }),
  resetToToday: () => set({ selectedDate: todayISO() }),
}));
