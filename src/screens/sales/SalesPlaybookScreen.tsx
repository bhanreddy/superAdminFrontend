import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { BookOpen, ArrowRight, Search, MapPin, Brain, MessageSquare, ClipboardList, Check, ChevronDown, ChevronRight, Copy, ArrowUpRight, Target, ShieldCheck, Clock3, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { playbookChapters } from '../../content/salesPlaybook';
import { regionalGuides, stakeholderGuides, psychologyPrinciples, fieldObjections, researchSources, visitChecklist, meetingPriorities, meetingStages, buildVisitPlan, SchoolRegion } from '../../content/salesFieldGuide';

type Tab = 'Field guide' | 'Buyer psychology' | 'Objection lab' | 'Visit planner';
const tabs = [
  { label: 'Field guide' as Tab, icon: BookOpen },
  { label: 'Buyer psychology' as Tab, icon: Brain },
  { label: 'Objection lab' as Tab, icon: MessageSquare },
  { label: 'Visit planner' as Tab, icon: ClipboardList },
];
const journey = [
  { title: 'Connect', caption: 'Earn permission', chapter: 'discovery' },
  { title: 'Discover', caption: 'Find the real friction', chapter: 'incumbent' },
  { title: 'Demonstrate', caption: 'Show one useful outcome', chapter: 'demo' },
  { title: 'Build value', caption: 'Measure the difference', chapter: 'pricing' },
  { title: 'Agree', caption: 'Owner + action + date', chapter: 'close' },
];

export default function SalesPlaybookScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { chapter } = useLocalSearchParams<{ chapter?: string | string[] }>();
  const chapterId = Array.isArray(chapter) ? chapter[0] : chapter;
  const [tab, setTab] = useState<Tab>('Field guide');
  const [region, setRegion] = useState<SchoolRegion>('Telangana');
  const [search, setSearch] = useState('');
  const [audience, setAudience] = useState('All');
  const [selected, setSelected] = useState<string | null>(chapterId || null);
  const [stakeholderId, setStakeholderId] = useState('owner');
  const [principleId, setPrincipleId] = useState<string>('autonomy');
  const [objectionId, setObjectionId] = useState<string>('erp');
  const [checked, setChecked] = useState<number[]>([]);
  const [width, setWidth] = useState(1100);
  const [notice, setNotice] = useState('');
  const [jumpTarget, setJumpTarget] = useState<{ y: number } | null>(null);
  const [school, setSchool] = useState('');
  const [priority, setPriority] = useState<string>(meetingPriorities[0]);
  const [stage, setStage] = useState<string>(meetingStages[0]);
  const [baseline, setBaseline] = useState('');
  const [owner, setOwner] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const chapterTop = useRef(0);
  const navigationTop = useRef(0);
  const chapterOffsets = useRef<Record<string, number>>({});
  const pendingChapter = useRef<string | null>(chapterId || null);
  React.useEffect(() => {
    if (jumpTarget) scrollRef.current?.scrollTo({ y: jumpTarget.y, animated: true });
  }, [jumpTarget]);
  React.useEffect(() => {
    setSelected(chapterId || null);
    if (chapterId) {
      pendingChapter.current = chapterId;
      setTab('Field guide'); setAudience('All'); setSearch('');
      if (chapterOffsets.current[chapterId] !== undefined) {
        setJumpTarget({ y: chapterTop.current + chapterOffsets.current[chapterId] + 24 });
      }
    }
  }, [chapterId]);
  const chapters = useMemo(() => playbookChapters.filter((item) =>
    (audience === 'All' || item.audience === audience) &&
    JSON.stringify(item).toLowerCase().includes(search.trim().toLowerCase()),
  ), [audience, search]);
  const compact = width < 720;
  const wide = width >= 1080;
  const local = regionalGuides[region];
  const stakeholder = stakeholderGuides.find((item) => item.id === stakeholderId)!;
  const principle = psychologyPrinciples.find((item) => item.id === principleId)!;
  const objection = fieldObjections.find((item) => item.id === objectionId)!;
  const plan = buildVisitPlan({ school, region, stakeholderId, priority, stage, baseline, owner, reviewDate });
  const card = { backgroundColor: isDark ? '#18242F' : '#FFFFFF', borderColor: colors.border };
  const muted = { color: colors.textSecondary };
  const ink = { color: colors.textPrimary };
  const accent = isDark ? '#A7D9CE' : '#216254';
  const tint = isDark ? '#213A36' : '#EDF5F1';
  const copy = async (value: string, label: string) => {
    try {
      const copied = await Clipboard.setStringAsync(value);
      setNotice(copied === false ? 'Clipboard unavailable. Select and copy the text below.' : `${label} copied.`);
    } catch { setNotice('Could not copy. Select and copy the text below.'); }
  };
  const openSource = async (url: string) => {
    try { await Linking.openURL(url); } catch { setNotice('Could not open the source. Try again when your browser is available.'); }
  };
  const pill = (label: string, active: boolean, onPress: () => void, a11y = label) => (
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ selected: active }} onPress={onPress}
      style={({ pressed }) => [styles.filter, { borderColor: active ? accent : colors.border, backgroundColor: active ? tint : card.backgroundColor, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[styles.pillText, { color: active ? accent : colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
  const copyButton = (label: string, value: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => copy(value, label.replace(/^Copy /, ''))} style={[styles.copyButton, { borderColor: colors.border }]}>
      <Copy size={14} color={accent} /><Text style={[styles.smallBold, { color: accent }]}>{label}</Text>
    </Pressable>
  );
  const field = (label: string, value: string, onChangeText: (text: string) => void, placeholder: string, multiline = false) => (
    <View style={styles.field}>
      <Text style={[styles.smallBold, ink]}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textSecondary}
        multiline={multiline} style={[styles.input, ink, { borderColor: colors.border, backgroundColor: isDark ? '#111D27' : '#F8FAF9', minHeight: multiline ? 82 : 46, textAlignVertical: multiline ? 'top' : 'center' }]} />
    </View>
  );
  const switchTab = (next: Tab) => {
    setTab(next);
    scrollRef.current?.scrollTo({ y: Math.max(0, navigationTop.current + 12), animated: true });
  };
  const chooseChapter = (id: string) => {
    pendingChapter.current = selected === id ? null : id;
    setAudience('All'); setSearch(''); setSelected(id);
    setJumpTarget({ y: chapterTop.current + (chapterOffsets.current[id] || 0) + 24 });
  };
  const choiceRail = (children: React.ReactNode) => wide
    ? <View style={[styles.sideColumn, { gap: 10 }]}>{children}</View>
    : <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 2 }}>{children}</ScrollView>;
  const checklist = (
    <View style={[styles.panel, card]}>
      <View style={styles.between}><ClipboardList size={19} color={accent} /><Text style={[styles.counter, { color: accent, backgroundColor: tint }]}>{checked.length}/{visitChecklist.length}</Text></View>
      <Text style={[styles.sectionTitle, ink]}>Before you walk in</Text>
      <Text style={[styles.small, muted]}>A little preparation. A better conversation.</Text>
      {visitChecklist.map((item, index) => {
        const done = checked.includes(index);
        return <Pressable key={item} accessibilityRole="checkbox" accessibilityLabel={item} accessibilityState={{ checked: done }}
          onPress={() => setChecked((items) => done ? items.filter((i) => i !== index) : [...items, index])} style={styles.checkRow}>
          <View style={[styles.checkbox, { borderColor: done ? accent : colors.border, backgroundColor: done ? tint : 'transparent' }]}>{done && <Check size={13} color={accent} />}</View>
          <Text style={[styles.small, { flex: 1, color: done ? accent : colors.textSecondary }]}>{item}</Text>
        </Pressable>;
      })}
      <Text style={[styles.caption, muted]}>Checklist resets when you leave this page.</Text>
      <Pressable accessibilityRole="button" onPress={() => switchTab('Visit planner')} style={[styles.inlineLink, { borderTopColor: colors.border }]}>
        <Text style={[styles.smallBold, { color: accent }]}>Build a school visit plan</Text><ArrowRight size={16} color={accent} />
      </Pressable>
    </View>
  );
  return (
    <ScrollView ref={scrollRef} style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.playbookPage, { padding: compact ? 16 : 28 }]}
      onLayout={(event) => { const next = event.nativeEvent.layout.width; if (next > 0) setWidth(next); }}>
      <View style={styles.workspace}>
        <View style={styles.headingRow}>
          <View style={styles.brandRow}><View style={[styles.brandIcon, { backgroundColor: tint }]}><BookOpen size={19} color={accent} /></View><Text style={[styles.eyebrow, { color: accent, marginBottom: 0 }]}>SCHOOLIMS / SALES ENABLEMENT</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Start sales training" onPress={() => router.push('/sales/training' as any)} style={styles.trainingLink}>
            <Text style={[styles.smallBold, muted]}>Sales training</Text><ArrowUpRight size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.hero, { padding: compact ? 24 : 34 }]}>
          <View style={[styles.heroRow, compact && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={styles.heroCopy}>
              <View style={styles.heroBadge}><View style={styles.liveDot} /><Text style={styles.heroBadgeText}>THE REGIONAL FIELD EDITION</Text></View>
              <Text accessibilityRole="header" style={[styles.heroTitle, { fontSize: compact ? 34 : 44, lineHeight: compact ? 41 : 52 }]}>Better conversations.{ '\n' }Stronger school partnerships.</Text>
              <Text style={styles.heroSubtitle}>Your sales playbook for Telangana & Karnataka. Understand the people. Prove the value. Earn the next step.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Prepare my next visit" onPress={() => switchTab('Visit planner')} style={({ pressed }) => [styles.heroButton, { opacity: pressed ? 0.8 : 1 }]}>
                <Text style={styles.heroButtonText}>Prepare my next visit</Text><ArrowRight size={17} color="#18382F" />
              </Pressable>
            </View>
            {!compact && <View style={styles.heroAside}>
              <Text style={styles.heroAsideLabel}>THE CONVERSATION TO REMEMBER</Text>
              <Text style={styles.heroQuote}>“What still needs a phone call, a second entry, or your personal follow-up?”</Text>
              <View style={styles.heroRule} />
              <View style={styles.heroMeta}><Clock3 size={15} color="#B6CBBF" /><Text style={styles.heroMetaText}>A 30-minute meeting. One useful next step.</Text></View>
            </View>}
          </View>
          <View style={styles.heroFooter}>
            {['School-first discovery', 'Psychology into practice', 'Evidence before promises'].map((label) => <View key={label} style={styles.heroMeta}><Check size={14} color="#C4E6A3" /><Text style={styles.heroFooterText}>{label}</Text></View>)}
          </View>
        </View>

        <View style={[styles.contextBar, card]}>
          <View style={styles.contextLabel}><MapPin size={17} color={accent} /><Text style={[styles.smallBold, ink]}>Your school context</Text></View>
          <View style={styles.filters}>{(['Telangana', 'Karnataka'] as const).map((item) => pill(item, region === item, () => setRegion(item)))}</View>
          <Text style={[styles.small, muted, { flex: 1, minWidth: 160 }]}>{local.language} + the school’s preferred languages</Text>
        </View>
        <ScrollView onLayout={(event) => { navigationTop.current = event.nativeEvent.layout.y; }} horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {tabs.map(({ label, icon: Icon }) => <Pressable key={label} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: tab === label }} onPress={() => switchTab(label)}
            style={[styles.tab, { borderBottomColor: tab === label ? accent : 'transparent' }]}>
            <Icon size={17} color={tab === label ? accent : colors.textSecondary} /><Text style={[styles.tabText, { color: tab === label ? accent : colors.textSecondary }]}>{label}</Text>
            {label === 'Objection lab' && <Text style={[styles.tabCount, { backgroundColor: tint, color: accent }]}>{fieldObjections.length}</Text>}
          </Pressable>)}
        </ScrollView>
        {!!notice && <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: tint }]}>
          <Text style={[styles.small, { color: accent, flex: 1 }]}>{notice}</Text><Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={() => setNotice('')} hitSlop={10}><X size={16} color={accent} /></Pressable>
        </View>}

        {tab === 'Field guide' && <>
          <View style={styles.sectionHeading}><View style={{ flex: 1 }}><Text style={[styles.sectionTitle, ink]}>One meeting. Five purposeful moves.</Text><Text style={[styles.small, muted]}>Choose a move to jump into the relevant chapter.</Text></View><Text style={[styles.caption, muted]}>THE CONVERSATION MAP</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.journey}>
            {journey.map((item, index) => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={`Explore ${item.title}`} onPress={() => chooseChapter(item.chapter)}
              style={({ pressed }) => [styles.journeyCard, card, { opacity: pressed ? 0.75 : 1 }]}>
              <View style={styles.between}><Text style={[styles.stepNumber, { color: accent }]}>0{index + 1}</Text><ArrowUpRight size={15} color={colors.textSecondary} /></View>
              <Text style={[styles.smallBold, ink]}>{item.title}</Text><Text style={[styles.caption, muted]}>{item.caption}</Text>
            </Pressable>)}
          </ScrollView>
          <View style={[styles.columns, !wide && { flexDirection: 'column' }]}>
            <View style={styles.mainColumn}>
              <View style={[styles.panel, card]}>
                <View style={styles.sectionHeading}><View><Text style={[styles.eyebrow, { color: accent }]}>LOCAL CONTEXT / {region.toUpperCase()}</Text><Text style={[styles.sectionTitle, ink]}>Start with their school, in their language.</Text></View><MapPin size={22} color={accent} /></View>
                <Text style={[styles.body, muted]}>{local.context}</Text>
                <View style={[styles.quoteBox, { backgroundColor: tint, borderLeftColor: accent }]}>
                  <Text selectable style={[styles.localGreeting, { color: accent }]}>{local.greeting} <Text style={styles.small}>/ {local.transliteration}</Text></Text>
                  <Text selectable style={[styles.body, ink]}>{local.opener}</Text><Text style={[styles.small, muted]}>{local.translation}</Text>
                  {copyButton('Copy opening', `${local.greeting}. ${local.opener}\n${local.translation}`)}
                </View>
                {local.questions.map((question, index) => <View key={question} style={styles.promptRow}><Text style={[styles.promptNumber, { color: accent }]}>0{index + 1}</Text><Text style={[styles.small, muted, { flex: 1 }]}>{question}</Text></View>)}
                <Text style={[styles.caption, muted]}>Conversation examples, not product translations. Ask their language preference; have school-facing copy reviewed by a fluent local colleague.</Text>
              </View>
              <View style={[styles.panel, card]}>
                <Text style={[styles.eyebrow, { color: accent }]}>READ THE ROOM</Text><Text style={[styles.sectionTitle, ink]}>Same school. Different priorities.</Text>
                <View style={styles.filters}>{stakeholderGuides.map((item) => pill(item.label, stakeholderId === item.id, () => setStakeholderId(item.id)))}</View>
                <Text style={[styles.smallBold, { color: accent }]}>{stakeholder.priority}</Text>
                <View style={styles.promptRow}><Text style={[styles.talkLabel, { color: accent }]}>ASK</Text><Text selectable style={[styles.body, ink, { flex: 1 }]}>{stakeholder.ask}</Text></View>
                <View style={styles.promptRow}><Text style={[styles.talkLabel, { color: accent }]}>SHOW</Text><Text style={[styles.small, muted, { flex: 1 }]}>{stakeholder.show}</Text></View>
                <View style={styles.promptRow}><Text style={[styles.talkLabel, { color: accent }]}>AGREE</Text><Text style={[styles.small, muted, { flex: 1 }]}>{stakeholder.close}</Text></View>
              </View>
            </View>
            <View style={[styles.sideColumn, !wide && { width: '100%' }]}>
              {checklist}
              <View style={[styles.panel, { backgroundColor: tint, borderWidth: 0 }]}><ShieldCheck size={23} color={accent} /><Text style={[styles.sectionTitle, ink]}>Trust is the advantage.</Text><Text style={[styles.small, muted]}>Use a real reference with permission. Show the full annual investment. Make the school’s choice easy to evaluate.</Text><Text style={[styles.smallBold, { color: accent }]}>No invented urgency. No guaranteed outcomes.</Text></View>
            </View>
          </View>
          <View onLayout={(event) => {
            chapterTop.current = event.nativeEvent.layout.y;
            const id = pendingChapter.current;
            if (id && chapterOffsets.current[id] !== undefined) {
              pendingChapter.current = null;
              setJumpTarget({ y: chapterTop.current + chapterOffsets.current[id] + 24 });
            }
          }} style={styles.chapterLibrary}>
            <View style={styles.sectionHeading}><View><Text style={[styles.sectionTitle, ink]}>The complete field library</Text><Text style={[styles.small, muted]}>Open a chapter for talk tracks, discovery questions and proof points.</Text></View><Text style={[styles.counter, { color: accent, backgroundColor: tint }]}>{chapters.length} chapters</Text></View>
            <View style={[styles.search, card]}><Search size={18} color={colors.textSecondary} /><TextInput accessibilityLabel="Search sales playbook" placeholder="Search discovery, fees, objections, migration…" placeholderTextColor={colors.textSecondary} value={search} onChangeText={setSearch} style={[styles.searchInput, ink]} />{!!search && <Pressable accessibilityRole="button" accessibilityLabel="Clear chapter search" onPress={() => setSearch('')} hitSlop={10}><X size={17} color={colors.textSecondary} /></Pressable>}</View>
            <View style={styles.filters}>{['All', 'Every school', 'Existing ERP'].map((filter) => pill(filter, audience === filter, () => setAudience(filter)))}</View>
            {chapters.map((item) => {
              const open = selected === item.id;
              const index = playbookChapters.findIndex((entry) => entry.id === item.id);
              return <View key={item.id} onLayout={(event) => {
                chapterOffsets.current[item.id] = event.nativeEvent.layout.y;
                if (pendingChapter.current === item.id && chapterTop.current > 0) {
                  pendingChapter.current = null;
                  setJumpTarget({ y: chapterTop.current + event.nativeEvent.layout.y + 24 });
                }
              }} style={[styles.chapter, card, open && { borderColor: accent }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{ expanded: open }} onPress={() => setSelected(open ? null : item.id)} style={styles.chapterHeader}>
                  <View style={[styles.number, { backgroundColor: tint }]}><Text style={[styles.smallBold, { color: accent }]}>{String(index + 1).padStart(2, '0')}</Text></View>
                  <View style={{ flex: 1, gap: 4 }}><Text style={[styles.sectionTitle, ink, { fontSize: 16 }]}>{item.title}</Text><Text style={[styles.small, muted]}>{item.summary}</Text><Text style={[styles.source, { color: accent }]}>{item.audience}</Text></View>
                  {open ? <ChevronDown size={19} color={accent} /> : <ChevronRight size={19} color={colors.textSecondary} />}
                </Pressable>
                {open && <View style={[styles.chapterBody, { borderColor: colors.border }]}>
                  {item.sections.map((section) => <View key={section.title} style={{ gap: 8 }}><Text style={[styles.smallBold, ink]}>{section.title}</Text><Text selectable style={[styles.body, muted]}>{section.body}</Text>{section.prompts?.map((prompt) => <View style={styles.promptRow} key={prompt}><Text style={{ color: accent }}>•</Text><Text selectable style={[styles.body, muted, { flex: 1 }]}>{prompt}</Text></View>)}</View>)}
                  <Text style={[styles.source, muted]}>Reference: {item.source}</Text>
                </View>}
              </View>;
            })}
            {!chapters.length && <View style={[styles.panel, card]}><Search size={24} color={accent} /><Text style={[styles.sectionTitle, ink]}>No chapters match</Text><Text style={[styles.body, muted]}>Try another topic or reset your filters.</Text><Pressable accessibilityRole="button" accessibilityLabel="Reset chapter filters" onPress={() => { setSearch(''); setAudience('All'); }}><Text style={[styles.smallBold, { color: accent }]}>Reset filters →</Text></Pressable></View>}
          </View>
        </>}

        {tab === 'Buyer psychology' && <>
          <View style={styles.sectionHeading}><View style={{ flex: 1 }}><Text style={[styles.sectionTitle, ink]}>Understand the decision behind the decision.</Text><Text style={[styles.body, muted]}>Four research-informed lenses. Practical language for your next school meeting.</Text></View><Brain size={25} color={accent} /></View>
          <View style={[styles.columns, !wide && { flexDirection: 'column' }]}>
            {choiceRail(psychologyPrinciples.map((item, index) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{ selected: principleId === item.id }} onPress={() => setPrincipleId(item.id)} style={[styles.principleCard, card, !wide && { width: 250 }, principleId === item.id && { borderColor: accent, backgroundColor: tint }]}><Text style={[styles.caption, { color: accent }]}>0{index + 1} / {item.stage.toUpperCase()}</Text><Text style={[styles.smallBold, ink]}>{item.title}</Text><Text style={[styles.small, muted]}>{item.concept}</Text></Pressable>))}
            <View style={[styles.panel, card, { flex: 1 }]}>
              <Text style={[styles.eyebrow, { color: accent }]}>{principle.stage.toUpperCase()}</Text><Text style={[styles.title, ink, { fontSize: 28 }]}>{principle.title}</Text><Text style={[styles.smallBold, { color: accent }]}>{principle.concept}</Text><Text style={[styles.body, muted]}>{principle.explanation}</Text>
              <Text style={[styles.smallBold, ink]}>Listen for this</Text><Text style={[styles.body, muted]}>{principle.signal}</Text>
              <View style={[styles.quoteBox, { backgroundColor: tint, borderLeftColor: accent }]}><Text style={[styles.eyebrow, { color: accent }]}>TRY SAYING</Text><Text selectable style={[styles.quoteText, ink]}>{principle.say}</Text>{copyButton('Copy talk track', principle.say)}</View>
              <Text style={[styles.smallBold, ink]}>Put it into practice</Text><Text style={[styles.body, muted]}>{principle.action}</Text>
              <View style={[styles.practiceNote, { borderColor: colors.border }]}><ShieldCheck size={18} color={accent} /><View style={{ flex: 1, gap: 4 }}><Text style={[styles.smallBold, ink]}>Keep it respectful</Text><Text style={[styles.small, muted]}>{principle.avoid}</Text></View></View>
              <Pressable accessibilityRole="link" accessibilityLabel={`Read research: ${principle.concept}`} onPress={() => openSource(researchSources.find((source) => source.id === principle.source)!.url)} style={styles.trainingLink}><Text style={[styles.smallBold, { color: accent }]}>Read the original research</Text><ArrowUpRight size={15} color={accent} /></Pressable>
            </View>
          </View>
          <Text style={[styles.small, muted]}>These are general psychology concepts, adapted here as sales coaching. They are not validated predictions about Telangana or Karnataka school leaders, and they do not guarantee a sale.</Text>
        </>}

        {tab === 'Objection lab' && <>
          <View style={styles.sectionHeading}><View style={{ flex: 1 }}><Text style={[styles.sectionTitle, ink]}>A concern is a question worth understanding.</Text><Text style={[styles.body, muted]}>Acknowledge → Ask → Prove → Advance. Rehearse the response; keep the conversation natural.</Text></View><MessageSquare size={24} color={accent} /></View>
          <View style={[styles.columns, !wide && { flexDirection: 'column' }]}>
            {choiceRail(fieldObjections.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{ selected: objection.id === item.id }} onPress={() => setObjectionId(item.id)} style={[styles.principleCard, card, !wide && { width: 250 }, objection.id === item.id && { borderColor: accent, backgroundColor: tint }]}><Text style={[styles.smallBold, ink]}>{item.title}</Text><Text style={[styles.caption, muted]}>{item.tag}</Text></Pressable>))}
            <View style={[styles.panel, card, { flex: 1 }]}>
              <Text style={[styles.eyebrow, { color: accent }]}>{objection.tag.toUpperCase()}</Text><Text style={[styles.title, ink, { fontSize: 27 }]}>{objection.title}</Text>
              {([['01', 'Acknowledge', objection.acknowledge], ['02', 'Ask', objection.ask], ['03', 'Prove', objection.prove], ['04', 'Advance', objection.advance]]).map(([number, label, value]) => <View key={label} style={styles.objectionStep}><View style={[styles.number, { backgroundColor: tint }]}><Text style={[styles.smallBold, { color: accent }]}>{number}</Text></View><View style={{ flex: 1, gap: 7 }}><Text style={[styles.smallBold, ink]}>{label}</Text><Text selectable style={[styles.body, muted]}>{value}</Text></View></View>)}
              <View style={[styles.quoteBox, { backgroundColor: tint, borderLeftColor: accent }]}><Text style={[styles.smallBold, { color: accent }]}>{region} proof prompt</Text><Text style={[styles.small, muted]}>{local.proof}</Text></View>
              <View style={styles.filters}>{copyButton('Copy response', `${objection.title}\n\nAcknowledge: ${objection.acknowledge}\nAsk: ${objection.ask}\nProve: ${objection.prove}\nAdvance: ${objection.advance}\n\n${region}: ${local.proof}`)}<Pressable accessibilityRole="button" accessibilityLabel="Explore the psychology" onPress={() => { setPrincipleId(objection.principle); switchTab('Buyer psychology'); }} style={styles.copyButton}><Brain size={15} color={accent} /><Text style={[styles.smallBold, { color: accent }]}>Explore the psychology</Text></Pressable></View>
            </View>
          </View>
        </>}

        {tab === 'Visit planner' && <>
          <View style={styles.sectionHeading}><View style={{ flex: 1 }}><Text style={[styles.sectionTitle, ink]}>Walk in with a plan. Leave with a next step.</Text><Text style={[styles.body, muted]}>Build a 30-minute agenda and a follow-up draft for a {region} school.</Text></View><Target size={25} color={accent} /></View>
          <View style={[styles.columns, !wide && { flexDirection: 'column' }]}>
            <View style={[styles.panel, card, { flex: 1 }]}>
              <Text style={[styles.sectionTitle, ink]}>Make it specific</Text><Text style={[styles.caption, muted]}>Working draft for this visit. Copy it before leaving; entries are not saved.</Text>
              {field('School name', school, setSchool, 'e.g. your next school visit')}
              <Text style={[styles.smallBold, ink]}>Who are you meeting?</Text><View style={styles.filters}>{stakeholderGuides.map((item) => pill(item.label, stakeholderId === item.id, () => setStakeholderId(item.id)))}</View>
              <Text style={[styles.smallBold, ink]}>Conversation type</Text><View style={styles.filters}>{meetingStages.map((item) => pill(item, stage === item, () => setStage(item)))}</View>
              <Text style={[styles.smallBold, ink]}>Priority workflow</Text><View style={styles.filters}>{meetingPriorities.map((item) => pill(item, priority === item, () => setPriority(item)))}</View>
              {field('Baseline / success measure', baseline, setBaseline, 'e.g. measure weekly time spent reconciling the sample ledger', true)}
              {field('Action owner', owner, setOwner, 'Name and role agreed with the school')}
              {field('Review date / time', reviewDate, setReviewDate, 'Agreed date, time and meeting channel')}
              <Pressable accessibilityRole="button" accessibilityLabel="Copy visit plan and follow-up" onPress={() => copy(plan, 'Visit plan and follow-up')} style={styles.primary}><Copy size={16} color="#FFFFFF" /><Text style={styles.primaryText}>Copy visit plan & follow-up</Text></Pressable>
            </View>
            <View style={[styles.panel, card, { flex: 1 }]}><View style={styles.between}><Text style={[styles.eyebrow, { color: accent }]}>LIVE PLAN PREVIEW</Text><Text style={[styles.counter, { color: accent, backgroundColor: tint }]}>30 MIN</Text></View><Text selectable style={[styles.planText, ink]}>{plan}</Text></View>
          </View>
        </>}

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.contextLabel}><BookOpen size={16} color={accent} /><Text style={[styles.smallBold, ink]}>Built for the field. Grounded in evidence.</Text></View>
          <Text style={[styles.caption, muted]}>Internal Nexsyrus enablement · Based on SchoolIMS Sales Playbook v1.0 and Incumbent ERP Battlebook v2.4. Historical pricing and performance examples are not approved offers. Confirm current capabilities, language support, pricing and implementation scope before a commitment.</Text>
          <View style={styles.filters}>{researchSources.map((source) => <Pressable key={source.id} accessibilityRole="link" onPress={() => openSource(source.url)}><Text style={[styles.source, { color: accent }]}>{source.label} ↗</Text></Pressable>)}</View>
        </View>
      </View>
    </ScrollView>
  );
}

