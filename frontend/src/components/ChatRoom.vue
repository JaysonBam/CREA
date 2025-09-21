<template>
  <div class="chatroom">
    <div class="messages" ref="messagesBox" @scroll="onScroll">
      <div v-if="loading" class="py-6 text-center text-surface-500">Loading messages…</div>
      <div v-else-if="!messages.length" class="py-6 text-center text-surface-500">No messages yet. Be the first to comment.</div>

      <div v-else class="flex flex-col gap-5">
        <template v-for="group in grouped" :key="group.key">
          <div class="date-separator" :data-label="group.label"></div>
          <div class="flex flex-col gap-3">
            <div
              v-for="m in group.items"
              :key="m.token"
              class="p-3 rounded border surface-border max-w-[85%]"
              :class="{
                'bg-surface-50 text-surface-800': !isMine(m),
                'bg-primary-50 text-primary-900 border-primary-200 self-end ml-auto': isMine(m),
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
          </div>
        </template>
      </div>
    </div>

    <div class="composer mt-3 flex gap-2 items-start">
      <span v-if="unreadCount > 0" class="unread-badge" :title="`${unreadCount} unread`">{{ unreadCount }}</span>
      <Textarea v-model="draft" rows="2" class="flex-1" placeholder="Type a message…" @keydown.enter.exact.prevent="send" />
      <Button label="Send" icon="pi pi-send" :disabled="!draft.trim() || sending" @click="send" />
    </div>
  </div>
  
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { listIssueMessages, postIssueMessage, getIssueMessageRead, setIssueMessageRead } from '@/utils/backend_helper';

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
const unreadCount = computed(() => {
  // Count only messages from others that are newer than last_seen_at
  if (!messages.value.length) return 0;
  const isOther = (m) => m?.author?.token && m.author.token !== currentUserToken;
  if (!lastSeenAt.value) return messages.value.filter(isOther).length;
  const last = new Date(lastSeenAt.value).getTime();
  return messages.value.filter(m => isOther(m) && new Date(m.createdAt).getTime() > last).length;
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

// Unread separator removed per requirements; badge-only approach retained.

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
      el.scrollTop = el.scrollHeight - el.clientHeight - prevFromBottom;
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

const send = async () => {
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
    const detail = e?.response?.data?.error || e?.message || 'Failed to send message';
    toast.add({ severity: 'error', summary: 'Send failed', detail, life: 3000 });
  } finally {
    sending.value = false;
  }
};

let timer;

onMounted(async () => {
  // Load last seen
  try {
    const { data } = await getIssueMessageRead(props.issueToken);
    lastSeenAt.value = data?.last_seen_at || null;
  } catch {}
  await load();
  timer = setInterval(load, props.pollMs);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
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
    markReadIfAtBottom();
  }
};
</script>

<style scoped>
.chatroom { max-height: 60vh; display: flex; flex-direction: column; }
.messages { height: 50vh; max-height: 50vh; overflow: auto; padding: 0.25rem; }
.date-separator {
  position: relative;
  text-align: center;
  margin: 0.5rem 0;
}
.date-separator::before {
  content: "";
  position: absolute;
  left: 0; right: 0; top: 50%;
  border-top: 1px solid var(--surface-300);
}
.date-separator::after {
  content: attr(data-label);
  position: relative;
  padding: 0.15rem 0.5rem;
  background: var(--surface-0);
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
/* Unread separator styles removed */
.unread-badge {
  align-self: center;
  background: var(--primary-500);
  color: white;
  border-radius: 9999px;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
}
</style>
