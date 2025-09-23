<template>
  <div class="chatroom">
    <div class="messages" ref="messagesBox" @scroll="onScroll">
      <div v-if="loading" class="py-6 text-center text-surface-500">Loading messages…</div>
      <div v-else-if="!messages.length" class="py-6 text-center text-surface-500">No messages yet. Be the first to comment.</div>

      <div v-else class="flex flex-col gap-5">
        <template v-for="group in grouped" :key="group.key">
          <div class="date-separator" :data-label="group.label"></div>
          <div class="flex flex-col gap-3">
            <template v-for="m in group.items" :key="m.token">
              <div v-if="showUnreadSeparatorBefore(m)" id="unread-separator" class="unread-separator" :data-label="unreadLabel"></div>
              <div
                class="bubble p-3 rounded-2xl max-w-[80%] shadow-sm"
                :data-token="m.token"
                :class="{
                  'bubble-incoming': !isMine(m),
                  'bubble-outgoing self-end ml-auto': isMine(m),
                }"
              >
                <div class="flex items-center justify-between text-xs opacity-80 mb-1">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="truncate">{{ displayName(m.author) }}</span>
                    <span class="role-badge" :class="roleClass(m.author?.role)">{{ roleLabel(m.author?.role) }}</span>
                  </div>
                  <span class="shrink-0">{{ formatTime(m.createdAt) }}</span>
                </div>
                <div class="whitespace-pre-wrap">{{ m.content }}</div>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>

    <transition name="fade">
      <button
        v-if="showScrollToBottom"
        class="scroll-bottom-btn"
        type="button"
        @click="scrollToBottomAndMarkRead"
        title="Scroll to latest"
      >
        <i class="pi pi-arrow-down" />
        <span v-if="newSinceScroll > 0" class="scroll-badge">{{ Math.min(99, newSinceScroll) }}</span>
      </button>
    </transition>

    <div v-if="isResolved" class="mt-3 p-3 text-sm rounded border border-yellow-200 bg-yellow-50 text-yellow-800">
      This thread is closed because the report has been resolved. You can't send new messages.
    </div>

    <div class="composer mt-3 flex gap-2 items-start">
      <span v-if="unreadCount > 0" class="unread-badge" :title="`${unreadCount} unread`">{{ unreadCount }}</span>
      <Textarea
        v-model="draft"
        rows="2"
        class="flex-1"
        :disabled="isResolved"
        :placeholder="isResolved ? 'Thread closed — resolved' : 'Type a message…'"
        @keydown.enter.exact.prevent="send"
      />
      <Button label="Send" icon="pi pi-send" :disabled="isResolved || !draft.trim() || sending" @click="send" />
    </div>
  </div>
  
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { listIssueMessages, postIssueMessage, getIssueMessageRead, setIssueMessageRead, getIssueReport } from '@/utils/backend_helper';
import { connectSocket } from '@/utils/socket';

const props = defineProps({
  issueToken: { type: String, required: true },
  pollMs: { type: Number, default: 5000 }
});

const messages = ref([]);
const loading = ref(false);
const sending = ref(false);
const draft = ref('');
const messagesBox = ref(null);
const atBottom = ref(true);
const scrollOnNextLoad = ref(false);
const initialized = ref(false);
const lastSeenAt = ref(null); // ISO string or null
const isResolved = ref(false);
const unreadCount = computed(() => {
  // Count only messages from others that are newer than last_seen_at
  if (!messages.value.length) return 0;
  const isOther = (m) => m?.author?.token && m.author.token !== currentUserToken;
  if (!lastSeenAt.value) return messages.value.filter(isOther).length;
  const last = new Date(lastSeenAt.value).getTime();
  return messages.value.filter(m => isOther(m) && new Date(m.createdAt).getTime() > last).length;
});

// Human label for separator
const unreadLabel = computed(() => {
  const n = unreadCount.value || 0;
  return `${n} unread ${n === 1 ? 'message' : 'messages'}`;
});

