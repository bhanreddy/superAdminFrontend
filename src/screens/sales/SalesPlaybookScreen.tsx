import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { BookOpen, ArrowRight, Search, MapPin, Brain, MessageSquare, ClipboardList, Check, ChevronDown, ChevronRight, Copy, ArrowUpRight, Target, ShieldCheck, Clock3, X, Users, Monitor, TrendingUp, Flag, Sparkles, GraduationCap, Quote } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { playbookChapters } from '../../content/salesPlaybook';
import { regionalGuides, stakeholderGuides, psychologyPrinciples, fieldObjections, researchSources, visitChecklist, meetingPriorities, meetingStages, buildVisitPlan, SchoolRegion } from '../../content/salesFieldGuide';

type Tab = 'Field guide' | 'Buyer psychology' | 'Objection lab' | 'Visit planner';
const tabs = [
  { label: 'Field guide' as Tab, icon: BookOpen, detail: 'Start the conversation' },
  { label: 'Buyer psychology' as Tab, icon: Brain, detail: 'Understand the buyer' },
  { label: 'Objection lab' as Tab, icon: MessageSquare, detail: 'Rehearse your response' },
  { label: 'Visit planner' as Tab, icon: ClipboardList, detail: 'Make your next move' },
];
const journey = [
  { title: 'Connect', caption: 'Earn permission', chapter: 'discovery', icon: Users, color: '#7660C9', background: '#F0EAFC' },
  { title: 'Discover', caption: 'Find the real friction', chapter: 'incumbent', icon: Search, color: '#498A78', background: '#EAF5EF' },
  { title: 'Demonstrate', caption: 'Show one useful outcome', chapter: 'demo', icon: Monitor, color: '#5886C6', background: '#EDF3FC' },
  { title: 'Build value', caption: 'Measure the difference', chapter: 'pricing', icon: TrendingUp, color: '#B2823A', background: '#FCF3E4' },
  { title: 'Agree', caption: 'Owner + action + date', chapter: 'close', icon: Flag, color: '#B06D89', background: '#FAEDF3' },
];

