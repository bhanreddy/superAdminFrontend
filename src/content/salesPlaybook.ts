/** Adapted from the two supplied internal PDFs. Source claims are reference examples,
 * not a live product catalog, approved price list, or guaranteed customer outcomes. */
export const SALES_ROLES = ['SALES_MANAGER', 'SALES_EXECUTIVE'] as const;
export interface PlaybookChapter {
  id: string;
  title: string;
  summary: string;
  audience: 'Every school' | 'Existing ERP';
  source: string;
  sections: { title: string; body: string; prompts?: string[] }[];
}
export const playbookChapters: PlaybookChapter[] = [
  {
    id: 'discovery', title: 'Open with the school’s workload', audience: 'Every school',
    summary: 'Listen first. Find the repeated work before introducing SchoolIMS.',
    source: 'Sales Playbook · pp. 2–5, 12',
    sections: [
      { title: 'The conversation arc', body: 'Open → Discover → Reframe → Introduce → Demonstrate → Handle objections → Close. Ask a few pointed questions, pause, and record the school’s own words. Avoid opening with company history or a count of modules.' },
      { title: 'A practical opening', body: '“Before I explain SchoolIMS, could you walk me through how you manage attendance, fee follow-ups, parent communication and daily staff reporting?” Let the principal finish before asking a follow-up.' },
      { title: 'Four discovery areas', body: 'Look for duplicate entry, repeated phone calls and information passed between people.', prompts: [
        'Communication: How do important notices reach all parents? Who follows up when a message is missed?',
        'Fees: How much manual work goes into finding overdue accounts and contacting each parent?',
        'Attendance: Where is it recorded? Does someone enter or communicate the same information again?',
        'Visibility: Can management see attendance, pending fees, staff issues and transport without calling anyone?',
      ] },
      { title: 'Reflect, then position', body: 'Summarize the repeated work they described. Position SchoolIMS around entering information once, routing it to the right people and giving management visibility. Connect each claim to a workflow you can demonstrate.' },
      { title: 'The short pitch', body: 'SchoolIMS connects attendance, fees, academics, communication and transport so staff can reduce repeated updates and follow-ups, while management gains visibility and parents use the school’s branded app.' },
    ],
  },
  {
    id: 'value', title: 'Explain the operational value', audience: 'Every school',
    summary: 'Make the benefit concrete for teachers, accounts, management and parents.',
    source: 'Sales Playbook · pp. 6–8; Incumbent ERP Battlebook · p. 1',
    sections: [
      { title: 'Sell outcomes people recognize', body: 'Walk through one attendance entry reaching the relevant people, accounts handling exceptions instead of repeated calls, and one official notice reaching the school community. Show management how it can answer a daily question from the dashboard.' },
      { title: 'The parent experience', body: 'Demonstrate the school’s identity, simple mobile navigation, and the available English/Telugu and voice workflows in the configured demo. Show what a parent actually receives; verify the supported channels and languages before making commitments.' },
      { title: 'Six premium value pillars', body: 'Workflow depth, direct management control, parent experience, institutional identity, regional usability, and implementation support. For each pillar, ask which benefit matters to this school and demonstrate the relevant workflow.' },
      { title: 'Use the school calendar', body: 'Discuss the next admissions cycle, academic term or fee collection period. Agree on a realistic preparation window. Avoid invented deadlines or “today only” urgency.' },
    ],
  },
  {
    id: 'demo', title: 'Run the seven-step school demo', audience: 'Every school',
    summary: 'A connected story from the principal’s dashboard to the school’s identity.',
    source: 'Sales Playbook · p. 9',
    sections: [
      { title: 'Prepare before the visit', body: 'Use approved demonstration records and verify each workflow works in the demo environment. Prepare the school’s branding only with permission. Practice the full sequence before presenting.' },
      { title: 'The demo sequence', body: 'For a general school introduction, use this order. Tie every stop to a concern from discovery.', prompts: [
        '1. Principal dashboard: attendance, fees, admissions and pending actions. Show management control.',
        '2. Teacher attendance: mark a demo student absent and follow the resulting information flow.',
        '3. Parent app: show attendance, notices, fees, academics and transport from the parent’s perspective.',
        '4. Telugu and voice: switch language and play an available sample alert live.',
        '5. Fees: show pending amounts, payments, ledger and the reminder workflow.',
        '6. Transport: show how the driver and parent workflows connect.',
        '7. School branding: close with the school’s name, logo, colours and identity.',
      ] },
      { title: 'When asked for more features', body: 'Return to the five or six processes causing the most work. Offer to explore other modules after proving those workflows. For schools already using an ERP, use the three-workflow challenge in the incumbent guide instead of this full introduction.' },
    ],
  },
  {
    id: 'incumbent', title: 'Win a school that already has an ERP', audience: 'Existing ERP',
    summary: 'Respect the existing decision and test what work remains manual.',
    source: 'Incumbent ERP Battlebook · pp. 1, 3, 7',
    sections: [
      { title: 'Validate the digital foundation', body: 'Acknowledge that staff already understand digital systems. Ask how much daily manual work the current system removes. Criticizing the vendor can make the principal defend the original purchase.' },
      { title: 'A 30-minute meeting', body: '0–3 min: acknowledge current ERP adoption. 3–12 min: audit six operational areas. 12–25 min: demonstrate three admitted pain points. 25–30 min: agree on a controlled proof trial with measurable outcomes.' },
      { title: 'Six areas to audit', body: 'Listen for activity outside the ERP, rather than assuming the incumbent cannot do something.', prompts: [
        'Attendance: parallel paper registers, reconciliation or separate parent calls.',
        'Fee collections: exported lists, teachers chasing payments or repeated manual reminders.',
        'Communication: notices lost in WhatsApp groups or uncertain delivery.',
        'Academics: disconnected homework, diary, exams, report cards and student history.',
        'Transport: separate systems or recurring “where is the bus?” calls.',
        'Management: verbal updates and printed reports instead of timely visibility.',
      ] },
      { title: 'Three questions that focus the meeting', body: 'Ask one question, then listen.', prompts: [
        'If your current ERP disappeared tomorrow, which daily operations would stop?',
        'Which administrative tasks are still done by hand even though you pay for software?',
        'Which three friction points would matter most to improve?',
      ] },
    ],
  },
  {
    id: 'proof', title: 'Prove three workflows side by side', audience: 'Existing ERP',
    summary: 'Compare clicks, handoffs and follow-ups after data is entered.',
    source: 'Incumbent ERP Battlebook · pp. 3–4, 6–7',
    sections: [
      { title: 'Agree on the evidence', body: 'Let the school choose three bottlenecks. Record the current steps, people involved, weekly time spent and information delays. Demonstrate the same process in SchoolIMS and measure the result rather than asserting superiority.' },
      { title: 'Example: fee follow-up', body: 'Follow the entire journey: identify overdue accounts → notify the parent → receive payment → issue the appropriate receipt and reconcile the ledger → inspect management visibility. Verify which steps are automatic in the actual setup, and show exceptions as well as the happy path.' },
      { title: 'Define a proof trial', body: 'Agree on the three workflows, approved sample data, school owner, implementation owner, start date, review date and success measures. Keep the existing system available while validating the proposed process.' },
      { title: 'Close with a decision', body: '“Which three processes should we compare side by side, and when can we review the result together?” If the evidence does not justify a switch, acknowledge that the current system may remain the right choice.' },
    ],
  },
  {
    id: 'objections', title: 'Respond to common objections', audience: 'Every school',
    summary: 'Practical responses that reopen discovery and lead to a demonstration.',
    source: 'Sales Playbook · p. 10; Incumbent ERP Battlebook · pp. 4–6',
    sections: [
      { title: '“We already use WhatsApp.”', body: 'Acknowledge its usefulness for messages. Ask where attendance, fee ledgers, student history and management reporting live. Demonstrate an official workflow that reduces manual relaying.' },
      { title: '“Our software works fine.”', body: 'Agree that replacement needs a reason. Ask what still requires staff calls, duplicate registers or manual reports. Compare a specific workflow and let the evidence determine whether change is worthwhile.' },
      { title: '“Teachers will not use it.”', body: 'Treat adoption as a real requirement. Show one simple teacher task, compare the steps with the current process, and discuss the training and support needed.' },
      { title: '“Parents are not tech-savvy.”', body: 'Demonstrate simple mobile navigation and the available Telugu and voice experience. Agree on parent onboarding support rather than assuming every parent will adopt immediately.' },
      { title: '“Your software is expensive.”', body: 'Acknowledge the full annual cost and the difference from their current invoice. Ask what additional workload reduction and visibility would justify that difference. Do not hide the total behind a daily figure.' },
      { title: '“Both brochures have the same features.”', body: 'Compare what happens after data entry: clicks, staff handoffs, parent follow-up and management visibility. Demonstrate one process end to end.' },
      { title: '“We just renewed. Migration is difficult.”', body: 'Use the time to evaluate the next cycle calmly. Discuss available exports, validation, staff training and a phased rollout. Confirm feasibility with implementation before promising migration scope or timing.' },
      { title: '“Give us a discount.”', body: 'First establish whether the workflow improvement justifies the investment. Use the approved pricing process for any commercial changes; a lower price cannot substitute for a clear business case.' },
    ],
  },
  {
    id: 'pricing', title: 'Discuss price and measurable value', audience: 'Existing ERP',
    summary: 'Own the annual math. Use school-specific evidence for the business case.',
    source: 'Incumbent ERP Battlebook · pp. 2, 5–6',
    sections: [
      { title: 'Reference pricing example', body: 'The supplied battlebook uses ₹29 per student per month (₹348 per year). For 1,000 students, this is ₹29,000 monthly and ₹3,48,000 annually: 11.6 times a ₹30,000 annual incumbent licence. These are training examples; confirm current approved rates, scope, taxes and terms before quoting.' },
      { title: 'Quantify the actual work', body: 'Ask the school for the number of staff involved, hours per week spent on repeated work, and an agreed hourly cost. Weekly hours × hourly cost estimates the value of that time. Time released is capacity, not automatically a cash saving.' },
      { title: 'Separate the value drivers', body: 'Track administrative time, overdue fee timing, separate tools and paper costs, and parent experience independently. Do not count faster collection as new revenue, assume every point solution can be removed, or add overlapping savings together.' },
      { title: 'Proof before promises', body: 'The PDFs contain illustrative hours saved, collection improvements and retention scenarios. Establish the school’s baseline, agree on a measurement period and compare observed results. Do not present those examples as guaranteed outcomes.' },
    ],
  },
  {
    id: 'close', title: 'Close with a concrete next step', audience: 'Every school',
    summary: 'Choose the first processes, agree on owners and hand over an achievable rollout.',
    source: 'Sales Playbook · pp. 8, 11; Incumbent ERP Battlebook · pp. 5, 7',
    sections: [
      { title: 'Ask for the priority', body: '“Which area would give your school the biggest immediate benefit: communication, fees, attendance, management visibility or academics?” Wait for an answer, then agree on where to start.' },
      { title: 'Make the next meeting concrete', body: 'Ask permission to prepare a walkthrough with the school’s identity. Record the contact, agreed processes, required details, responsible person and follow-up date. For an incumbent school, agree on the three-workflow proof trial.' },
      { title: 'Prepare the implementation handoff', body: 'Capture school profile and student count, decision maker, priority workflows, current tools, promised scope, migration dependencies, demo outcomes and open questions. Raise requirements for unverified requests and track the school’s onboarding checklist.' },
      { title: 'Roll out in stages', body: 'Plan core data and attendance first, then parent communication, followed by fees and academics according to school readiness. Agree on staff training and launch sign-off with implementation. Avoid an overnight replacement promise.' },
      { title: 'Pre-meeting recon', body: 'Before the next visit, confirm student strength, current ERP and renewal date, tuition range, decision maker, and a prepared demo. Use only details needed for the school’s evaluation.' },
    ],
  },
];

