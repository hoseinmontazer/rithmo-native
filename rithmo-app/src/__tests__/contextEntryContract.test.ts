/**
 * Today 2.0, Layer A — ContextEntry routing/UI-wiring contract, plus the
 * QuickLog empty-submit/provenance fix and the LogWellnessScreen
 * symptom-editing gap closure. Source-scanning technique (this project
 * verifies component rendering on-device, not in Jest — see
 * jest.config.js's own docstring), same as healthChangeContract.test.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

import { API_ENDPOINTS } from '@constants/config';
import { CONTEXT_TAGS } from '@constants/contextTags';

const SRC = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

describe('Context entries endpoint', () => {
  it('is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.CONTEXT_ENTRIES).toBe('/api/context-entries/');
  });

  it('the service calls this endpoint for create/list/update/delete', () => {
    const src = read('api/services/contextEntryService.ts');
    expect(src).toMatch(/apiClient[^]*\.get\(API_ENDPOINTS\.CONTEXT_ENTRIES/);
    expect(src).toMatch(/apiClient[^]*\.post\(API_ENDPOINTS\.CONTEXT_ENTRIES/);
    expect(src).toMatch(/apiClient[^]*\.patch\(`\$\{API_ENDPOINTS\.CONTEXT_ENTRIES\}/);
    expect(src).toMatch(/apiClient[^]*\.delete[^]*`\$\{API_ENDPOINTS\.CONTEXT_ENTRIES\}/);
  });
});

describe('Context taxonomy', () => {
  it('has exactly the 8 approved tags, no more, no fewer', () => {
    expect(CONTEXT_TAGS.map((t) => t.code).sort()).toEqual(
      [
        'illness', 'medication', 'unusual_stress', 'unusual_positive',
        'sleep_disruption', 'travel', 'lifestyle_change', 'other',
      ].sort()
    );
  });

  it('every tag has a non-empty Persian label', () => {
    CONTEXT_TAGS.forEach((t) => expect(t.label.length).toBeGreaterThan(0));
  });
});

describe('QuickLog empty-submit / provenance fix', () => {
  const src = read('screens/wellness/QuickLogScreen.tsx');

  it('tracks which of the four metric fields were actually touched', () => {
    expect(src).toMatch(/const \[touched, setTouched\] = useState/);
    expect(src).toMatch(/markTouched/);
  });

  it('only sends a touched field to the server, never an untouched default', () => {
    expect(src).toMatch(/touched\.mood \? \{ mood_level: mood \} : \{\}/);
    expect(src).toMatch(/touched\.energy \? \{ energy_level:/);
    expect(src).toMatch(/touched\.pain \? \{ pain_level:/);
    expect(src).toMatch(/touched\.sleep \? \{ sleep_hours: sleep \} : \{\}/);
  });

  it('every picker marks its own field touched on interaction', () => {
    expect(src).toMatch(/setMood\(m\.level\); markTouched\('mood'\)/);
    expect(src).toMatch(/markTouched\('energy'\)/);
    expect(src).toMatch(/markTouched\('pain'\)/);
    expect((src.match(/markTouched\('sleep'\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('reopening an already-reported day marks those fields touched from reported_fields, not blank', () => {
    expect(src).toMatch(/reported\.includes\('mood_level'\)/);
  });

  it('renders the Today 2.0 context step with the approved chips and a standing free-text field', () => {
    expect(src).toMatch(/امروز چیز متفاوتی بود؟/);
    expect(src).toMatch(/CONTEXT_TAGS\.map/);
    expect(src).toMatch(/toggleContextTag/);
  });

  it('the celebration overlay no longer navigates away by itself (AI Feedback CTA must stay reachable)', () => {
    expect(src).not.toMatch(/onDismiss=\{goBack\}/);
    expect(src).toMatch(/onDismiss=\{\(\) => setCelebrationVisible\(false\)\}/);
  });

  it('wires the Today AI Feedback CTA', () => {
    expect(src).toMatch(/useTodayFeedback/);
    expect(src).toMatch(/requestFeedback/);
    expect(src).toMatch(/isQuotaExhausted/);
  });
});

describe('LogWellnessScreen: symptom-editing gap closed', () => {
  const src = read('screens/wellness/LogWellnessScreen.tsx');

  it('renders the full symptom vocabulary, not just the quick 8', () => {
    expect(src).toMatch(/import \{ SYMPTOMS, parseSymptomCodes \} from '@constants\/symptoms'/);
    expect(src).toMatch(/SYMPTOMS\.map/);
  });

  it('sends the edited symptom selection on save', () => {
    expect(src).toMatch(/symptoms: selectedSymptoms\.join\(','\)/);
  });

  it('also exposes Today 2.0 context editing for the same day', () => {
    expect(src).toMatch(/useContextEntriesForDate/);
    expect(src).toMatch(/handleAddContextTag/);
    expect(src).toMatch(/handleRemoveContextEntry/);
  });
});
