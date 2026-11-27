import { handleMessage } from '@/src/messaging/handlers';
import { platform } from '@/src/platform';

export default defineBackground(() => {
  platform.setupEntry();
  browser.runtime.onMessage.addListener((raw, sender) => {
    // 只接受本扩展自己的页面发来的消息
    if (sender.id !== browser.runtime.id) return;
    return handleMessage(raw);
  });
});