export default function SalesPlaybookScreen() {
  const { isDark } = useTheme();
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
  const border = isDark ? '#303345' : '#E7E9F2';
  const pageBackground = isDark ? '#11141F' : '#F7F8FC';
  const card = { backgroundColor: isDark ? '#1B1F2D' : '#FFFFFF', borderColor: border };
  const muted = { color: isDark ? '#ADB1C5' : '#70768C' };
  const ink = { color: isDark ? '#F1F1FA' : '#252941' };
  const accent = isDark ? '#C0B5FF' : '#6655C9';
  const tint = isDark ? '#2D2845' : '#F0EDFC';
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
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ selected: active }} aria-selected={active} onPress={onPress}
      style={({ pressed }) => [ui.filter, { borderColor: active ? (isDark ? '#66559C' : '#6655C9') : border, backgroundColor: active ? (isDark ? '#4B3E7D' : '#6655C9') : card.backgroundColor, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[ui.pillText, { color: active ? '#FFFFFF' : muted.color }]}>{label}</Text>
    </Pressable>
  );
  const copyButton = (label: string, value: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => copy(value, label.replace(/^Copy /, ''))} style={[ui.copyButton, { borderColor: border }]}>
      <Copy size={14} color={accent} /><Text style={[ui.smallBold, { color: accent }]}>{label}</Text>
    </Pressable>
  );
  const field = (label: string, value: string, onChangeText: (text: string) => void, placeholder: string, multiline = false) => (
    <View style={ui.field}>
      <Text style={[ui.smallBold, ink]}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={muted.color}
        multiline={multiline} style={[ui.input, ink, { borderColor: border, backgroundColor: isDark ? '#111D27' : '#F8FAF9', minHeight: multiline ? 82 : 46, textAlignVertical: multiline ? 'top' : 'center' }]} />
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
    ? <View style={[ui.sideColumn, { gap: 10 }]}>{children}</View>
    : <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 2 }}>{children}</ScrollView>;
  const checklist = (
    <View style={[ui.panel, card]}>
      <View style={ui.between}><View style={[ui.contextIcon, { backgroundColor: tint }]}><ClipboardList size={20} color={accent} /></View><Text style={[ui.counter, { color: accent, backgroundColor: tint }]}>{checked.length}/{visitChecklist.length} ready</Text></View>
      <Text style={[ui.sectionTitle, ink]}>Before you walk in</Text>
      <Text style={[ui.small, muted]}>Five small checks for a confident school visit.</Text>
      <View accessibilityRole="progressbar" accessibilityLabel="Visit preparation" accessibilityValue={{ min: 0, max: visitChecklist.length, now: checked.length }} style={[ui.progressTrack, { backgroundColor: tint }]}><View style={[ui.progressFill, { width: `${checked.length / visitChecklist.length * 100}%`, backgroundColor: accent }]} /></View>
      {visitChecklist.map((item, index) => {
        const done = checked.includes(index);
        return <Pressable key={item} accessibilityRole="checkbox" accessibilityLabel={item} accessibilityState={{ checked: done }} aria-checked={done}
          onPress={() => setChecked((items) => done ? items.filter((i) => i !== index) : [...items, index])} style={ui.checkRow}>
          <View style={[ui.checkbox, { borderColor: done ? accent : border, backgroundColor: done ? tint : 'transparent' }]}>{done && <Check size={13} color={accent} />}</View>
          <Text style={[ui.small, { flex: 1, color: done ? accent : muted.color }]}>{item}</Text>
        </Pressable>;
      })}
      <Text style={[ui.caption, muted]}>Checklist resets when you leave this page.</Text>
      <Pressable accessibilityRole="button" onPress={() => switchTab('Visit planner')} style={[ui.inlineLink, { borderTopColor: border }]}>
        <Text style={[ui.smallBold, { color: accent }]}>Build a school visit plan</Text><ArrowRight size={16} color={accent} />
      </Pressable>
    </View>
  );
  return (
    <ScrollView ref={scrollRef} style={{ backgroundColor: pageBackground }} contentContainerStyle={[ui.playbookPage, { padding: compact ? 16 : 28 }]}
      onLayout={(event) => { const next = event.nativeEvent.layout.width; if (next > 0) setWidth(next); }}>
      <View style={ui.workspace}>
        <View style={ui.headingRow}>
          <View style={ui.brandRow}>
            <View style={[ui.brandIcon, { backgroundColor: tint }]}><BookOpen size={22} color={accent} /></View>
            <View style={{ gap: 3 }}><Text style={[ui.eyebrow, { color: muted.color, marginBottom: 0 }]}>SCHOOLIMS / SALES ENABLEMENT</Text><Text accessibilityRole="header" style={[ui.pageTitle, ink]}>Sales Playbook<Text style={[ui.titleDot, { color: accent }]}>.</Text></Text></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Start sales training" onPress={() => router.push('/sales/training' as any)} style={({ pressed }) => [ui.trainingLink, { backgroundColor: card.backgroundColor, borderColor: border, opacity: pressed ? 0.75 : 1 }]}>
            <GraduationCap size={17} color={accent} />{!compact && <><Text style={[ui.smallBold, ink]}>Sales training</Text><ArrowUpRight size={15} color={muted.color} /></>}
          </Pressable>
        </View>

        <View style={[ui.hero, { padding: compact ? 24 : 36, backgroundColor: isDark ? '#252139' : '#EEEAFC', borderColor: isDark ? '#3B3358' : '#E4DEF7' }]}>
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[ui.heroOrbit, { borderColor: isDark ? '#3C3456' : '#DDD5F4' }]} />
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[ui.heroOrbitInner, { borderColor: isDark ? '#3C3456' : '#DDD5F4' }]} />
          <View style={ui.heroRow}>
            <View style={ui.heroCopy}>
              <View style={[ui.heroBadge, { backgroundColor: isDark ? '#382F50' : '#FFFFFFAA' }]}><Sparkles size={13} color={accent} /><Text style={[ui.heroBadgeText, { color: accent }]}>THE REGIONAL FIELD EDITION</Text></View>
              <Text accessibilityRole="header" style={[ui.heroTitle, ink, { fontSize: compact ? 30 : wide ? 44 : 37, lineHeight: compact ? 37 : wide ? 53 : 46 }]}>Better conversations.{'\n'}<Text style={{ color: accent }}>Stronger school{wide ? ' ' : '\n'}partnerships.</Text></Text>
              <Text style={[ui.heroSubtitle, { color: isDark ? '#BDB5D3' : '#706B86' }]}>A little preparation. A deeper understanding. Your field guide to meaningful school partnerships in Telangana & Karnataka.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Prepare my next visit" onPress={() => switchTab('Visit planner')} style={({ pressed }) => [ui.heroButton, { opacity: pressed ? 0.85 : 1, transform: [{ translateY: pressed ? 1 : 0 }] }]}>
                <ClipboardList size={16} color="#FFFFFF" /><Text style={ui.heroButtonText}>Prepare my next visit</Text><ArrowRight size={17} color="#FFFFFF" />
              </Pressable>
            </View>
            {!compact && <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={ui.bookScene}>
              <View style={ui.bookShadow} />
              <View style={ui.bookBack} />
              <View style={ui.bookCover}>
                <View style={ui.bookSpine} />
                <View style={ui.bookBrand}><BookOpen size={15} color="#C6B9F5" /><Text style={ui.bookBrandText}>SCHOOLIMS</Text></View>
                <View style={ui.bookCoverRule} />
                <Text style={ui.bookEdition}>THE FIELD NOTES</Text>
                <Text style={ui.bookTitle}>School{'\n'}partnerships.</Text>
                <View style={ui.bookCoverArt}><View style={ui.bookArcOne} /><View style={ui.bookArcTwo} /><View style={ui.bookArcThree} /></View>
                <Text style={ui.bookRegion}>TELANGANA · KARNATAKA</Text>
              </View>
              <View style={[ui.floatingNote, { top: 7, right: 0, transform: [{ rotate: '4deg' }] }]}><View style={ui.noteIcon}><Brain size={15} color="#7D65BD" /></View><Text style={ui.floatingNoteText}>Understand people.</Text></View>
              <View style={[ui.floatingNote, { bottom: 14, left: 0, transform: [{ rotate: '-3deg' }] }]}><View style={[ui.noteIcon, { backgroundColor: '#E8F2EC' }]}><ShieldCheck size={15} color="#54836B" /></View><Text style={ui.floatingNoteText}>Lead with evidence.</Text></View>
            </View>}
          </View>
          <View style={[ui.heroFooter, { borderTopColor: isDark ? '#443B5D' : '#DBD4EF' }]}>
            {[{ icon: BookOpen, label: `${playbookChapters.length} practical chapters` }, { icon: Brain, label: `${psychologyPrinciples.length} psychology lenses` }, { icon: MessageSquare, label: `${fieldObjections.length} objection responses` }].map(({ icon: Icon, label }) => <View key={label} style={ui.heroMeta}><Icon size={14} color={accent} /><Text style={[ui.heroFooterText, { color: isDark ? '#C9C1DC' : '#736B89' }]}>{label}</Text></View>)}
          </View>
        </View>

        <View style={[ui.contextBar, card]}>
          <View style={ui.contextLabel}><View style={[ui.contextIcon, { backgroundColor: tint }]}><MapPin size={18} color={accent} /></View><View><Text style={[ui.eyebrow, { color: muted.color, marginBottom: 0 }]}>MAKE IT LOCAL</Text><Text style={[ui.smallBold, ink]}>Your school context</Text></View></View>
          <View style={[ui.regionSegment, { backgroundColor: pageBackground }]}>{(['Telangana', 'Karnataka'] as const).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityLabel={item} accessibilityState={{ selected: region === item }} aria-selected={region === item} onPress={() => setRegion(item)} style={[ui.regionOption, region === item && { backgroundColor: card.backgroundColor, borderColor: border }]}>{region === item && <View style={[ui.regionDot, { backgroundColor: accent }]} />}<Text style={[ui.smallBold, { color: region === item ? accent : muted.color }]}>{item}</Text></Pressable>)}</View>
          {!compact && <View style={ui.contextLanguage}><Text style={[ui.small, muted]}>{local.language} + the school’s preferred languages</Text><Text style={[ui.caption, { color: accent }]}>Built around the school. Never a stereotype.</Text></View>}
        </View>
        <ScrollView onLayout={(event) => { navigationTop.current = event.nativeEvent.layout.y; }} horizontal showsHorizontalScrollIndicator={false} style={[ui.tabShell, card]} contentContainerStyle={ui.tabBar}>
          {tabs.map(({ label, icon: Icon, detail }) => <Pressable key={label} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: tab === label }} aria-selected={tab === label} onPress={() => switchTab(label)}
            style={({ pressed }) => [ui.tab, { backgroundColor: tab === label ? tint : 'transparent', borderColor: tab === label ? (isDark ? '#4A3F6C' : '#E2DCF6') : 'transparent', opacity: pressed ? 0.75 : 1 }]}>
            <View style={[ui.tabIcon, { backgroundColor: tab === label ? (isDark ? '#4B3E7D' : '#6655C9') : pageBackground }]}><Icon size={18} color={tab === label ? '#FFFFFF' : muted.color} /></View>
            <View style={{ gap: 2 }}><View style={ui.brandRow}><Text style={[ui.tabText, { color: tab === label ? accent : ink.color }]}>{label}</Text>{label === 'Objection lab' && <Text style={[ui.tabCount, { backgroundColor: isDark ? '#393146' : '#EAE6F5', color: accent }]}>{fieldObjections.length}</Text>}</View>{!compact && <Text style={[ui.caption, muted]}>{detail}</Text>}</View>
          </Pressable>)}
        </ScrollView>
        {!!notice && <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[ui.notice, { backgroundColor: tint }]}>
          <Text style={[ui.small, { color: accent, flex: 1 }]}>{notice}</Text><Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={() => setNotice('')} hitSlop={10}><X size={16} color={accent} /></Pressable>
        </View>}

        {tab === 'Field guide' && <>
          <View style={[ui.sectionHeading, compact && { flexDirection: 'column', alignItems: 'flex-start' }]}><View style={{ flex: 1, gap: 4 }}><Text style={[ui.eyebrow, { color: accent }]}>THE CONVERSATION MAP</Text><Text style={[ui.sectionTitle, ink]}>A good conversation has a rhythm.</Text><Text style={[ui.small, muted]}>Choose a move to jump into the relevant chapter.</Text></View><View style={[ui.timePill, { backgroundColor: card.backgroundColor, borderColor: border }]}><Clock3 size={14} color={accent} /><Text style={[ui.smallBold, muted]}>30-minute meeting</Text></View></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.journey}>
            {journey.map((item, index) => { const Icon = item.icon; return <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={`Explore ${item.title}`} onPress={() => chooseChapter(item.chapter)}
              style={({ pressed }) => [ui.journeyCard, card, { opacity: pressed ? 0.8 : 1, transform: [{ translateY: pressed ? 2 : 0 }] }] }>
              <View style={ui.between}><View style={[ui.journeyIcon, { backgroundColor: isDark ? tint : item.background }]}><Icon size={20} color={isDark ? accent : item.color} /></View><Text style={[ui.stepNumber, { color: isDark ? '#8F91A8' : '#B9BCCC' }]}>0{index + 1}</Text></View>
              <View style={ui.between}><Text style={[ui.journeyTitle, ink]}>{item.title}</Text><ArrowUpRight size={14} color={muted.color} /></View><Text style={[ui.caption, muted]}>{item.caption}</Text>
            </Pressable>; })}
          </ScrollView>
          <View style={[ui.columns, !wide && { flexDirection: 'column' }]}>
            <View style={ui.mainColumn}>
              <View style={[ui.panel, card]}>
                <View style={ui.sectionHeading}><View style={{ flex: 1, gap: 4 }}><Text style={[ui.eyebrow, { color: accent }]}>LOCAL CONTEXT / {region.toUpperCase()}</Text><Text style={[ui.sectionTitle, ink]}>A familiar language. A warmer opening.</Text></View><View style={[ui.contextIcon, { backgroundColor: tint }]}><MapPin size={20} color={accent} /></View></View>
                <Text style={[ui.body, muted]}>{local.context}</Text>
                <View style={[ui.quoteBox, { backgroundColor: tint, borderLeftColor: accent }]}>