// Shared typography and card primitives are also used by SalesTrainingScreen.
export const styles = StyleSheet.create({
  page: { padding: 28, paddingBottom: 100, gap: 18, flexGrow: 1 },
  playbookPage: { padding: 28, flexGrow: 1, alignItems: 'center' },
  workspace: { width: '100%', maxWidth: 1440, gap: 22, paddingBottom: 80 },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  brandIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: '#3186D8', fontWeight: '800', fontSize: 10, letterSpacing: 1.4, marginBottom: 5, lineHeight: 17 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 23, marginTop: 8 },
  trainingLink: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 8, alignSelf: 'flex-start', flexShrink: 1 },
  hero: { backgroundColor: '#142F2B', borderRadius: 24, overflow: 'hidden', gap: 26 },
  heroRow: { flexDirection: 'row', gap: 30, alignItems: 'center' },
  heroCopy: { flex: 1, gap: 18 },
  heroBadge: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C4E6A3' },
  heroBadgeText: { color: '#C4E6A3', fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  heroTitle: { color: '#F5F9F4', fontWeight: '700', letterSpacing: -1.6 },
  heroSubtitle: { color: '#B6CBC3', fontSize: 14, lineHeight: 23, maxWidth: 540 },
  heroButton: { backgroundColor: '#D5EDB6', flexDirection: 'row', gap: 18, alignItems: 'center', alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 13 },
  heroButtonText: { color: '#18382F', fontSize: 13, fontWeight: '700' },
  heroAside: { width: 260, backgroundColor: '#203C36', padding: 22, borderWidth: 1, borderColor: '#375149', borderRadius: 16, gap: 16 },
  heroAsideLabel: { color: '#BDD2C5', fontSize: 9, fontWeight: '700', lineHeight: 16, letterSpacing: 1.3 },
  heroQuote: { color: '#F1F5E9', fontSize: 21, fontWeight: '500', lineHeight: 31, letterSpacing: -0.4 },
  heroRule: { height: 1, backgroundColor: '#3B554B' },
  heroMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 1 },
  heroMetaText: { color: '#B6CBC3', fontSize: 11, lineHeight: 18, flex: 1 },
  heroFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, borderTopWidth: 1, borderTopColor: '#355047', paddingTop: 18 },
  heroFooterText: { color: '#D1E0D5', fontSize: 11 },
  contextBar: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center' },
  contextLabel: { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 1 },
  tabBar: { flexDirection: 'row', gap: 22, borderBottomWidth: 1 },
  tab: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 2, paddingVertical: 15, borderBottomWidth: 3 },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabCount: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, fontSize: 10, fontWeight: '700' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '700', lineHeight: 27, letterSpacing: -0.3 },
  body: { fontSize: 14, lineHeight: 24 },
  small: { fontSize: 13, lineHeight: 21 },
  smallBold: { fontSize: 13, fontWeight: '700', lineHeight: 21 },
  caption: { fontSize: 11, lineHeight: 18 },
  journey: { flexDirection: 'row', gap: 10, paddingBottom: 2, flexGrow: 1 },
  journeyCard: { borderWidth: 1, borderRadius: 13, padding: 16, minWidth: 162, flex: 1, gap: 5 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  stepNumber: { fontSize: 11, fontWeight: '700', marginBottom: 9, letterSpacing: 1 },
  columns: { flexDirection: 'row', alignItems: 'stretch', gap: 20 },
  mainColumn: { flex: 1, minWidth: 0, gap: 20 },
  sideColumn: { width: 280, gap: 20 },
  panel: { borderWidth: 1, borderRadius: 17, padding: 22, gap: 14 },
  quoteBox: { padding: 18, borderRadius: 10, borderLeftWidth: 3, gap: 9 },
  localGreeting: { fontSize: 22, fontWeight: '700', lineHeight: 32 },
  quoteText: { fontSize: 20, lineHeight: 31, letterSpacing: -0.3 },
  promptRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  promptNumber: { fontSize: 11, fontWeight: '700', lineHeight: 20 },
  talkLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, width: 44, lineHeight: 24 },
  counter: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  checkRow: { flexDirection: 'row', gap: 10, paddingVertical: 3, alignItems: 'flex-start' },
  checkbox: { width: 19, height: 19, borderWidth: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  inlineLink: { borderTopWidth: 1, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filter: { paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderRadius: 8 },
  pillText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  copyButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: 'transparent', borderRadius: 7, alignSelf: 'flex-start', flexShrink: 1 },
  chapterLibrary: { gap: 13 },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  searchInput: { paddingVertical: 15, flex: 1, fontSize: 13, minWidth: 0 },
  chapter: { borderWidth: 1, borderRadius: 14, padding: 20, gap: 12 },
  chapterHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  number: { width: 37, height: 37, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chapterBody: { borderTopWidth: 1, paddingTop: 20, gap: 22 },
  source: { fontSize: 11, lineHeight: 19, marginTop: 3 },
  principleCard: { borderWidth: 1, borderRadius: 12, padding: 18, gap: 6 },
  practiceNote: { borderWidth: 1, padding: 16, borderRadius: 10, flexDirection: 'row', gap: 10 },
  objectionStep: { flexDirection: 'row', gap: 14, paddingVertical: 8 },
  field: { gap: 7 },
  input: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13, lineHeight: 21 },
  planText: { fontSize: 13, lineHeight: 23 },
  primary: { backgroundColor: '#216254', borderRadius: 10, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  notice: { borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  footer: { borderTopWidth: 1, paddingTop: 22, gap: 12, marginTop: 10 },
});
