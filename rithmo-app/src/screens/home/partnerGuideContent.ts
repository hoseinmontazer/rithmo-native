/**
 * Partner Guide ("راهنمای همراهی") content.
 *
 * A small, STATIC, reviewed-by-hand set. Three jobs, deliberately separate:
 *   understand  what could be going on in general, and what NOT to assume
 *   talk        natural ways to start a conversation (editable drafts only)
 *   help        practical offers, every one of them optional
 *
 * Rules this file exists to keep:
 *   - It reads NOTHING about the owner. No health data, no notes, no check-ins,
 *     no AI text. It renders the same for a partner with no link, no shared
 *     data, or a brand-new pair.
 *   - No model, no network. Every sentence is reviewed text, not generated.
 *   - General statements are about "some people", never about her. Phase lines
 *     are copied VERBATIM from the backend's reviewed partner phase knowledge
 *     (intelligence/domain/phase_context.py: GENERAL_PHASE_CONTEXT_PARTNER_FA);
 *     keep them in step with it, do not reword them here.
 *   - Nothing here is an instruction that is "always right". Offers say so
 *     ("if she says no, that is a complete answer") and starters are examples
 *     she can decline.
 *   - No therapist/motivational register, no assumed feeling, no assumed cause.
 *
 * Source / review status is recorded per card so it stays honest:
 *   phase_context  reviewed phase knowledge already shown on Partner Home
 *   editorial      written for this guide from the product's own principles
 *                  (no new medical claim); NOT yet read by a clinician
 */

export type PartnerGuideSection = 'understand' | 'talk' | 'help';

export const PARTNER_GUIDE_SECTIONS: PartnerGuideSection[] = ['understand', 'talk', 'help'];

export interface SectionMeta {
  section: PartnerGuideSection;
  title: string;
  subtitle: string;
  icon: string;
}

export const GUIDE_TITLE_FA = 'راهنمای همراهی';
export const GUIDE_INTRO_FA =
  'گاهی فقط می‌خوای بهتر بفهمی، درست‌تر حرف بزنی یا بدونی چه کمکی می‌تونه مفید باشه.';

/** Shown under every guide screen: what this is, and what it is not. */
export const GUIDE_FOOTER_FA =
  'این‌ها راهنمای کلی‌اند، درباره‌ی هیچ‌کس مشخصی نیستند و از هیچ اطلاعات ثبت‌شده‌ای استفاده نمی‌کنند. جای نظر پزشک را نمی‌گیرند.';

export const SECTION_META: Record<PartnerGuideSection, SectionMeta> = {
  understand: {
    section: 'understand',
    title: 'می‌خوام بهتر بفهمم',
    subtitle: 'چند توضیح کوتاه و کلی',
    icon: 'lightbulb-on-outline',
  },
  talk: {
    section: 'talk',
    title: 'نمی‌دونم چی بگم',
    subtitle: 'شروع گفتگوهایی که می‌تونی به لحن خودت بگی',
    icon: 'message-text-outline',
  },
  help: {
    section: 'help',
    title: 'می‌خوام کمک عملی کنم',
    subtitle: 'گزینه‌هایی که همه‌شان اختیاری‌اند',
    icon: 'hand-heart-outline',
  },
};

export type GuideSource = 'phase_context' | 'editorial';

export interface GuideCard {
  id: string;
  title: string;
  body: string[];
  /** Concrete things to understand / say / do. */
  points?: string[];
  /** What not to assume or do. */
  avoid?: string[];
  source: GuideSource;
}

export interface StarterGroup {
  id: string;
  /** The situation, from the partner's side. */
  situation: string;
  /** Examples, never a script. Opened as an editable draft, never sent. */
  starters: string[];
  note?: string;
}

export interface HelpOption {
  id: string;
  title: string;
  body: string;
  /** What to do if she says no: "no" is always an acceptable answer. */
  ifNo: string;
}

// ── understand ────────────────────────────────────────────────────────────────

