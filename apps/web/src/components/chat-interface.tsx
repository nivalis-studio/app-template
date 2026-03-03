'use client';

import { useChat } from '@ai-sdk/react';
import { BotIcon, SendIcon, UserIcon } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/classnames';

const ChatInterface = () => {
  const { messages, sendMessage, status, error } = useChat();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom when new messages arrive or content streams in
  const messageCount = messages.length;
  const lastMessageParts = messages.at(-1)?.parts;
  useEffect(() => {
    // Both messageCount and lastMessageParts trigger re-scroll:
    // messageCount for new messages, lastMessageParts for streaming updates
    if ((messageCount > 0 || lastMessageParts) && scrollRef.current) {
      // scrollRef targets the ScrollArea root; find the Viewport element
      const viewport = scrollRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]',
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messageCount, lastMessageParts]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) {
      return;
    }

    sendMessage({ text: trimmed });
    setInput('');
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col rounded-lg border bg-card'>
      {/* Conversation area */}
      <ScrollArea className='flex-1 p-4' ref={scrollRef}>
        {messages.length === 0 ? (
          <div className='flex h-full items-center justify-center py-12'>
            <div className='text-center'>
              <BotIcon className='mx-auto mb-3 h-10 w-10 text-muted-foreground' />
              <p className='font-medium text-muted-foreground'>
                Start a conversation
              </p>
              <p className='mt-1 text-muted-foreground text-sm'>
                Send a message to begin chatting with the AI assistant.
              </p>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            {messages.map(message => (
              <div
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start',
                )}
                key={message.id}
              >
                {message.role === 'assistant' && (
                  <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10'>
                    <BotIcon className='h-4 w-4 text-primary' />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted',
                  )}
                >
                  <p className='whitespace-pre-wrap'>
                    {message.parts
                      .filter(
                        (part): part is { type: 'text'; text: string } =>
                          part.type === 'text',
                      )
                      .map(part => part.text)
                      .join('')}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary'>
                    <UserIcon className='h-4 w-4 text-primary-foreground' />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages.at(-1)?.role !== 'assistant' && (
              <div className='flex gap-3'>
                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10'>
                  <BotIcon className='h-4 w-4 text-primary' />
                </div>
                <div className='rounded-lg bg-muted px-4 py-2'>
                  <div className='flex gap-1'>
                    <span className='h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]' />
                    <span className='h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]' />
                    <span className='h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]' />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Error display */}
      {error && (
        <div className='mx-4 mb-2 rounded-md bg-destructive/10 px-4 py-2 text-destructive text-sm'>
          {error.message || 'Something went wrong. Please try again.'}
        </div>
      )}

      {/* Message input */}
      <form className='flex gap-2 border-t p-4' onSubmit={handleSubmit}>
        <Input
          className='flex-1'
          disabled={isLoading}
          onChange={e => setInput(e.target.value)}
          placeholder='Type a message...'
          ref={inputRef}
          type='text'
          value={input}
        />
        <Button disabled={isLoading || !input.trim()} size='icon' type='submit'>
          <SendIcon className='h-4 w-4' />
          <span className='sr-only'>Send message</span>
        </Button>
      </form>
    </div>
  );
};

export { ChatInterface };
