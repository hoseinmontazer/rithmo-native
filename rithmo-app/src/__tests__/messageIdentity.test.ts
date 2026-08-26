/**
 * Message participant ids are DRF integers, not strings.
 *
 * `notifications/serializers.py` exposes `sender` / `receiver` as the raw FK
 * primary keys, which DRF serializes as NUMBERS. `notification.types.ts`
 * declared them `string`, and three bugs followed from believing it:
 *
 *  1. `partnerNameMap.get(partnerId)` — map keyed by string, looked up with a
 *     number — always missed, so every row fell through to the placeholder.
 *  2. That placeholder ran `partnerId.slice(0, 6)`. `.slice` does not exist on
 *     a number, which threw «TypeError: undefined is not a function» inside
 *     the FlatList cell renderer, taking down the conversation list.
 *  3. `msg.sender === userId` compared a number to a string with `===`, so it
 *     was permanently false: "is this message mine" was always no, and the
 *     other participant of a conversation was resolved to the wrong side.
 *
 * The rule these pin: normalise with `String(...)` on BOTH sides of any
 * comparison or map access involving a participant id.
 */
export {};

declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8') as string;

/**
 * Source with comments stripped.
 *
 * The `not.toMatch` assertions below describe code that must no longer exist.
 * Without this, they match the comments that *explain* the old code and fail
 * on a correctly fixed file — which is exactly what happened while writing
 * them.
 */
const code = (...p: string[]) =>
  read(...p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

describe('participant ids are treated as possibly-numeric', () => {
  it('the Message type no longer claims they are strings', () => {
    const t = read('types', 'notification.types.ts');
    expect(t).toMatch(/sender: string \| number;/);
    expect(t).toMatch(/receiver: string \| number;/);
  });

  it('the conversation list never calls a string method on a raw id', () => {
    // The crash: `partnerId.slice(...)` on a raw payload value. Any `.slice`
    // must be on an explicitly stringified value.
    expect(code('screens', 'messages', 'MessagesListScreen.tsx')).not.toMatch(/\bpartnerId\.slice\(/);
    expect(read('screens', 'messages', 'MessagesListScreen.tsx')).toMatch(/String\(partnerId\)/);
  });

  it('the conversation list compares ids as strings', () => {
    const s = code('screens', 'messages', 'MessagesListScreen.tsx');
    expect(s).not.toMatch(/msg\.sender === userId/);
    expect(s).toMatch(/String\(msg\.sender\) === me/);
    expect(s).toMatch(/String\(item\.lastMsg\.sender\) === String\(userId\)/);
  });

  it('message ownership in the thread is compared as strings', () => {
    const s = code('screens', 'messages', 'ConversationScreen.tsx');
    expect(s).not.toMatch(/isMine=\{item\.sender === userId\}/);
    expect(s).toMatch(/String\(item\.sender\) === String\(userId\)/);
  });
});

describe('the failure mode itself', () => {
  it('a numeric id has no .slice — which is what threw', () => {
    const numericId: any = 2;
    expect(typeof numericId.slice).toBe('undefined');
    expect(() => numericId.slice(0, 6)).toThrow(TypeError);
    // and the fix
    expect(String(numericId).slice(0, 6)).toBe('2');
  });

  it('a numeric id never strict-equals its string form', () => {
    expect((2 as any) === '2').toBe(false);
    expect(String(2) === String('2')).toBe(true);
  });

  it('a Map keyed by string is missed by a numeric lookup', () => {
    const m = new Map<string, string>([['2', 'admin']]);
    expect(m.get(2 as any)).toBeUndefined();
    expect(m.get(String(2))).toBe('admin');
  });
});

/**
 * The conversation thread must receive an ARRAY.
 *
 * `PartnerMessageViewSet.conversation` returns `{count, messages}`, not a bare
 * list. The client typed it `Message[]` and passed `r.data` through, so
 * `useConversation` handed `ConversationScreen` an object and
 * `<FlatList data={messages ?? []}>` rendered nothing — the thread was
 * permanently blank however many messages it held. A message was visible in
 * the conversation LIST and could not be opened, which is exactly how this was
 * reported.
 */
describe('conversation payload is unwrapped to an array', () => {
  it('the service unwraps the {count, messages} envelope', () => {
    const s = code('api', 'services', 'notificationService.ts');
    expect(s).toMatch(/Array\.isArray\(r\.data\)/);
    expect(s).toMatch(/r\.data\?\.messages/);
  });

  it('the envelope shape is declared, not assumed away', () => {
    expect(read('types', 'notification.types.ts')).toMatch(/interface ConversationResponse/);
  });

  it('the screen still renders from a plain array', () => {
    expect(code('screens', 'messages', 'ConversationScreen.tsx'))
      .toMatch(/data=\{messages \?\? \[\]\}/);
  });

  /** The unwrap logic itself, against both shapes the endpoint may return. */
  const unwrap = (data: any) => (Array.isArray(data) ? data : data?.messages ?? []);

  it('handles the envelope', () => {
    expect(unwrap({ count: 1, messages: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('handles a bare list, if the endpoint is ever simplified', () => {
    expect(unwrap([{ id: 1 }])).toEqual([{ id: 1 }]);
  });

  it('never yields a non-array, whatever arrives', () => {
    for (const bad of [undefined, null, {}, { count: 0 }, 42, 'x']) {
      expect(Array.isArray(unwrap(bad))).toBe(true);
    }
  });
});

/**
 * The composer must stay reachable while the keyboard is open.
 *
 * `AndroidManifest.xml` declares `windowSoftInputMode="adjustResize"`, so
 * Android already shrinks the window when the keyboard opens. Pairing that
 * with `KeyboardAvoidingView behavior="height"` compensates twice and pushed
 * the composer — including the send button — off screen, so the user had to
 * dismiss the keyboard before they could send. On Android the correct
 * behavior is none.
 */
describe('chat composer survives the keyboard', () => {
  it('applies no KeyboardAvoidingView behavior on Android', () => {
    const s = code('screens', 'messages', 'ConversationScreen.tsx');
    expect(s).not.toMatch(/behavior=\{Platform\.OS === 'ios' \? 'padding' : 'height'\}/);
    expect(s).toMatch(/behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
  });

  it('still relies on adjustResize in the manifest', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const manifest: string = fs.readFileSync(
      path.join(__dirname, '..', '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
      'utf8',
    );
    // If this ever changes to adjustPan/adjustNothing, the Android branch above
    // must be revisited — the two settings are a pair.
    expect(manifest).toMatch(/android:windowSoftInputMode="adjustResize"/);
  });
});