export const UNDERSTAND_CARDS: GuideCard[] = [
  {
    id: 'everyone-differs',
    title: 'هر کسی چرخه‌اش را یک‌جور تجربه می‌کند',
    body: [
      'بعضی‌ها قبل یا حین پریود تقریباً چیزی حس نمی‌کنند و بعضی‌ها انرژی و حال‌وهواشان کاملاً فرق می‌کند. حتی برای یک نفر هم هر ماه یک‌جور نیست.',
      'الگوهای کلی فقط می‌گویند چه چیزی برای خیلی‌ها «ممکن» است؛ پیش‌بینی درباره‌ی یک آدم مشخص نیستند.',
    ],
    avoid: [
      'فرض نکن امروزش حتماً به چرخه‌اش ربط دارد.',
      'از روی یک الگوی کلی نتیجه نگیر که او چه حسی دارد؛ بپرس.',
    ],
    source: 'editorial',
  },
  {
    id: 'phases',
    title: 'چرخه چند مرحله دارد؛ اما همه یک‌جور حسش نمی‌کنند',
    body: ['این‌ها توضیح‌های کلی‌اند و چیزی درباره‌ی او نمی‌گویند.'],
    // VERBATIM from phase_context.GENERAL_PHASE_CONTEXT_PARTNER_FA.
    points: [
      'قاعدگی: ممکنه این روزها انرژی کمتری نسبت به بقیه‌ی روزهای چرخه‌اش داشته باشه. بعضی افراد در این روزها گرفتگی یا درد را تجربه می‌کنن. خلق‌وخوش ممکنه نوسان داشته باشه.',
      'فولیکولار: خیلی‌ها در این فاز انرژی بیشتری نسبت به روزهای قاعدگی حس می‌کنن. خلق‌وخوش برای بعضی افراد در این روزها باثبات‌تره.',
      'تخمک‌گذاری: بعضی افراد دور روزهای تخمک‌گذاری انرژی بالاتری دارن. ممکنه علائم بدنی خفیفی مثل درد یک‌طرفه‌ی لگن را تجربه کنه.',
      'لوتئال: بعضی افراد در این بخش از چرخه تغییراتی در انرژی، خواب یا اشتها تجربه می‌کنن. خلق‌وخوش هم برای بعضی افراد ممکنه نوسان داشته باشه.',
    ],
    source: 'phase_context',
  },
  {
    id: 'low-energy',
    title: 'وقتی کم‌انرژی یا بی‌حوصله به نظر می‌رسد',
    body: [
      'دلیلش می‌تواند خیلی چیزها باشد: خواب، کار، یک روز طولانی، چرخه‌اش، یا گاهی هیچ دلیل مشخصی.',
      'از بیرون نمی‌شود فهمید کدام است؛ فقط خودش می‌تواند بگوید.',
    ],
    points: [
      'یک سؤال باز بپرس و جواب «چیزی نیست» را هم بپذیر.',
      'اگر دلیلی گفت، همان را باور کن و حدس خودت را جایش نگذار.',
    ],
    avoid: ['نپرس «به‌خاطر پریودته؟» — اگر دلیلش آن نباشد، ممکن است حس کند حرفش را جدی نگرفته‌ای.'],
    source: 'editorial',
  },
  {
    id: 'when-professional',
    title: 'وقتی اطلاعات عمومی کافی نیست',
    body: [
      'اینجا فقط اطلاعات عمومی است و جای نظر پزشک را نمی‌گیرد.',
      'اگر دردش یا ناراحتی جسمی‌اش خیلی شدید است، روزهای عادی‌اش را مختل می‌کند یا برایش تازه و نگران‌کننده است، بهتر است با پزشک صحبت کند.',
    ],
    points: [
      'می‌توانی بپرسی: «دوست داری با هم دنبال یه وقت دکتر بگردیم؟» — تصمیمش با خودش است.',
    ],
    avoid: ['تشخیص نده و درباره‌ی علتش حدس نزن.', 'فشار نیاور و نگو «حتماً باید بری».'],
    source: 'editorial',
  },
];

// ── talk ──────────────────────────────────────────────────────────────────────

export const TALK_GROUPS: StarterGroup[] = [
  {
    id: 'check-in',
    situation: 'می‌خوام حالش رو بپرسم',
    starters: [
      'دوست داری درباره‌ی امروزت حرف بزنیم یا فعلاً نه؟',
      'اگه خواستی بگی، گوش می‌دم؛ نخواستی هم مشکلی نیست.',
    ],
    note: '«فعلاً نه» هم یک جواب کامل است.',
  },
  {
    id: 'offer',
    situation: 'می‌خوام بپرسم چه کمکی از دستم برمیاد',
    starters: [
      'کاری هست که بتونم برات انجام بدم؟',
      'ترجیح می‌دی گوش بدم یا با هم دنبال یه راه‌حل بگردیم؟',
    ],
    note: 'اگر چیزی به ذهنش نرسید، دو گزینه‌ی مشخص پیشنهاد بده.',
  },
  {
    id: 'plans',
    situation: 'می‌خوام درباره‌ی برنامه‌ها بپرسم',
    starters: [
      'برنامه‌ای که برای امشب گذاشته بودیم هنوز خوبه، یا ترجیح می‌دی عوضش کنیم؟',
      'اگه امروز دوست داری سبک‌تر باشه، بگو تا برنامه رو عوض کنیم.',
    ],
  },
  {
    id: 'declined',
    situation: 'گفت الان نمی‌خواد حرف بزنه',
    starters: ['باشه، هر وقت خواستی بگو.', 'هر وقت خواستی، من هستم.'],
    note: 'دوباره نپرس و دلیلش را نخواه.',
  },
  {
    id: 'not-about-cycle',
    situation: 'نمی‌خوام همه‌ی گفتگو درباره‌ی چرخه‌اش باشه',
    starters: ['امروز چی خوب بود؟', 'یه چیز کوچیک که امروز بهت چسبید چی بود؟'],
    note: 'لازم نیست هر گفتگویی درباره‌ی چرخه‌اش باشد.',
  },
];