<View style={ui.between}><Text style={[ui.eyebrow, { color: accent }]}>YOUR OPENING LINE</Text><Quote size={18} color={accent} /></View>
                  <Text selectable style={[ui.localGreeting, { color: accent }]}>{local.greeting} <Text style={ui.small}>/ {local.transliteration}</Text></Text>
                  <Text selectable style={[ui.body, ink]}>{local.opener}</Text><Text style={[ui.small, muted]}>{local.translation}</Text>
                  {copyButton('Copy opening', `${local.greeting}. ${local.opener}\n${local.translation}`)}
                </View>
                {local.questions.map((question, index) => <View key={question} style={ui.promptRow}><Text style={[ui.promptNumber, { color: accent }]}>0{index + 1}</Text><Text style={[ui.small, muted, { flex: 1 }]}>{question}</Text></View>)}
                <Text style={[ui.caption, muted]}>Conversation examples, not product translations. Ask their language preference; have school-facing copy reviewed by a fluent local colleague.</Text>
              </View>
              <View style={[ui.panel, card]}>
                <View style={ui.sectionHeading}><View style={{ flex: 1, gap: 4 }}><Text style={[ui.eyebrow, { color: accent }]}>READ THE ROOM</Text><Text style={[ui.sectionTitle, ink]}>Same school. Different priorities.</Text></View><View style={[ui.contextIcon, { backgroundColor: tint }]}><Users size={20} color={accent} /></View></View>
                <View style={ui.filters}>{stakeholderGuides.map((item) => pill(item.label, stakeholderId === item.id, () => setStakeholderId(item.id)))}</View>
                <Text style={[ui.smallBold, { color: accent }]}>{stakeholder.priority}</Text>
                <View style={ui.promptRow}><Text style={[ui.talkLabel, { color: accent }]}>ASK</Text><Text selectable style={[ui.body, ink, { flex: 1 }]}>{stakeholder.ask}</Text></View>
                <View style={ui.promptRow}><Text style={[ui.talkLabel, { color: accent }]}>SHOW</Text><Text style={[ui.small, muted, { flex: 1 }]}>{stakeholder.show}</Text></View>
                <View style={ui.promptRow}><Text style={[ui.talkLabel, { color: accent }]}>AGREE</Text><Text style={[ui.small, muted, { flex: 1 }]}>{stakeholder.close}</Text></View>
              </View>
            </View>
            <View style={[ui.sideColumn, !wide && { width: '100%' }]}>
              {checklist}
              <View style={[ui.panel, { backgroundColor: tint, borderWidth: 0 }]}><ShieldCheck size={23} color={accent} /><Text style={[ui.sectionTitle, ink]}>Trust is the advantage.</Text><Text style={[ui.small, muted]}>Use a real reference with permission. Show the full annual investment. Make the school’s choice easy to evaluate.</Text><Text style={[ui.smallBold, { color: accent }]}>No invented urgency. No guaranteed outcomes.</Text></View>
            </View>
          </View>
          <View onLayout={(event) => {
            chapterTop.current = event.nativeEvent.layout.y;
            const id = pendingChapter.current;
            if (id && chapterOffsets.current[id] !== undefined) {
              pendingChapter.current = null;
              setJumpTarget({ y: chapterTop.current + chapterOffsets.current[id] + 24 });
            }
          }} style={ui.chapterLibrary}>
            <View style={ui.sectionHeading}><View><Text style={[ui.sectionTitle, ink]}>The complete field library</Text><Text style={[ui.small, muted]}>Open a chapter for talk tracks, discovery questions and proof points.</Text></View><Text style={[ui.counter, { color: accent, backgroundColor: tint }]}>{chapters.length} chapters</Text></View>
            <View style={[ui.search, card]}><Search size={18} color={muted.color} /><TextInput accessibilityLabel="Search sales playbook" placeholder="Search discovery, fees, objections, migration…" placeholderTextColor={muted.color} value={search} onChangeText={setSearch} style={[ui.searchInput, ink]} />{!!search && <Pressable accessibilityRole="button" accessibilityLabel="Clear chapter search" onPress={() => setSearch('')} hitSlop={10}><X size={17} color={muted.color} /></Pressable>}</View>
            <View style={ui.filters}>{['All', 'Every school', 'Existing ERP'].map((filter) => pill(filter, audience === filter, () => setAudience(filter)))}</View>
            {chapters.map((item) => {
              const open = selected === item.id;
              const index = playbookChapters.findIndex((entry) => entry.id === item.id);
              return <View key={item.id} onLayout={(event) => {
                chapterOffsets.current[item.id] = event.nativeEvent.layout.y;
                if (pendingChapter.current === item.id && chapterTop.current > 0) {
                  pendingChapter.current = null;
                  setJumpTarget({ y: chapterTop.current + event.nativeEvent.layout.y + 24 });
                }
              }} style={[ui.chapter, card, open && { borderColor: accent }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setSelected(open ? null : item.id)} style={ui.chapterHeader}>
                  <View style={[ui.number, { backgroundColor: tint }]}><Text style={[ui.smallBold, { color: accent }]}>{String(index + 1).padStart(2, '0')}</Text></View>
                  <View style={{ flex: 1, gap: 4 }}><Text style={[ui.sectionTitle, ink, { fontSize: 16 }]}>{item.title}</Text><Text style={[ui.small, muted]}>{item.summary}</Text><View style={[ui.filters, { alignItems: 'center' }]}><Text style={[ui.chapterTag, { color: accent, backgroundColor: tint }]}>{item.audience}</Text><Text style={[ui.caption, muted]}>{Math.max(1, Math.ceil(item.sections.reduce((words, section) => words + `${section.body} ${(section.prompts || []).join(' ')}`.split(/\s+/).length, 0) / 180))} min read</Text></View></View>
                  <View style={[ui.expandIcon, { backgroundColor: open ? tint : pageBackground }]}>{open ? <ChevronDown size={17} color={accent} /> : <ChevronRight size={17} color={muted.color} />}</View>
                </Pressable>
                {open && <View style={[ui.chapterBody, { borderColor: border }]}>
                  {item.sections.map((section) => <View key={section.title} style={{ gap: 8 }}><Text style={[ui.smallBold, ink]}>{section.title}</Text><Text selectable style={[ui.body, muted]}>{section.body}</Text>{section.prompts?.map((prompt) => <View style={ui.promptRow} key={prompt}><Text style={{ color: accent }}>•</Text><Text selectable style={[ui.body, muted, { flex: 1 }]}>{prompt}</Text></View>)}</View>)}
                  <Text style={[ui.source, muted]}>Reference: {item.source}</Text>
                </View>}
              </View>;
            })}
            {!chapters.length && <View style={[ui.panel, card]}><Search size={24} color={accent} /><Text style={[ui.sectionTitle, ink]}>No chapters match</Text><Text style={[ui.body, muted]}>Try another topic or reset your filters.</Text><Pressable accessibilityRole="button" accessibilityLabel="Reset chapter filters" onPress={() => { setSearch(''); setAudience('All'); }}><Text style={[ui.smallBold, { color: accent }]}>Reset filters →</Text></Pressable></View>}
          </View>
        </>}

        {tab === 'Buyer psychology' && <>
          <View style={ui.sectionHeading}><View style={{ flex: 1 }}><Text style={[ui.sectionTitle, ink]}>Understand the decision behind the decision.</Text><Text style={[ui.body, muted]}>Four research-informed lenses. Practical language for your next school meeting.</Text></View><Brain size={25} color={accent} /></View>
          <View style={[ui.columns, !wide && { flexDirection: 'column' }]}>
            {choiceRail(psychologyPrinciples.map((item, index) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{ selected: principleId === item.id }} aria-selected={principleId === item.id} onPress={() => setPrincipleId(item.id)} style={[ui.principleCard, card, !wide && { width: 250 }, principleId === item.id && { borderColor: accent, backgroundColor: tint }]}><Text style={[ui.caption, { color: accent }]}>0{index + 1} / {item.stage.toUpperCase()}</Text><Text style={[ui.smallBold, ink]}>{item.title}</Text><Text style={[ui.small, muted]}>{item.concept}</Text></Pressable>))}
            <View style={[ui.panel, card, { flex: 1 }]}>
              <Text style={[ui.eyebrow, { color: accent }]}>{principle.stage.toUpperCase()}</Text><Text style={[ui.title, ink, { fontSize: 28 }]}>{principle.title}</Text><Text style={[ui.smallBold, { color: accent }]}>{principle.concept}</Text><Text style={[ui.body, muted]}>{principle.explanation}</Text>
              <Text style={[ui.smallBold, ink]}>Listen for this</Text><Text style={[ui.body, muted]}>{principle.signal}</Text>
              <View style={[ui.quoteBox, { backgroundColor: tint, borderLeftColor: accent }]}><Text style={[ui.eyebrow, { color: accent }]}>TRY SAYING</Text><Text selectable style={[ui.quoteText, ink]}>{principle.say}</Text>{copyButton('Copy talk track', principle.say)}</View>
              <Text style={[ui.smallBold, ink]}>Put it into practice</Text><Text style={[ui.body, muted]}>{principle.action}</Text>
              <View style={[ui.practiceNote, { borderColor: border }]}><ShieldCheck size={18} color={accent} /><View style={{ flex: 1, gap: 4 }}><Text style={[ui.smallBold, ink]}>Keep it respectful</Text><Text style={[ui.small, muted]}>{principle.avoid}</Text></View></View>
              <Pressable accessibilityRole="link" accessibilityLabel={`Read research: ${principle.concept}`} onPress={() => openSource(researchSources.find((source) => source.id === principle.source)!.url)} style={ui.trainingLink}><Text style={[ui.smallBold, { color: accent }]}>Read the original research</Text><ArrowUpRight size={15} color={accent} /></Pressable>
            </View>
          </View>
          <Text style={[ui.small, muted]}>These are general psychology concepts, adapted here as sales coaching. They are not validated predictions about Telangana or Karnataka school leaders, and they do not guarantee a sale.</Text>
        </>}

        {tab === 'Objection lab' && <>
          <View style={ui.sectionHeading}><View style={{ flex: 1 }}><Text style={[ui.sectionTitle, ink]}>A concern is a question worth understanding.</Text><Text style={[ui.body, muted]}>Acknowledge → Ask → Prove → Advance. Rehearse the response; keep the conversation natural.</Text></View><MessageSquare size={24} color={accent} /></View>
          <View style={[ui.columns, !wide && { flexDirection: 'column' }]}>
            {choiceRail(fieldObjections.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{ selected: objection.id === item.id }} aria-selected={objection.id === item.id} onPress={() => setObjectionId(item.id)} style={[ui.principleCard, card, !wide && { width: 250 }, objection.id === item.id && { borderColor: accent, backgroundColor: tint }]}><Text style={[ui.smallBold, ink]}>{item.title}</Text><Text style={[ui.caption, muted]}>{item.tag}</Text></Pressable>))}
            <View style={[ui.panel, card, { flex: 1 }]}>
              <Text style={[ui.eyebrow, { color: accent }]}>{objection.tag.toUpperCase()}</Text><Text style={[ui.title, ink, { fontSize: 27 }]}>{objection.title}</Text>
              {([['01', 'Acknowledge', objection.acknowledge], ['02', 'Ask', objection.ask], ['03', 'Prove', objection.prove], ['04', 'Advance', objection.advance]]).map(([number, label, value]) => <View key={label} style={ui.objectionStep}><View style={[ui.number, { backgroundColor: tint }]}><Text style={[ui.smallBold, { color: accent }]}>{number}</Text></View><View style={{ flex: 1, gap: 7 }}><Text style={[ui.smallBold, ink]}>{label}</Text><Text selectable style={[ui.body, muted]}>{value}</Text></View></View>)}
              <View style={[ui.quoteBox, { backgroundColor: tint, borderLeftColor: accent }]}><Text style={[ui.smallBold, { color: accent }]}>{region} proof prompt</Text><Text style={[ui.small, muted]}>{local.proof}</Text></View>
              <View style={ui.filters}>{copyButton('Copy response', `${objection.title}\n\nAcknowledge: ${objection.acknowledge}\nAsk: ${objection.ask}\nProve: ${objection.prove}\nAdvance: ${objection.advance}\n\n${region}: ${local.proof}`)}<Pressable accessibilityRole="button" accessibilityLabel="Explore the psychology" onPress={() => { setPrincipleId(objection.principle); switchTab('Buyer psychology'); }} style={ui.copyButton}><Brain size={15} color={accent} /><Text style={[ui.smallBold, { color: accent }]}>Explore the psychology</Text></Pressable></View>
            </View>
          </View>
        </>}

        {tab === 'Visit planner' && <>
          <View style={ui.sectionHeading}><View style={{ flex: 1 }}><Text style={[ui.sectionTitle, ink]}>Walk in with a plan. Leave with a next step.</Text><Text style={[ui.body, muted]}>Build a 30-minute agenda and a follow-up draft for a {region} school.</Text></View><Target size={25} color={accent} /></View>
          <View style={[ui.columns, !wide && { flexDirection: 'column' }]}>
            <View style={[ui.panel, card, { flex: 1 }]}>
              <Text style={[ui.sectionTitle, ink]}>Make it specific</Text><Text style={[ui.caption, muted]}>Working draft for this visit. Copy it before leaving; entries are not saved.</Text>
              {field('School name', school, setSchool, 'e.g. your next school visit')}
              <Text style={[ui.smallBold, ink]}>Who are you meeting?</Text><View style={ui.filters}>{stakeholderGuides.map((item) => pill(item.label, stakeholderId === item.id, () => setStakeholderId(item.id)))}</View>
              <Text style={[ui.smallBold, ink]}>Conversation type</Text><View style={ui.filters}>{meetingStages.map((item) => pill(item, stage === item, () => setStage(item)))}</View>
              <Text style={[ui.smallBold, ink]}>Priority workflow</Text><View style={ui.filters}>{meetingPriorities.map((item) => pill(item, priority === item, () => setPriority(item)))}</View>
              {field('Baseline / success measure', baseline, setBaseline, 'e.g. measure weekly time spent reconciling the sample ledger', true)}
              {field('Action owner', owner, setOwner, 'Name and role agreed with the school')}
              {field('Review date / time', reviewDate, setReviewDate, 'Agreed date, time and meeting channel')}
              <Pressable accessibilityRole="button" accessibilityLabel="Copy visit plan and follow-up" onPress={() => copy(plan, 'Visit plan and follow-up')} style={ui.primary}><Copy size={16} color="#FFFFFF" /><Text style={ui.primaryText}>Copy visit plan & follow-up</Text></Pressable>
            </View>
            <View style={[ui.panel, card, { flex: 1 }]}><View style={[ui.planHeader, { borderBottomColor: border }]}><Text style={[ui.eyebrow, { color: accent }]}>LIVE PLAN PREVIEW</Text><Text style={[ui.counter, { color: accent, backgroundColor: tint }]}>30 MIN</Text></View><Text selectable style={[ui.planText, ink]}>{plan}</Text></View>
          </View>
        </>}

        <View style={[ui.footer, { borderTopColor: border }]}>
          <View style={ui.contextLabel}><BookOpen size={16} color={accent} /><Text style={[ui.smallBold, ink]}>Built for the field. Grounded in evidence.</Text></View>
          <Text style={[ui.caption, muted]}>Internal Nexsyrus enablement · Based on SchoolIMS Sales Playbook v1.0 and Incumbent ERP Battlebook v2.4. Historical pricing and performance examples are not approved offers. Confirm current capabilities, language support, pricing and implementation scope before a commitment.</Text>
          <View style={ui.filters}>{researchSources.map((source) => <Pressable key={source.id} accessibilityRole="link" onPress={() => openSource(source.url)}><Text style={[ui.source, { color: accent }]}>{source.label} ↗</Text></Pressable>)}</View>
        </View>
      </View>
    </ScrollView>
  );
}

