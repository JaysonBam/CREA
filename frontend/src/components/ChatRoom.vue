<template>
  <div class="chatroom">
    <div class="messages" ref="messagesBox">
      <div v-if="loading" class="py-6 text-center text-surface-500">Loading messages…</div>
      <div v-else-if="!messages.length" class="py-6 text-center text-surface-500">No messages yet. Be the first to comment.</div>
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="m in messages"
          :key="m.token"
          class="p-3 rounded border surface-border"
          :class="{
            'bg-surface-50 text-surface-800': !isMine(m),
            'bg-primary-50 text-primary-900 border-primary-200 self-end ml-10': isMine(m),
          }"
        >
          <div class="text-xs opacity-70 mb-1">
            <span>{{ displayName(m.author) }}</span>
            <span class="mx-1">•</span>
            <span>{{ formatTime(m.createdAt) }}</span>
          </div>
          <div class="whitespace-pre-wrap">{{ m.content }}</div>
        </div>
      </div>
    </div>

    <div class="composer mt-3 flex gap-2 items-start">
      <Textarea v-model="draft" rows="2" class="flex-1" placeholder="Type a message…" @keydown.enter.exact.prevent="send" />
      <Button label="Send" icon="pi pi-send" :disabled="!draft.trim() || sending" @click="send" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useToast } from 'primevue/usetoast';
import { listIssueMessages, postIssueMessage } from '@/utils/backend_helper';

const props = defineProps({
  issueToken: { type: String, required: true },
  pollMs: { type: Number, default: 5000 }
});

const messages = ref([]);
const loading = ref(false);
const sending = ref(false);
const draft = ref('');
const messagesBox = ref(null);

const currentUserToken = sessionStorage.getItem('token');
const toast = useToast();

const isMine = (m) => m?.author?.token === currentUserToken;
const displayName = (u) => {
  if (!u) return 'Unknown';
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return name || u.email || 'Unknown';
};
const formatTime = (ts) => new Date(ts).toLocaleString();

const scrollToBottom = async () => {
  await nextTick();
  const el = messagesBox.value;
  if (el) el.scrollTop = el.scrollHeight;
};

const load = async () => {
  loading.value = true;
  try {
    const { data } = await listIssueMessages(props.issueToken);
    messages.value = Array.isArray(data) ? data : [];
    await scrollToBottom();
  } finally {
    loading.value = false;
  }
};

const send = async () => {
  if (!draft.value.trim()) return;
  sending.value = true;
  try {
    await postIssueMessage(props.issueToken, draft.value.trim());
    draft.value = '';
    await load();
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
  await load();
  timer = setInterval(load, props.pollMs);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

watch(() => props.issueToken, async () => {
  await load();
});
</script>

<style scoped>
.chatroom { max-height: 60vh; display: flex; flex-direction: column; }
.messages { max-height: 50vh; overflow: auto; padding: 0.25rem; }
</style>
