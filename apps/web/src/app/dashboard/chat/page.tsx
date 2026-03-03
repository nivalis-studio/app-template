import { ChatInterface } from '@/components/chat-interface';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat',
};

const ChatPage = () => {
  return (
    <div className='flex h-[calc(100svh-theme(spacing.12)-2*theme(spacing.4))] flex-col'>
      <div className='mb-4'>
        <h1 className='font-bold font-sans text-2xl tracking-tight'>AI Chat</h1>
        <p className='mt-1 text-muted-foreground'>
          Chat with an AI assistant. Ask questions or request web page analysis.
        </p>
      </div>
      <ChatInterface />
    </div>
  );
};

export default ChatPage;