// Shared typography and card primitives are also used by SalesTrainingScreen.
export const styles = StyleSheet.create({
  page: { padding: 28, paddingBottom: 100, gap: 18, flexGrow: 1 },
  eyebrow: { color: '#3186D8', fontWeight: '800', fontSize: 10, letterSpacing: 1.4, marginBottom: 5, lineHeight: 17 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 23, marginTop: 8 },
  chapter: { borderWidth: 1, borderRadius: 14, padding: 20, gap: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '700', lineHeight: 27, letterSpacing: -0.3 },
  body: { fontSize: 14, lineHeight: 24 },
  primary: { backgroundColor: '#216254', borderRadius: 10, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filter: { paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderRadius: 8 },
});

// The playbook has its own visual treatment; training keeps the shared primitives above.
const ui = StyleSheet.create({
  ...styles,
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  contextLabel: { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 1 },
  field: { gap: 7 },
  heroMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 1 },
  notice: { borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pillText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  planText: { fontSize: 13, lineHeight: 23 },
  quoteText: { fontSize: 20, lineHeight: 31, letterSpacing: -0.3 },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  searchInput: { paddingVertical: 15, flex: 1, fontSize: 13, minWidth: 0 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  smallBold: { fontSize: 13, fontWeight: '700', lineHeight: 21 },
  source: { fontSize: 11, lineHeight: 19, marginTop: 3 },
  playbookPage: { padding: 24, flexGrow: 1, alignItems: 'center' },
  workspace: { width: '100%', maxWidth: 1360, gap: 24, paddingBottom: 80 },
  pageTitle: { fontSize: 28, lineHeight: 35, fontWeight: '700', letterSpacing: -1 },
  titleDot: { fontWeight: '800' },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, paddingBottom: 2 },
  brandIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  trainingLink: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 11, paddingHorizontal: 15, borderWidth: 1, borderRadius: 11, alignSelf: 'flex-start', flexShrink: 1 },
  eyebrow: { fontWeight: '700', fontSize: 10, letterSpacing: 1.7, marginBottom: 2, lineHeight: 17 },
  hero: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', gap: 26 },
  heroOrbit: { position: 'absolute', width: 540, height: 540, borderWidth: 1, borderRadius: 270, right: -90, top: -85 },
  heroOrbitInner: { position: 'absolute', width: 380, height: 380, borderWidth: 1, borderRadius: 190, right: -10, top: -5 },
  heroRow: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  heroCopy: { flex: 1, gap: 19 },
  heroBadge: { flexDirection: 'row', gap: 7, alignItems: 'center', alignSelf: 'flex-start', borderRadius: 30, paddingVertical: 7, paddingHorizontal: 11 },
  heroBadgeText: { fontSize: 9, letterSpacing: 1.4, fontWeight: '700' },
  heroTitle: { fontWeight: '700', letterSpacing: -1.8 },
  heroSubtitle: { fontSize: 14, lineHeight: 24, maxWidth: 450 },
  heroButton: { backgroundColor: '#6655C9', flexDirection: 'row', gap: 10, alignItems: 'center', alignSelf: 'flex-start', borderRadius: 11, paddingHorizontal: 17, paddingVertical: 14, shadowColor: '#6655C9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 2 },
  heroButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  heroFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 22, borderTopWidth: 1, paddingTop: 20 },
  heroFooterText: { fontSize: 11, fontWeight: '500', lineHeight: 18 },
  bookScene: { width: 290, height: 290, marginHorizontal: 4 },
  bookShadow: { position: 'absolute', bottom: 7, left: 45, width: 200, height: 22, borderRadius: 100, backgroundColor: '#51416C', opacity: 0.1, transform: [{ rotate: '-5deg' }] },
  bookBack: { position: 'absolute', top: 28, left: 76, width: 174, height: 239, borderRadius: 12, backgroundColor: '#B9A9E7', borderWidth: 1, borderColor: '#AE9FDB', transform: [{ rotate: '10deg' }] },
  bookCover: { position: 'absolute', top: 12, left: 48, width: 181, height: 247, borderRadius: 12, backgroundColor: '#2B2847', borderWidth: 1, borderColor: '#4B456A', padding: 21, gap: 10, transform: [{ rotate: '-8deg' }], shadowColor: '#302741', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.24, shadowRadius: 18, elevation: 5, overflow: 'hidden' },
  bookSpine: { position: 'absolute', left: 8, top: 0, bottom: 0, width: 1, backgroundColor: '#5A5279' },
  bookBrand: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  bookBrandText: { color: '#D9D0F1', fontSize: 8, letterSpacing: 1.7, fontWeight: '700' },
  bookCoverRule: { height: 1, backgroundColor: '#4F486A', marginTop: 3, marginBottom: 3 },
  bookEdition: { color: '#AA9CCB', fontSize: 7, fontWeight: '600', letterSpacing: 1.5 },
  bookTitle: { color: '#F8F4FF', fontSize: 24, lineHeight: 30, fontWeight: '600', letterSpacing: -0.8 },
  bookRegion: { color: '#C1B5D6', fontSize: 6, fontWeight: '600', letterSpacing: 1.2, marginTop: 5 },
  bookCoverArt: { height: 49, overflow: 'hidden', marginTop: 3 },
  bookArcOne: { position: 'absolute', width: 130, height: 130, top: 0, left: 0, borderRadius: 65, borderWidth: 1, borderColor: '#9B89C2' },
  bookArcTwo: { position: 'absolute', width: 96, height: 96, top: 15, left: 17, borderRadius: 48, borderWidth: 1, borderColor: '#9B89C2' },
  bookArcThree: { position: 'absolute', width: 62, height: 62, top: 30, left: 34, borderRadius: 31, borderWidth: 1, borderColor: '#9B89C2' },
  floatingNote: { position: 'absolute', flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, paddingRight: 13, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EFEDF5', shadowColor: '#51426F', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 13, elevation: 3 },
  floatingNoteText: { fontSize: 10, fontWeight: '600', color: '#504861' },
  noteIcon: { backgroundColor: '#F0EAF9', width: 27, height: 27, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  contextBar: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'center' },
  contextIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contextLanguage: { flex: 1, minWidth: 200, gap: 3 },
  regionSegment: { padding: 4, borderRadius: 11, flexDirection: 'row', gap: 3 },
  regionOption: { borderWidth: 1, borderColor: 'transparent', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 15 },
  regionDot: { width: 5, height: 5, borderRadius: 3 },
  tabShell: { flexGrow: 0, borderRadius: 16, borderWidth: 1 },
  tabBar: { flexDirection: 'row', gap: 5, padding: 7, flexGrow: 1 },
  tab: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 13, paddingVertical: 12, borderRadius: 11, borderWidth: 1, minWidth: 175 },
  tabIcon: { width: 35, height: 35, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabCount: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, fontSize: 10, fontWeight: '700', overflow: 'hidden' },
  sectionTitle: { fontSize: 21, fontWeight: '700', lineHeight: 30, letterSpacing: -0.6 },
  journey: { flexDirection: 'row', gap: 12, paddingBottom: 6, flexGrow: 1 },
  journeyCard: { borderWidth: 1, borderRadius: 16, padding: 18, minWidth: 158, flex: 1, gap: 8 },
  journeyIcon: { width: 41, height: 41, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  journeyTitle: { fontSize: 15, fontWeight: '700', lineHeight: 23, letterSpacing: -0.2 },
  stepNumber: { fontSize: 20, lineHeight: 30, fontWeight: '500', alignSelf: 'flex-start' },
  timePill: { borderRadius: 30, borderWidth: 1, paddingVertical: 7, paddingHorizontal: 12, flexDirection: 'row', gap: 7, alignItems: 'center' },
  columns: { flexDirection: 'row', alignItems: 'stretch', gap: 22 },
  mainColumn: { flex: 1, minWidth: 0, gap: 22 },
  sideColumn: { width: 286, gap: 22 },
  panel: { borderWidth: 1, borderRadius: 20, padding: 25, gap: 16, shadowColor: '#2C3152', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.025, shadowRadius: 15, elevation: 1 },
  quoteBox: { padding: 20, borderRadius: 13, borderLeftWidth: 0, gap: 12 },
  localGreeting: { fontSize: 26, fontWeight: '700', lineHeight: 38 },
  promptNumber: { fontSize: 11, fontWeight: '700', lineHeight: 23, width: 23 },
  promptRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 3 },
  talkLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, width: 44, lineHeight: 24 },
  small: { fontSize: 13, lineHeight: 22 },
  body: { fontSize: 14, lineHeight: 25 },
  caption: { fontSize: 11, lineHeight: 19 },
  counter: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, fontSize: 11, fontWeight: '600', overflow: 'hidden' },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 2 },
  progressFill: { height: 5, borderRadius: 3 },
  checkRow: { flexDirection: 'row', gap: 11, paddingVertical: 5, alignItems: 'flex-start' },
  checkbox: { width: 21, height: 21, borderWidth: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  inlineLink: { borderTopWidth: 1, paddingTop: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  filter: { paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderRadius: 9 },
  copyButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 11, borderWidth: 1, borderColor: 'transparent', borderRadius: 9, alignSelf: 'flex-start', flexShrink: 1 },
  chapterLibrary: { gap: 14, paddingTop: 10 },
  chapter: { borderWidth: 1, borderRadius: 16, padding: 21, gap: 14 },
  chapterHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 15 },
  chapterTag: { fontSize: 10, lineHeight: 17, fontWeight: '600', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, overflow: 'hidden', marginTop: 3 },
  expandIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  number: { width: 39, height: 39, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  chapterBody: { borderTopWidth: 1, paddingTop: 24, gap: 26 },
  principleCard: { borderWidth: 1, borderRadius: 15, padding: 20, gap: 9 },
  practiceNote: { borderWidth: 1, padding: 18, borderRadius: 13, flexDirection: 'row', gap: 12 },
  objectionStep: { flexDirection: 'row', gap: 15, paddingVertical: 10 },
  input: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 13, fontSize: 13, lineHeight: 22 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingBottom: 17, borderBottomWidth: 1 },
  primary: { backgroundColor: '#6655C9', borderRadius: 11, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  footer: { borderTopWidth: 1, paddingTop: 25, gap: 14, marginTop: 12 },
});