// First unread token to place separator
const firstUnreadToken = computed(() => {
  if (!messages.value.length) return null;
  const last = lastSeenAt.value ? new Date(lastSeenAt.value).getTime() : null;
  for (const m of messages.value) {
    const other = m?.author?.token && m.author.token !== currentUserToken;
    if (other && (!last || new Date(m.createdAt).getTime() > last)) return m.token;
  }
  return null;
});

const currentUserToken = sessionStorage.getItem('token');
const toast = useToast();

const isMine = (m) => m?.author?.token === currentUserToken;
const displayName = (u) => {
  if (!u) return 'Unknown';
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return name || u.email || 'Unknown';
};
const formatTime = (ts) => {
  const d = new Date(ts);
  try {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return d.toLocaleTimeString();
  }
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) => {
  const ms = startOfDay(a) - startOfDay(b);
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

const dateLabelFor = (date) => {
  const now = new Date();
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = daysBetween(now, d); // positive if now is after d

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' }); // e.g., Friday
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const grouped = computed(() => {
  const groups = new Map();
  for (const m of messages.value) {
    const d = new Date(m.createdAt);
    const key = startOfDay(d).toISOString();
    if (!groups.has(key)) {
      groups.set(key, { key, label: dateLabelFor(d), items: [] });
    }
    groups.get(key).items.push(m);
  }
  // Ensure chronological order by date
  return Array.from(groups.values()).sort((a, b) => a.key.localeCompare(b.key));
});

// Show unread separator before the first unread message (from others)
const showUnreadSeparatorBefore = (m) => unreadCount.value > 0 && firstUnreadToken.value === m.token;

const roleLabel = (role) => {
  switch (role) {
    case 'resident': return 'Resident';
    case 'staff': return 'Staff';
    case 'communityleader': return 'Leader';
    case 'admin': return 'Admin';
    default: return role || 'User';
  }
};

const roleClass = (role) => {
  switch (role) {
    case 'resident': return 'bg-blue-100 text-blue-800';
    case 'staff': return 'bg-green-100 text-green-800';
    case 'communityleader': return 'bg-purple-100 text-purple-800';
    case 'admin': return 'bg-red-100 text-red-800';
    default: return 'bg-surface-200 text-surface-700';
  }
};

const scrollToBottom = async () => {
  await nextTick();
  const el = messagesBox.value;
  if (el) {
    el.scrollTop = el.scrollHeight;
    atBottom.value = true;
  }
};

const load = async () => {
  const first = !initialized.value;
  if (first) loading.value = true;
  try {
    const el = messagesBox.value;
    let prevFromBottom = 0;
    if (el && !(atBottom.value || scrollOnNextLoad.value)) {
      prevFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    }

  const { data } = await listIssueMessages(props.issueToken);
  messages.value = Array.isArray(data) ? data : [];

    // Determine unread AFTER fetching the latest messages
    const newest = messages.value[messages.value.length - 1]?.createdAt;
    const hasUnread = !!(lastSeenAt.value && newest && (new Date(newest).getTime() > new Date(lastSeenAt.value).getTime()));
    const shouldAuto = scrollOnNextLoad.value || (atBottom.value && !hasUnread);

    if (shouldAuto) {
      await scrollToBottom();
      await markReadIfAtBottom();
    } else if (el) {
      await nextTick();
      // If there are unread messages and it's the first load of this session, jump to the first unread
      if (first && unreadCount.value > 0) {
        await scrollToFirstUnread();
      } else {
        // Preserve relative scroll position from bottom when reloading
        el.scrollTop = el.scrollHeight - el.clientHeight - prevFromBottom;
      }
    }
  } finally {
    if (!initialized.value) initialized.value = true;
    if (loading.value) loading.value = false;
    scrollOnNextLoad.value = false;
  }
};

const markReadIfAtBottom = async () => {
  if (!atBottom.value || !messages.value.length) return;
  const newest = messages.value[messages.value.length - 1]?.createdAt;
  if (!newest) return;
  try {
    await setIssueMessageRead(props.issueToken, newest);
    lastSeenAt.value = newest;
  } catch (e) {
    // silent fail
  }
};

// Helpers to avoid flicker: only auto-mark read when the tab is visible and focused
const canAutoMarkRead = () => {
  try {
    const vs = document.visibilityState;
    const focused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
    return vs === 'visible' && focused;
  } catch { return true; }
};

// Optimistic mark read: update UI immediately and fire request in background
const markReadOptimistic = (isoTs) => {
  if (!isoTs) return;
  lastSeenAt.value = isoTs;
  setIssueMessageRead(props.issueToken, isoTs).catch(() => {});
};

let readDebounceTimer = null;
const scheduleMarkReadDebounced = () => {
  if (!canAutoMarkRead()) return;
  if (readDebounceTimer) clearTimeout(readDebounceTimer);
  readDebounceTimer = setTimeout(() => {
    markReadIfAtBottom();
  }, 250);
};

const send = async () => {
  if (isResolved.value) {
    toast.add({ severity: 'warn', summary: 'Thread closed', detail: 'This report is resolved. New messages are not allowed.', life: 3000 });
    return;
  }
  if (!draft.value.trim()) return;
  sending.value = true;
  try {
    // After sending, ensure we stick to bottom when the thread reloads
    scrollOnNextLoad.value = true;
    await postIssueMessage(props.issueToken, draft.value.trim());
    draft.value = '';
    await load();
    // Extra safety: ensure we're at bottom after the DOM settles
    await scrollToBottom();
    await markReadIfAtBottom();
  } catch (e) {
    console.error(e);
    const status = e?.response?.status;
    if (status === 409) {
      isResolved.value = true;
      const detail = e?.response?.data?.error || 'Thread is closed for resolved issue';
      toast.add({ severity: 'warn', summary: 'Thread closed', detail, life: 3500 });
    } else {
      const detail = e?.response?.data?.error || e?.message || 'Failed to send message';
      toast.add({ severity: 'error', summary: 'Send failed', detail, life: 3000 });
    }
  } finally {
    sending.value = false;
  }
};

let timer;
const newSinceScroll = ref(0);

onMounted(async () => {
  // Connect socket and join this issue room
  const s = connectSocket();
  s.emit('issue:join', { issueToken: props.issueToken });
  s.on('connect_error', () => {/* silent */});
  s.on('message:new', async (payload) => {
    if (payload?.issueToken !== props.issueToken) return;
    // Append message and keep scroll behavior
    const m = payload.message;
    if (m) {
      messages.value = [...messages.value, m];
      if (atBottom.value) {
        await scrollToBottom();
        // Avoid unread flicker: if user is actively viewing this chat, mark read optimistically
        if (canAutoMarkRead()) {
          markReadOptimistic(m.createdAt);
        }
      } else {
        newSinceScroll.value = Math.min(99, (newSinceScroll.value || 0) + 1);
      }
    } else {
      await load();
    }
  });
  s.on('message:read', async (payload) => {
    if (payload?.issueToken !== props.issueToken) return;
    // No UI change needed here in the ChatRoom for others' read, but could be used to show read receipts later
  });

  // Load last seen
  try {
    const { data } = await getIssueMessageRead(props.issueToken);
    lastSeenAt.value = data?.last_seen_at || null;
  } catch {}
  // Fetch report to know if it's resolved (closed)
  try {
    const { data: issue } = await getIssueReport(props.issueToken);
    isResolved.value = issue?.status === 'RESOLVED';
  } catch {}
  await load();
  // After first load, if unread exists jump to first unread; else ensure bottom
  await nextTick();
  if (firstUnreadToken.value) {
    await scrollToFirstUnread();
  } else {
    await scrollToBottom();
    // If we're at bottom and page is visible, optimistically mark as read to prevent separator flicker
    const newest = messages.value[messages.value.length - 1]?.createdAt;
    if (newest && canAutoMarkRead()) markReadOptimistic(newest);
  }
  timer = setInterval(load, props.pollMs);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  try { connectSocket().emit('issue:leave', { issueToken: props.issueToken }); } catch {}
});

watch(() => props.issueToken, async () => {
  await load();
});

const onScroll = () => {
  const el = messagesBox.value;
  if (!el) return;
  const threshold = 30; // px
  const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
  atBottom.value = distanceFromBottom <= threshold;
  if (atBottom.value) {
    // User viewed latest; mark read
    scheduleMarkReadDebounced();
    newSinceScroll.value = 0;
  }
};

const showScrollToBottom = computed(() => !atBottom.value);
const scrollToBottomAndMarkRead = async () => {
  await scrollToBottom();
  newSinceScroll.value = 0;
  await markReadIfAtBottom();
};

// Helper: scroll to the first unread message (from others)
const scrollToFirstUnread = async () => {
  await nextTick();
  const box = messagesBox.value;
  if (!box) return;
  // Prefer scrolling to the unread separator itself so it's in frame
  const sep = box.querySelector('#unread-separator');
  const target = sep || box.querySelector(`[data-token="${firstUnreadToken.value}"]`);
  if (!target) return;
  try {
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    // slight offset to reveal messages before/after
    box.scrollTop = box.scrollTop - 6;
    atBottom.value = false;
  } catch {}
};
</script>

<style scoped>
.chatroom { max-height: 60vh; display: flex; flex-direction: column; position: relative; }
.messages { height: 50vh; max-height: 50vh; overflow: auto; padding: 0.5rem 0.25rem; }
.date-separator {
  position: relative;
  text-align: center;
  margin: 0.5rem 0;
}
.date-separator::before {
  content: "";
  position: absolute;
  left: 0; right: 0; top: 50%;
  border-top: 1px solid var(--p-surface-300);
}
.date-separator::after {
  content: attr(data-label);
  position: relative;
  padding: 0.15rem 0.5rem;
  background: var(--p-surface-0);
  color: var(--text-color-secondary);
  font-size: 0.75rem;
}
.role-badge {
  padding: 0.05rem 0.4rem;
  border-radius: 9999px;
  font-size: 0.65rem;
  line-height: 1rem;
  white-space: nowrap;
}
/* iOS/WhatsApp-like bubbles using Prime tokens */
.bubble { border-radius: 1.25rem; padding: 0.6rem 0.8rem; }
.bubble-incoming {
  align-self: flex-start;
  background: var(--p-surface-100);
  color: var(--p-text-color);
  border: 1px solid var(--p-surface-300);
}
.bubble-outgoing {
  align-self: flex-end;
  background: var(--p-primary-200);
  color: var(--p-primary-900);
}

.unread-separator { position: relative; text-align: center; margin: 0.75rem 0 1rem; }
.unread-separator::before {
  content: ""; position: absolute; left: 0; right: 0; top: 50%;
  border-top: 2px solid var(--p-primary-200);
}
.unread-separator::after {
  content: attr(data-label);
  position: relative;
  padding: 0.12rem 0.6rem;
  background: var(--p-primary-50);
  color: var(--p-primary-800);
  font-size: 0.72rem;
  border-radius: 9999px;
  border: 1px solid var(--p-primary-300);
  box-shadow: 0 0 0 2px var(--p-surface-0), 0 1px 6px rgba(0,0,0,0.06);
}
.unread-badge {
  align-self: center;
  background: var(--p-primary-500);
  color: white;
  border-radius: 9999px;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
}
.scroll-bottom-btn {
  position: absolute;
  right: 12px;
  bottom: 76px;
  display: inline-flex;
  align-items: center;
  background: var(--p-primary-500);
  color: #fff;
  border: none;
  border-radius: 9999px;
  width: 36px;
  height: 36px;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  cursor: pointer;
}
.scroll-bottom-btn:hover { filter: brightness(1.05); }
.scroll-bottom-btn .pi { font-size: 0.9rem; }
.scroll-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ef4444;
  color: #fff;
  border-radius: 9999px;
  font-size: 0.65rem;
  line-height: 1;
  padding: 2px 5px;
}
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
