import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image as ImageIcon, Trash2, Edit3, Plus, Bell, BookOpen, ExternalLink, MessageSquare } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Global Chat ---
export function GlobalChat({ t, messages, currentUser, cardClass, theme, onSendMessage, onDeleteMessage }: any) {
  const [newMessage, setNewMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !imageUrl.trim()) return;
    
    onSendMessage({
      content: newMessage,
      type: imageUrl ? 'image' : 'text',
      imageUrl: imageUrl || undefined
    });
    
    setNewMessage('');
    setImageUrl('');
    setShowImageInput(false);
  };

  return (
    <div className={cn("flex flex-col h-[600px] rounded-xl border overflow-hidden", cardClass)}>
      <div className="p-4 border-b border-inherit bg-black/5 dark:bg-white/5 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4"/> {t.chat || "Global Chat"}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg: any) => {
          const isMe = msg.userId === currentUser.id;
          return (
            <div key={msg.id} className={cn("flex gap-3", isMe ? "flex-row-reverse" : "")}>
              <img src={msg.userAvatar} alt="" className="w-8 h-8 rounded-full bg-black/10 object-cover shrink-0" />
              <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[11px] font-medium opacity-70">{msg.userName}</span>
                  <span className="text-[9px] opacity-40">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className={cn("px-4 py-2 rounded-2xl text-[13px]", 
                  isMe 
                    ? "bg-[#1a73e8] text-white rounded-tr-sm" 
                    : theme === 'dark' ? "bg-[#303134] rounded-tl-sm" : "bg-[#f1f3f4] rounded-tl-sm"
                )}>
                  {msg.type === 'image' || msg.imageUrl ? (
                    <div className="space-y-2">
                      {msg.content && <p>{msg.content}</p>}
                      <img src={msg.imageUrl || msg.content} alt="Shared image" className="rounded-lg max-w-full h-auto max-h-48 object-cover" />
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>
                {currentUser.role === 'admin' && (
                  <button onClick={() => onDeleteMessage(msg.id)} className="text-[10px] text-red-500 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-inherit bg-black/5 dark:bg-white/5">
        {showImageInput && (
          <div className="mb-2 flex gap-2">
            <input 
              type="url" 
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="Image URL..."
              className={cn("flex-1 px-3 py-1.5 rounded-lg border outline-none text-[12px]", theme === 'dark' ? 'bg-[#202124] border-[#5f6368]' : 'bg-white border-[#dadce0]')}
            />
            <button type="button" onClick={() => setShowImageInput(false)} className="px-2 text-xs opacity-60 hover:opacity-100">Cancel</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowImageInput(!showImageInput)}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-60 hover:opacity-100"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className={cn("flex-1 px-4 py-2 rounded-full border outline-none text-[13px]", theme === 'dark' ? 'bg-[#202124] border-[#5f6368]' : 'bg-white border-[#dadce0]')}
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() && !imageUrl.trim()}
            className="p-2 rounded-full bg-[#1a73e8] text-white hover:bg-[#1b66c9] transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Admin Announcements ---
export function AdminAnnouncements({ t, announcements, cardClass, theme, onAddAnnouncement, onDeleteAnnouncement }: any) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onAddAnnouncement({ title, content });
    setTitle('');
    setContent('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className={cn("rounded-xl border p-5 lg:col-span-1 h-max", cardClass)}>
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4"/> New Announcement</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required 
              className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px]", theme === 'dark' ? 'bg-[#202124] border-[#5f6368]' : 'bg-white border-[#dadce0]')} 
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">Content</label>
            <textarea 
              value={content} 
              onChange={e => setContent(e.target.value)} 
              required 
              rows={4}
              className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px] resize-none", theme === 'dark' ? 'bg-[#202124] border-[#5f6368]' : 'bg-white border-[#dadce0]')} 
            />
          </div>
          <button type="submit" className="w-full py-2 rounded-lg bg-[#1a73e8] text-white text-[13px] font-medium hover:bg-[#1b66c9] transition-colors">
            Post Announcement
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {announcements.map((a: any) => (
          <div key={a.id} className={cn("rounded-xl border p-5 relative group", cardClass)}>
            <button 
              onClick={() => onDeleteAnnouncement(a.id)}
              className="absolute top-4 right-4 p-1.5 rounded-md bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity dark:bg-red-900/20 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-[#1a73e8]" />
              <h4 className="font-semibold text-[15px]">{a.title}</h4>
            </div>
            <p className="text-[13px] opacity-80 whitespace-pre-wrap mb-3">{a.content}</p>
            <div className="flex items-center gap-2 text-[11px] opacity-50 font-medium">
              <span>{a.author}</span>
              <span>•</span>
              <span>{new Date(a.timestamp).toLocaleString()}</span>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-10 opacity-50 text-[13px]">No announcements yet.</div>
        )}
      </div>
    </div>
  );
}

// --- Recommendations (ป้ายยา) ---
export function Recommendations({ t, recommendations, currentUser, cardClass, theme, onAddRecommendation, onDeleteRecommendation }: any) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'novel' | 'webtoon'>('novel');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [link, setLink] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onAddRecommendation({ type, title, description, imageUrl, link });
    setShowForm(false);
    setTitle('');
    setDescription('');
    setImageUrl('');
    setLink('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#1a73e8]" /> 
          ป้ายยานิยาย & เว็บตูน
        </h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-[#1a73e8] text-white text-[13px] font-medium hover:bg-[#1b66c9] transition-colors flex items-center gap-2"
        >
          {showForm ? 'Cancel' : <><Plus className="w-4 h-4"/> แนะนำเรื่องใหม่</>}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className={cn("p-5 rounded-xl border mb-6", cardClass)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">ประเภท</label>
                  <select 
                    value={type} 
                    onChange={(e: any) => setType(e.target.value)}
                    className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px]", theme === 'dark' ? 'bg-[#202124] border-[#5f6368]' : 'bg-white border-[#dadce0]')}
                  >
                    <option value="novel">นิยาย (Novel)</option>
                    <option value="webtoon">เว็บตูน (Webtoon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">ชื่อเรื่อง</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    required 
                    className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px]", theme === 'dark' ? 'bg-[#202124] border-[#5f6368]' : 'bg-white border-[#dadce0]')} 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">รีวิว / ป้ายยา</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    required 
                    rows={3}
                    className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px] resize-none", theme === 'dark' ? 'bg-[#202124] border-[#5f6368]' : 'bg-white border-[#dadce0]')} 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">URL รูปภาพ (ถ้ามี)</label>
                  <input 
                    type="url" 
                    value={imageUrl} 
                    onChange={e => setImageUrl(e.target.value)} 
                    placeholder="https://..."
                    className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px]", theme === 'dark' ? 'bg-[#202124] border-[#5f6368]' : 'bg-white border-[#dadce0]')} 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1.5 opacity-60 uppercase">ลิงก์อ่าน (ถ้ามี)</label>
                  <input 
                    type="url" 
                    value={link} 
                    onChange={e => setLink(e.target.value)} 
                    placeholder="https://..."
                    className={cn("w-full px-3 py-2 rounded-lg border outline-none text-[13px]", theme === 'dark' ? 'bg-[#202124] border-[#5f6368]' : 'bg-white border-[#dadce0]')} 
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="submit" className="px-6 py-2 rounded-lg bg-[#1a73e8] text-white text-[13px] font-medium hover:bg-[#1b66c9] transition-colors">
                  โพสต์ป้ายยา
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {recommendations.map((rec: any) => (
          <div key={rec.id} className={cn("rounded-xl border overflow-hidden flex flex-col", cardClass)}>
            {rec.imageUrl && (
              <div className="h-48 overflow-hidden bg-black/5 dark:bg-white/5">
                <img src={rec.imageUrl} alt={rec.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider mb-2", 
                    rec.type === 'novel' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  )}>
                    {rec.type === 'novel' ? 'Novel' : 'Webtoon'}
                  </span>
                  <h3 className="font-bold text-[16px] leading-tight">{rec.title}</h3>
                </div>
                {(currentUser.role === 'admin' || currentUser.id === rec.userId) && (
                  <button onClick={() => onDeleteRecommendation(rec.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[13px] opacity-80 whitespace-pre-wrap flex-1 mb-4">{rec.description}</p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-inherit">
                <div className="flex items-center gap-2">
                  <img src={rec.userAvatar} alt="" className="w-6 h-6 rounded-full bg-black/10" />
                  <div className="text-[11px]">
                    <p className="font-medium">{rec.userName}</p>
                    <p className="opacity-50">{new Date(rec.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                {rec.link && (
                  <a href={rec.link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-[#1a73e8]/10 text-[#1a73e8] hover:bg-[#1a73e8]/20 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        {recommendations.length === 0 && (
          <div className="col-span-full text-center py-12 opacity-50 text-[14px]">
            ยังไม่มีการป้ายยา มารีวิวเรื่องแรกกันเถอะ!
          </div>
        )}
      </div>
    </div>
  );
}
