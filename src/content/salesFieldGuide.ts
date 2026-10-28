/** Field recommendations are hypotheses to validate with each school, not state-wide buyer traits.
 * Research explains general concepts; these school-sales applications have not been experimentally validated. */
export type SchoolRegion = 'Telangana' | 'Karnataka';
export const regionalGuides = {
  Telangana: {
    language: 'Telugu', greeting: 'నమస్కారం', transliteration: 'Namaskaram',
    opener: 'మీ పాఠశాలలో రోజూ ఎక్కువ సమయం తీసుకునే పరిపాలనా పని ఏది?',
    translation: 'Which administrative task takes the most time each day at your school?',
    context: 'From Hyderabad to district and rural schools, start with the school’s actual workflows, parent languages and staff readiness.',
    questions: [
      'Ask whether the school follows the Telangana state board, CBSE, CISCE or another curriculum. Match the demo to its actual reporting needs.',
      'Ask whether parents prefer Telugu, English, Urdu or another language. Check device access and how families without the app receive notices.',
      'Confirm the fee instalment calendar, admissions workload and exam periods before suggesting a pilot date.',
    ],
    proof: 'Use an approved sample fee reminder in the school’s preferred language. Ask an accounts user and a parent representative to explain the next step in their own words.',
    followUp: 'నమస్కారం. మీ పాఠశాల పనితీరు గురించి చర్చించడానికి సమయం ఇచ్చినందుకు ధన్యవాదాలు.',
  },
  Karnataka: {
    language: 'Kannada', greeting: 'ನಮಸ್ಕಾರ', transliteration: 'Namaskara',
    opener: 'ನಿಮ್ಮ ಶಾಲೆಯಲ್ಲಿ ಪ್ರತಿದಿನ ಹೆಚ್ಚು ಸಮಯ ತೆಗೆದುಕೊಳ್ಳುವ ಆಡಳಿತದ ಕೆಲಸ ಯಾವುದು?',
    translation: 'Which administrative task takes the most time each day at your school?',
    context: 'From Bengaluru to district and rural schools, validate the curriculum, language mix and digital access before choosing your demonstration.',
    questions: [
      'Ask whether the school follows the Karnataka state board, CBSE, CISCE or another curriculum. Validate report-card formats rather than assuming compatibility.',
      'Ask whether parents prefer Kannada, English or another language. For multilingual communities, test comprehension with representative users.',
      'Confirm local decision makers, school-group approvals and the term calendar. Schedule training around the school’s available staff time.',
    ],
    proof: 'Ask for an approved Kannada notice sample and test the required workflow with staff. Log any unavailable language or voice capability as a requirement before offering it.',
    followUp: 'ನಮಸ್ಕಾರ. ನಿಮ್ಮ ಶಾಲೆಯ ಕಾರ್ಯವಿಧಾನದ ಬಗ್ಗೆ ಚರ್ಚಿಸಲು ಸಮಯ ನೀಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು.',
  },
} as const;

export const stakeholderGuides = [
  { id: 'owner', label: 'Correspondent / owner', priority: 'Visibility, trust & a sustainable investment',
    ask: 'When you are away from campus, which updates still need a phone call?',
    show: 'Demonstrate one management question from source entry to the dashboard. Agree on the annual cost, rollout owner and evidence required for approval.',
    close: 'Who approves the investment, and who should join a workflow review before that decision?' },
  { id: 'principal', label: 'Principal', priority: 'School routines & teacher adoption',
    ask: 'Which daily handoff between teachers, the office and parents needs your intervention?',
    show: 'Let a teacher complete one attendance task with demo records, then have the principal inspect the resulting update. Include correction and exception handling.',
    close: 'Which teacher and office colleague could test this routine with us?' },
  { id: 'accounts', label: 'Accounts team', priority: 'Reconciliation & respectful fee follow-up',
    ask: 'How do you reconcile payments, concessions and overdue accounts today?',
    show: 'Trace a sample account through the ledger, an approved reminder and receipt. Verify concessions, refunds and exceptions against the actual configuration.',
    close: 'What reconciliation check would make a small trial useful to your team?' },
  { id: 'teacher', label: 'Teacher champion', priority: 'Less repeated work & confidence',
    ask: 'Where do you enter the same information twice, and what happens when you need to correct it?',
    show: 'Invite the teacher to try the task, observe without taking over, and ask what remains confusing. Plan practice and support in their preferred language.',
    close: 'Would you help define a short practice session and what successful adoption looks like?' },
] as const;

