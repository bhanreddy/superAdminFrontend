// Read-only synthetic content for the local visual preview. No production data.
const self = '10000000-0000-4000-8000-000000000001';
const colleague = '10000000-0000-4000-8000-000000000002';
const general = '20000000-0000-4000-8000-000000000001';
const product = '20000000-0000-4000-8000-000000000002';
const operations = '20000000-0000-4000-8000-000000000003';
const design = '20000000-0000-4000-8000-000000000004';
const dm = '20000000-0000-4000-8000-000000000005';
const channel = (id, name, purpose, count = 0, joined = true) => ({ id, name, purpose, description: purpose, unread_count: count, joined, can_manage: true, visibility: 'public', category: 'company', announcements_only: false, archived_at: null });
const channels = [channel(general, 'general', 'Company updates, shared wins, and everyday collaboration', 3), channel(product, 'product-and-engineering', 'Build, review, and ship great experiences', 2), channel(design, 'design-studio', 'Ideas, explorations, and thoughtful feedback'), channel(operations, 'school-operations', 'A shared space for school launches and support', 0, false)];
const message = (n, body, extra = {}) => ({ id: `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`, client_id: `fixture-${n}`, sequence: n, revision: 1, conversation_id: general, sender_id: colleague, sender_name: 'Aarav Shah', parent_id: null, body, created_at: `2026-11-01T09:${String(30 + n).padStart(2, '0')}:00+05:30`, deleted_at: null, edited_at: null, reply_count: 0, reactions: [], mentions: [], attachments: [], ...extra });
const messages = [message(1, 'Good morning, team! A fresh week of building better experiences for our schools.', { sender_id: self, sender_name: 'QA Demo User', reply_count: 2, reactions: [{ user_id: colleague, emoji: '🎉' }, { user_id: self, emoji: '🎉' }] }), message(2, 'The workspace refresh is ready for a review. I’ve put the notes together so we can keep feedback in one place.', { attachments: [{ id: 'fixture-file', filename: 'Workspace review notes.pdf', mime: 'application/pdf', byte_size: 184320 }] }), message(3, 'Please share any final suggestions in the thread. Small details make a big difference.'), message(4, 'Love the direction. The new navigation makes it much easier to find what you need.', { sender_id: '10000000-0000-4000-8000-000000000003', sender_name: 'Meera Reddy', reactions: [{ user_id: self, emoji: '👍' }] }), message(5, 'Let’s review the mobile flows next and then share an update with the team.', { sender_id: self, sender_name: 'QA Demo User' }), message(6, 'The draft is ready for review.', { parent_id: '30000000-0000-4000-8000-000000000001' }), message(7, 'Thanks — I’ll take a look today.', { parent_id: '30000000-0000-4000-8000-000000000001', sender_id: self, sender_name: 'QA Demo User' }), message(8, 'Engineering handoff: share your updates and flag anything that needs a second pair of eyes.', { conversation_id: product }), message(9, 'Bring your ideas and references here. We’ll keep design decisions close to the conversation.', { conversation_id: design }), message(10, 'Have you had a chance to review the new dashboard cards?', { conversation_id: dm })];
export function connectFixture(url, options = {}) {
  if (!url.includes('/connect/')) return undefined;
  const empty = new URLSearchParams(location.search).get('state') === 'empty';
  if (url.endsWith('/bootstrap')) return { organization: { id: 'qa-org', name: 'NexSyrus' }, self: { id: self, full_name: 'QA Demo User', employee_id: 'QA-001', role: 'FOUNDER' }, can_manage: true, channels, direct_messages: [{ id: dm, employee_id: colleague, name: 'Aarav Shah', unread_count: 1 }], unread_notifications: 0, preferences: { mode: 'mentions', push_enabled: false } };
  if (url.endsWith('/messages')) {
    const id = url.split('/').at(-2);
    const p = options.params || {};
    return { messages: empty ? [] : messages.filter(m => m.conversation_id === id && (p.after !== undefined || m.parent_id === (p.parent || null))), has_more: false, last_sequence: 10 };
  }
  if (/\/messages\/[^/]+$/.test(url)) return messages.find(m => m.id === url.split('/').pop());
  if (url.endsWith('/members')) return [{ user_id: self, full_name: 'QA Demo User', employee_id: 'QA-001', role: 'manager' }, { user_id: colleague, full_name: 'Aarav Shah', employee_id: 'QA-002', role: 'member' }];
  return undefined;
}