export interface TrainingModule {
  id: string; title: string; duration: string; chapterIds: string[];
  objective: string; exercise: string; checklist: string[];
  question: string; options: string[]; answer: number; explanation: string;
}
export const trainingModules: TrainingModule[] = [
  { id: 'listen', title: '1. Discovery fundamentals', duration: '15 min', chapterIds: ['discovery', 'value'],
    objective: 'Open a school meeting and identify repeated work without leading with features.',
    exercise: 'Roleplay a three-minute opening with a colleague acting as principal. Ask about two workflows, pause after each question, then summarize the principal’s own words.',
    checklist: ['Open with the school’s situation', 'Ask a follow-up about manual work', 'Reflect the pain before introducing the product'],
    question: 'What is the strongest opening for a first school visit?',
    options: ['Ask how the school currently handles attendance and fee follow-ups', 'List every module in SchoolIMS', 'Offer a discount before discovery'], answer: 0,
    explanation: 'Discovery reveals the school’s workload and gives the demonstration a relevant purpose.' },
  { id: 'demonstrate', title: '2. The connected demonstration', duration: '20 min', chapterIds: ['demo'],
    objective: 'Deliver the seven-step introductory demo with a clear story.',
    exercise: 'Using approved demo records, start at the principal dashboard, mark attendance, and follow the information into the parent app. Continue through Telugu/voice, fees, transport and branding.',
    checklist: ['Verify the demo works before presenting', 'Follow the seven-step sequence', 'Explain the benefit at each stop'],
    question: 'After the principal dashboard and teacher attendance, what comes next?',
    options: ['Backend role settings', 'The parent app showing the information flow', 'A full module catalogue'], answer: 1,
    explanation: 'The parent app connects the teacher’s action to the parent experience before the language and voice demonstration.' },
  { id: 'compete', title: '3. Selling alongside an incumbent', duration: '20 min', chapterIds: ['incumbent', 'proof'],
    objective: 'Turn an existing ERP discussion into a measurable workflow comparison.',
    exercise: 'A principal says their ₹30,000 ERP works fine. Validate that choice, ask about manual work in the six audit areas, and agree on three processes for a side-by-side trial.',
    checklist: ['Respect the current vendor decision', 'Select three admitted bottlenecks', 'Agree on baseline, owners and review date'],
    question: 'The principal says both products have the same features. What should you do?',
    options: ['Insist that their ERP is outdated', 'Show more menu items', 'Compare one complete workflow, including handoffs and follow-ups'], answer: 2,
    explanation: 'Workflow evidence demonstrates the operational difference that similar feature names cannot show.' },
  { id: 'value_case', title: '4. Price and the value case', duration: '15 min', chapterIds: ['pricing'],
    objective: 'Explain the full annual investment and build a school-specific business case.',
    exercise: 'Calculate the annual training example for 1,000 students at ₹29 per month. Compare it with a ₹30,000 licence, then ask for the school’s actual staff hours and success measures.',
    checklist: ['State the annual total and price multiple', 'Distinguish reference pricing from an approved quote', 'Use measured evidence instead of guaranteed savings'],
    question: 'At the reference rate, what is the annual cost for 1,000 students?',
    options: ['₹29,000', '₹3,48,000', '₹30,000'], answer: 1,
    explanation: '1,000 × ₹29 × 12 = ₹3,48,000 per year. Confirm current commercial terms before quoting.' },
  { id: 'handle_objections', title: '5. Objection practice', duration: '15 min', chapterIds: ['objections'],
    objective: 'Acknowledge concerns and choose a useful demonstration or follow-up.',
    exercise: 'Take turns responding to “teachers will not use it”, “parents are not tech-savvy” and “we just renewed”. For each concern, acknowledge it, ask one question and propose one practical next step.',
    checklist: ['Acknowledge without arguing', 'Show a relevant workflow', 'Verify support and migration commitments'],
    question: 'How should you handle a concern about difficult migration?',
    options: ['Promise an overnight switch with no disruption', 'Ignore it and return to price', 'Discuss exports, validation, training and a phased rollout with implementation'], answer: 2,
    explanation: 'A realistic phased plan addresses switching risk and avoids unverified commitments.' },
  { id: 'handoff', title: '6. Close and hand over', duration: '15 min', chapterIds: ['close', 'proof'],
    objective: 'Leave the meeting with a specific next action and an actionable handoff.',
    exercise: 'Write a sample handoff: priority processes, decision maker, agreed scope, open requirements, owner and next review date. Walk your manager through the proposed rollout and onboarding checklist.',
    checklist: ['Ask which process to solve first', 'Agree on an owner and date', 'Record promises, dependencies and open requirements'],
    question: 'Which close produces the clearest next step?',
    options: ['Which three processes should we test, with whom, and on what date?', 'What did you think?', 'Please buy today because this offer expires'], answer: 0,
    explanation: 'A concrete next action makes evaluation and handoff possible. Complete a manager-observed roleplay before independent field visits.' },
];