export const psychologyPrinciples = [
  { id: 'autonomy', title: 'Give the school control', concept: 'Autonomy · self-determination theory', stage: 'Opening',
    explanation: 'Support for autonomy, competence and connection can help motivation. Apply this by giving people a meaningful choice in the evaluation.',
    signal: 'The principal is guarded or feels pushed into a demo.',
    say: '“Would it be more useful to look at fee follow-ups or parent communication first? We can also pause if neither is a priority.”',
    action: 'Ask permission, let the school choose one problem, and invite the staff member who does the work.',
    avoid: 'A forced choice between two purchase options, or treating politeness as agreement.', source: 'sdt' },
  { id: 'status-quo', title: 'Make change feel manageable', concept: 'Status quo bias', stage: 'Existing ERP',
    explanation: 'People can favour an existing arrangement. Switching also has real costs; find out which concerns are justified instead of labelling resistance irrational.',
    signal: '“We already have software. Migration will disrupt the school.”',
    say: '“Your team has invested time in the current system. What would a new workflow need to prove before a change is worth considering?”',
    action: 'Agree on a limited comparison, data validation, training needs and a rollback plan with implementation.',
    avoid: 'Insulting the incumbent, ignoring sunk effort or promising an overnight migration.', source: 'status-quo' },
  { id: 'loss-aversion', title: 'Make the cost of friction visible', concept: 'Loss aversion · prospect theory', stage: 'Value discussion',
    explanation: 'Prospect theory describes decisions relative to a reference point and sensitivity to losses. Use this as a prompt to examine actual friction, not to manufacture fear.',
    signal: 'The school sees only the new invoice and has not measured existing manual work.',
    say: '“You mentioned repeated reconciliation each week. Can we measure that time and compare it with the full cost and effort of a change?”',
    action: 'Capture a baseline and show both benefits and switching costs. Treat released staff time as capacity, not guaranteed cash savings.',
    avoid: 'Threats about lost admissions, inflated revenue claims or invented deadlines.', source: 'prospect' },
  { id: 'specific-plan', title: 'Turn interest into a clear plan', concept: 'Implementation intentions', stage: 'Next step',
    explanation: 'Research on if–then plans explores how specifying a situation and an action can help people act on intentions. A school review can use the same planning structure.',
    signal: '“This looks good. Contact us later.”',
    say: '“If the accounts team validates the sample ledger on Tuesday, shall we review the result with you on Thursday at a time you choose?”',
    action: 'Agree on the condition, named owner, action, date and review criterion. Confirm permission for follow-up.',
    avoid: 'Booking a meeting without consent or treating a pilot as a purchase commitment.', source: 'plans' },
] as const;

export const fieldObjections = [
  { id: 'erp', title: '“We already have an ERP.”', tag: 'Switching risk', principle: 'status-quo',
    acknowledge: 'That investment matters. Replacement should have a clear reason.',
    ask: 'Which tasks still happen outside the ERP, and when does the licence renew?',
    prove: 'Compare one school-selected workflow with its current steps, handoffs and exceptions.',
    advance: 'Invite the current system owner to define three success measures for a controlled comparison.' },
  { id: 'price', title: '“Your price is too high.”', tag: 'Value & budget', principle: 'loss-aversion',
    acknowledge: 'The full annual investment needs to make sense for the school.',
    ask: 'Is the concern budget availability, payment timing, or whether the benefit justifies the cost?',
    prove: 'Use approved pricing, the school’s actual student count, implementation costs and measured workload. Separate capacity from cash savings.',
    advance: 'Agree on the evidence the approver needs. Discuss scope and payment terms only within the approved offer.' },
  { id: 'parents', title: '“Our parents will not use an app.”', tag: 'Language & access', principle: 'autonomy',
    acknowledge: 'Parent access and confidence need to be tested, not assumed.',
    ask: 'Which languages, devices and communication channels do families actually use? Who would need an alternative?',
    prove: 'Test one notice with representative parents in their preferred language. Verify language, voice, delivery and fallback capabilities in the configured product.',
    advance: 'Agree on a small parent onboarding test, an office contact and a way to support families who cannot use the app.' },
  { id: 'teachers', title: '“Teachers are already overloaded.”', tag: 'Adoption', principle: 'autonomy',
    acknowledge: 'A new tool should earn teachers’ time.',
    ask: 'Which entry is repeated today, and what would teachers need to feel confident doing it once?',
    prove: 'Have a teacher try the real task with demo records, count the steps and record where help is needed.',
    advance: 'Let a teacher champion choose a short training slot and define the support needed for a trial.' },
  { id: 'whatsapp', title: '“WhatsApp works for us.”', tag: 'Workflow fit', principle: 'status-quo',
    acknowledge: 'It is a familiar communication channel for your community.',
    ask: 'How do you connect a notice to the right student record and verify the resulting action?',
    prove: 'Follow one approved message from the school office to the parent and back to the relevant record. Show what is actually tracked.',
    advance: 'Compare the specific handoff that causes repeated calls; keep familiar channels where the school still needs them.' },
  { id: 'later', title: '“Come back next academic year.”', tag: 'Timing', principle: 'specific-plan',
    acknowledge: 'A busy term may be the wrong moment for a rollout.',
    ask: 'What date or event would make an evaluation practical, and who should be involved?',
    prove: 'Separate a short workflow review from a launch. Map preparation to the school’s actual admissions, fee and exam calendar.',
    advance: 'Ask permission for one follow-up tied to their chosen event. Accept a request to stop contacting them.' },
  { id: 'proof', title: '“Which nearby schools use it?”', tag: 'Trust & evidence', principle: 'autonomy',
    acknowledge: 'It is reasonable to want relevant evidence before deciding.',
    ask: 'Would a reference with a similar curriculum, size, language need or workflow be most useful?',
    prove: 'Offer only verified customer examples with permission. If none are available, say so and demonstrate the workflow instead.',
    advance: 'Arrange a reference conversation only with both parties’ consent, or agree on a measurable trial.' },
  { id: 'discount', title: '“Give us a discount first.”', tag: 'Commercial terms', principle: 'loss-aversion',
    acknowledge: 'The commercial terms should be clear and fair.',
    ask: 'If we establish the right scope, what approval or budget constraint still needs solving?',
    prove: 'Present the approved annual quote, inclusions, exclusions, taxes and support terms. Do not invent an anchor price.',
    advance: 'Escalate a documented commercial request through the pricing process after confirming fit.' },
] as const;