// ── help ──────────────────────────────────────────────────────────────────────

export const HELP_INTRO_FA =
  'هر کدام را فقط وقتی پیشنهاد بده که با حال او جور است، و «نه» را راحت بپذیر.';

export const HELP_OPTIONS: HelpOption[] = [
  {
    id: 'ask-what-helps',
    title: 'بپرس چه چیزی کمک می‌کند',
    body: 'به‌جای حدس زدن، دو سه گزینه‌ی مشخص بده: «می‌خوای امشب شام رو من درست کنم، یا فقط کنارت بشینم، یا هیچ‌کدوم؟»',
    ifNo: 'اگر گفت «هیچ‌کدوم»، همان یک جواب کامل است.',
  },
  {
    id: 'small-task',
    title: 'یک کار کوچک را بردار',
    body: 'یک کار مشخص مثل خرید، شام یا جمع‌کردن چیزی را پیشنهاد بده و قبل از انجامش بپرس.',
    ifNo: 'اگر نخواست، بدون ناراحتی همان را به خودش بسپار.',
  },
  {
    id: 'time-together',
    title: 'وقت گذاشتن با هم',
    body: 'یک پیشنهاد سبک: یک قدم کوتاه، یک فیلم، یا فقط کنار هم بودن بدون حرف زدن.',
    ifNo: 'اگر ترجیح داد تنها باشد، همان را بپذیر.',
  },
  {
    id: 'her-space',
    title: 'اگر خودش گفت فضا می‌خواهد',
    body: 'همین حرفش را همان‌طور که هست بپذیر. می‌توانی فقط بپرسی: «کی دوباره بپرسم حالت چطوره؟»',
    ifNo: 'اگر خودش چنین چیزی نگفته، فرض نکن که فضا می‌خواهد.',
  },
];

export const HELP_AVOID: GuideCard = {
  id: 'usually-not-helpful',
  title: 'چیزهایی که معمولاً کمک نمی‌کنند',
  body: [],
  avoid: [
    'راه‌حل دادن وقتی راه‌حل نخواسته.',
    'مقایسه با آدم‌های دیگر.',
    'تکرار یک سؤال چند بار.',
    'ربط دادن همه‌چیز به پریود.',
  ],
  source: 'editorial',
};

/** Heading above the existing support actions, shown at the end of `help`. */
export const HELP_RECORD_TITLE_FA = 'اگه می‌خوای انتخابت رو ثبت کنی';

// ── helpers ───────────────────────────────────────────────────────────────────

export function isGuideSection(value: unknown): value is PartnerGuideSection {
  return typeof value === 'string' && (PARTNER_GUIDE_SECTIONS as string[]).includes(value);
}

/** Screen title for a route param; falls back to the guide's own title. */
export function guideSectionTitle(section: unknown): string {
  return isGuideSection(section) ? SECTION_META[section].title : GUIDE_TITLE_FA;
}

/** Every user-visible string in the guide, for content-rule tests. */
export function allGuideStrings(): string[] {
  const out: string[] = [GUIDE_INTRO_FA, GUIDE_FOOTER_FA, HELP_INTRO_FA, HELP_RECORD_TITLE_FA];
  for (const meta of Object.values(SECTION_META)) { out.push(meta.title, meta.subtitle); }
  const card = (c: GuideCard) => {
    out.push(c.title, ...c.body, ...(c.points ?? []), ...(c.avoid ?? []));
  };
  UNDERSTAND_CARDS.forEach(card);
  card(HELP_AVOID);
  for (const g of TALK_GROUPS) { out.push(g.situation, ...g.starters, ...(g.note ? [g.note] : [])); }
  for (const o of HELP_OPTIONS) { out.push(o.title, o.body, o.ifNo); }
  return out;
}
