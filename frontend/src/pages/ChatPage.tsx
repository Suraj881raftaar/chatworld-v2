import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRooms } from '../hooks/useRooms';
import { useMessages } from '../hooks/useMessages';
import { useWebSocket } from '../hooks/useWebSocket';
import { ThemeToggle } from '../components/ThemeToggle';
import { authService } from '../services/authService';
import { 
  LogOut, Hash, Plus, Send, Paperclip, 
  Info, Users, User, ArrowLeft, Loader2, Sparkles, FileText 
} from 'lucide-react';

export function ChatPage() {
  const { user, clearAuth } = useAuthStore();
  const { rooms, createRoom, isLoading: isLoadingRooms } = useRooms();
  
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'sidebar' | 'chat'>('sidebar'); // Mobile navigation helper
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);

  const activeRoom = rooms.find((r: any) => r.id === selectedRoomId);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Queries & Socket Hooks
  const { 
    data: messagesData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: isLoadingMessages,
    uploadFile,
    isUploading
  } = useMessages(selectedRoomId);

  const { 
    isConnected, 
    typingUsers, 
    sendMessage, 
    sendTypingStatus 
  } = useWebSocket(selectedRoomId);

  // Flatten infinite scroll messages pages: [Page 1 [msg1, msg2], Page 2 [msg3, msg4]] -> [msg1, msg2, msg3, msg4]
  const messagesList = messagesData ? messagesData.pages.flatMap((page: any) => page) : [];

  // Scroll to bottom on connection or new message arriving
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesList.length, isConnected]);

  // Handle infinite scroll trigger when scrolling to the top
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop } = chatContainerRef.current;
      if (scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
        // Fetch older messages
        fetchNextPage();
      }
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendMessage(messageText, 'text');
    setMessageText('');
    
    // Stop typing status
    sendTypingStatus(false);
    setIsTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }

    // Debounce to stop typing status after 2 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
      setIsTyping(false);
    }, 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await uploadFile({ file });
      const fileUrl = data.file_url;
      const isImg = file.type.startsWith('image/');
      
      // Send attachment message over WS
      sendMessage(
        `Sent an attachment: ${file.name}`, 
        isImg ? 'image' : 'file', 
        fileUrl
      );
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const newRoom = await createRoom({
        name: newRoomName,
        description: newRoomDesc,
        is_private: newRoomPrivate
      });
      setSelectedRoomId(newRoom.id);
      setIsCreateModalOpen(false);
      setNewRoomName('');
      setNewRoomDesc('');
      setNewRoomPrivate(false);
      setActiveTab('chat');
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      clearAuth();
    }
  };

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden transition-colors duration-300">
      
      {/* 1. LEFT PANEL: SIDEBAR (Desktop: Permanent, Mobile: Conditional) */}
      <aside className={`h-full w-full lg:w-80 flex flex-col border-r border-card-border bg-card/40 backdrop-blur-md ${activeTab === 'sidebar' ? 'flex' : 'hidden lg:flex'}`}>
        
        {/* User profile & Settings header */}
        <header className="p-4 border-b border-card-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold">
              {user?.username[0].toUpperCase()}
            </div>
            <div>
              <span className="block text-sm font-semibold truncate max-w-[120px]">{user?.username}</span>
              <span className="block text-xs text-muted truncate max-w-[120px]">{user?.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-card-border/50 text-muted hover:text-error transition-colors focus-ring"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Channels listing area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase tracking-wider">
            <span>Rooms / Channels</span>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="p-1 rounded-md hover:bg-card-border hover:text-foreground transition-colors focus-ring cursor-pointer"
              aria-label="Create Room"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {isLoadingRooms ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <nav className="space-y-1" aria-label="Room navigation list">
              {rooms.map((room: any) => (
                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setActiveTab('chat');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-ring text-left cursor-pointer ${
                    selectedRoomId === room.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-card-border/50 text-muted hover:text-foreground'
                  }`}
                >
                  <Hash className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{room.name}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </aside>

      {/* 2. MIDDLE PANEL: ACTIVE CHAT VIEW (Desktop: Shared, Mobile: Conditional) */}
      <section className={`h-full flex-1 flex flex-col bg-background/50 relative ${activeTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
        {activeRoom ? (
          <>
            {/* Header info */}
            <header className="p-4 border-b border-card-border flex items-center justify-between bg-card/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('sidebar')}
                  className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-card-border/50 text-muted hover:text-foreground focus-ring"
                  aria-label="Back to rooms list"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-base font-display font-semibold flex items-center gap-1.5">
                    <Hash className="h-4 w-4 text-primary" />
                    {activeRoom.name}
                  </h2>
                  <p className="text-xs text-muted truncate max-w-[200px] sm:max-w-md">
                    {activeRoom.description || 'No description provided.'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-success' : 'bg-warning animate-pulse'}`} />
                <span className="text-xs text-muted mr-3">{isConnected ? 'connected' : 'connecting'}</span>
                <button
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className={`p-2 rounded-lg hover:bg-card-border/50 transition-colors focus-ring cursor-pointer ${showInfoPanel ? 'text-primary' : 'text-muted'}`}
                  aria-label="Room Information"
                >
                  <Info className="h-5 w-5" />
                </button>
              </div>
            </header>

            {/* Chat history logs */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {isFetchingNextPage && (
                <div className="flex justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}

              {isLoadingMessages ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                messagesList.map((msg: any) => {
                  const isSelf = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-xs text-muted mb-1 px-1">
                        {msg.sender_name || 'User'}
                      </div>
                      
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                        isSelf 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-card border border-card-border text-foreground rounded-tl-none'
                      }`}>
                        {msg.message_type === 'image' && msg.file_url ? (
                          <div className="space-y-2">
                            <img
                              src={msg.file_url.startsWith('/') ? `http://localhost:8000${msg.file_url}` : msg.file_url}
                              alt="Uploaded Attachment"
                              className="max-h-60 rounded-lg object-contain cursor-pointer"
                            />
                            <p className="text-xs opacity-90">{msg.content}</p>
                          </div>
                        ) : msg.message_type === 'file' && msg.file_url ? (
                          <a
                            href={msg.file_url.startsWith('/') ? `http://localhost:8000${msg.file_url}` : msg.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 font-medium hover:underline text-xs"
                          >
                            <FileText className="h-4 w-4" />
                            {msg.content || 'Download Attachment'}
                          </a>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted mt-0.5 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              
              <div ref={messageEndRef} />
            </div>

            {/* Typing list indicator */}
            {Object.keys(typingUsers).length > 0 && (
              <div className="px-4 py-1.5 text-xs text-muted italic flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>
                  {Object.values(typingUsers).join(', ')}{' '}
                  {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}

            {/* Footer message editor input */}
            <footer className="p-4 border-t border-card-border bg-card/5 backdrop-blur-md">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-3 rounded-lg border border-card-border bg-card-border/10 text-muted hover:text-foreground transition-colors focus-ring cursor-pointer"
                  aria-label="Attach file"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                />

                <input
                  type="text"
                  value={messageText}
                  onChange={handleInputChange}
                  placeholder="Type your message here..."
                  className="flex-1 py-3 px-4 rounded-lg border border-card-border bg-card-border/20 text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm focus-ring"
                />

                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="p-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150 cursor-pointer focus-ring"
                  aria-label="Send Message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card/5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4 animate-bounce">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">Welcome to Chat World v2</h2>
            <p className="text-muted text-sm mt-2 max-w-sm">
              Select an existing channel from the sidebar list or create your own to begin messaging.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-6 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all duration-150 focus-ring cursor-pointer flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Room
            </button>
          </div>
        )}
      </section>

      {/* 3. RIGHT PANEL: ROOM INFORMATION (Desktop: Toggleable info cards) */}
      {activeRoom && showInfoPanel && (
        <aside className="h-full w-80 border-l border-card-border bg-card/30 backdrop-blur-md p-6 space-y-6 hidden xl:block">
          <div>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Info className="h-4 w-4" />
              Room Description
            </h3>
            <p className="text-sm text-foreground mt-2 font-medium">
              {activeRoom.description || 'No description provided.'}
            </p>
          </div>
          
          <hr className="border-card-border" />
          
          <div>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Users className="h-4 w-4" />
              Active Subscriptions
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-7 w-7 rounded-full bg-card-border flex items-center justify-center text-xs">
                  <User className="h-4 w-4" />
                </div>
                <span className="font-medium text-foreground">Members listing...</span>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* --- CREATE CHANNEL MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel shadow-2xl relative">
            <h2 className="text-xl font-display font-bold text-foreground mb-4">Create New Channel</h2>
            
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label htmlFor="modal-name" className="block text-sm font-medium text-foreground mb-2">
                  Channel Name
                </label>
                <input
                  id="modal-name"
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. general"
                  className="block w-full px-4 py-2.5 rounded-lg border border-card-border bg-card-border/20 text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm focus-ring"
                />
              </div>

              <div>
                <label htmlFor="modal-desc" className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  id="modal-desc"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="Topic of conversation..."
                  className="block w-full px-4 py-2.5 rounded-lg border border-card-border bg-card-border/20 text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm focus-ring h-20 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="modal-private"
                  type="checkbox"
                  checked={newRoomPrivate}
                  onChange={(e) => setNewRoomPrivate(e.target.checked)}
                  className="h-4 w-4 accent-primary rounded border-card-border bg-card-border/20 focus-ring"
                />
                <label htmlFor="modal-private" className="text-sm font-medium text-foreground">
                  Make Private (Invite Only)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-card-border bg-card-border/10 text-foreground hover:bg-card-border/30 text-sm font-semibold transition-colors cursor-pointer focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newRoomName.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150 cursor-pointer focus-ring"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