export const researchSources = [
  { id: 'sdt', label: 'Ryan & Deci · Self-determination theory', url: 'https://selfdeterminationtheory.org/theory/' },
  { id: 'status-quo', label: 'Samuelson & Zeckhauser (1988) · Status quo bias', url: 'https://doi.org/10.1007/BF00055564' },
  { id: 'prospect', label: 'Kahneman & Tversky (1979) · Prospect theory', url: 'https://web.mit.edu/curhan/www/docs/Articles/15341_Readings/Behavioral_Decision_Theory/Kahneman_Tversky_1979_Prospect_theory.pdf' },
  { id: 'plans', label: 'Gollwitzer (1999) · Implementation intentions', url: 'https://www.socmot.uni-konstanz.de/sites/default/files/99_Gollwitzer_Implementation_Intentions.pdf' },
] as const;

export const visitChecklist = [
  'Confirm curriculum, student strength, current tools and renewal date.',
  'Identify the approver, daily user and implementation contact.',
  'Ask about parent languages, device access and alternative channels.',
  'Verify demo records, language support and approved commercial terms.',
  'Leave with one agreed action, an owner and a review date.',
] as const;

export const meetingPriorities = ['Fee follow-ups', 'Attendance', 'Parent communication', 'Management visibility'] as const;
export const meetingStages = ['First conversation', 'Existing ERP review'] as const;
export interface VisitPlan {
  school: string; region: SchoolRegion; stakeholderId: string; priority: string;
  stage: string; baseline: string; owner: string; reviewDate: string;
}
export function buildVisitPlan(plan: VisitPlan): string {
  const region = regionalGuides[plan.region];
  const stakeholder = stakeholderGuides.find((item) => item.id === plan.stakeholderId) || stakeholderGuides[0];
  return [
    `SCHOOLIMS · SCHOOL VISIT PLAN`,
    `School: ${plan.school.trim() || '[School name]'}`,
    `Region: ${plan.region} · Conversation with: ${stakeholder.label}`,
    `Meeting: ${plan.stage} · Priority: ${plan.priority}`,
    '', '0–3 MIN · CONNECT',
    `${region.greeting} (${region.transliteration}). Ask their preferred meeting language.`,
    stakeholder.ask,
    '', '3–12 MIN · DISCOVER',
    `Map the current ${plan.priority.toLowerCase()} workflow: people, steps, weekly time and exceptions.`,
    `Baseline / success measure: ${plan.baseline.trim() || '[Agree with the school before the trial]'}`,
    '', '12–25 MIN · PROVE',
    plan.stage === 'Existing ERP review'
      ? 'Respect the existing investment. Compare a school-selected workflow side by side; agree on the other two workflows before expanding the trial.'
      : stakeholder.show,
    `Regional check: ${region.proof}`,
    '', '25–30 MIN · AGREE',
    stakeholder.close,
    `Action owner: ${plan.owner.trim() || '[Confirm with the school]'}`,
    `Review date / time: ${plan.reviewDate.trim() || '[Agree a date and time]'}`,
    'Record scope, support, data-validation needs and unresolved requirements. Verify feasibility with implementation.',
    '', 'FOLLOW-UP DRAFT · PERSONALIZE BEFORE SENDING',
    region.followUp,
    `Thank you for discussing ${plan.priority.toLowerCase()} at ${plan.school.trim() || '[School name]'}.`,
    `Our proposed next step is a review of the agreed workflow with ${plan.owner.trim() || '[owner]'} on ${plan.reviewDate.trim() || '[date / time]'}.`,
    'Success measure: ' + (plan.baseline.trim() || '[insert agreed measure]') + '.',
    'Please confirm whether this reflects your priorities and whether this is a convenient follow-up channel.',
  ].join('\n');
}
