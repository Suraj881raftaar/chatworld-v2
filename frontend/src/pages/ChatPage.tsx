import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRooms } from '../hooks/useRooms';
import { useMessages } from '../hooks/useMessages';
import { useWebSocket } from '../hooks/useWebSocket';
import { ThemeToggle } from '../components/ThemeToggle';
import { authService } from '../services/authService';
import { 
  LogOut, Hash, Plus, Send, Paperclip, 
  Info, ArrowLeft, Loader2, Sparkles, FileText,
  Compass, Copy, Check, Lock, Globe, Trash2, UserMinus,
  Search, X, Maximize2, Shield, Camera, Settings
} from 'lucide-react';

const QUICK_EMOJIS = ['❤️', '👍', '😂', '🔥', '🚀', '🎉', '⚡'];

const getFileUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl) {
    const base = apiUrl.replace(/\/api\/v1\/?$/, '');
    return `${base}${url}`;
  }
  return url;
};

export function ChatPage() {
  const { user, clearAuth, updateUser } = useAuthStore();
  const { 
    rooms, 
    publicRooms, 
    createRoom, 
    joinRoom, 
    leaveRoom,
    deleteRoom,
    isLoading: isLoadingRooms,
    isLoadingPublic,
    refetchPublic
  } = useRooms();
  
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'sidebar' | 'chat'>('sidebar');
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Search & Lightbox & User Profile Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any | null>(null);
  
  // Profile Settings Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileStatusMsg, setProfileStatusMsg] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDiscoverModalOpen, setIsDiscoverModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isDeleteRoomModalOpen, setIsDeleteRoomModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<{ id: string; name: string } | null>(null);

  const [joinInputId, setJoinInputId] = useState('');
  const [joinError, setJoinError] = useState('');

  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);

  const activeRoom = rooms.find((r: any) => r.id === selectedRoomId);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Sync profile modal fields when profile modal opens
  useEffect(() => {
    if (isProfileModalOpen && user) {
      setProfileAvatarUrl(user.avatar_url || '');
      setProfileBio((user as any).bio || '');
      setProfileStatusMsg(user.status_message || '');
    }
  }, [isProfileModalOpen, user]);

  // Auto-select first room when rooms list arrives
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  // Check URL query parameters for ?room=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomIdParam = params.get('room');
    if (roomIdParam) {
      handleJoinDirect(roomIdParam);
    }
  }, []);

  // Queries & Socket Hooks
  const { 
    data: messagesData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: isLoadingMessages,
    uploadFile,
    deleteMessage,
    isUploading
  } = useMessages(selectedRoomId);

  const { 
    isConnected, 
    typingUsers, 
    sendMessage, 
    sendTypingStatus,
    sendDeleteMessage,
    sendToggleReaction
  } = useWebSocket(selectedRoomId);

  // Flatten infinite scroll messages pages
  const messagesList = messagesData ? messagesData.pages.flatMap((page: any) => page) : [];

  // Filter messages by search term if active
  const filteredMessages = searchQuery.trim()
    ? messagesList.filter((m: any) => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messagesList;

  // Scroll to bottom on connection or new message arriving
  useEffect(() => {
    if (messageEndRef.current && !searchQuery) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesList.length, isConnected, searchQuery]);

  // Handle infinite scroll trigger when scrolling to the top
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop } = chatContainerRef.current;
      if (scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendMessage(messageText, 'text');
    setMessageText('');
    
    sendTypingStatus(false);
    setIsTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }

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
      
      sendMessage(
        `Attachment: ${file.name}`, 
        isImg ? 'image' : 'file', 
        fileUrl
      );
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const data = await uploadFile({ file });
      setProfileAvatarUrl(data.file_url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      const updatedUser = await authService.updateProfile({
        avatar_url: profileAvatarUrl,
        bio: profileBio,
        status_message: profileStatusMsg
      });
      updateUser(updatedUser);
      setIsProfileModalOpen(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      sendDeleteMessage(messageId);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleToggleEmojiReaction = (messageId: string, emoji: string) => {
    sendToggleReaction(messageId, emoji);
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

  const handleConfirmDeleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      await deleteRoom(roomToDelete.id);
      if (selectedRoomId === roomToDelete.id) {
        setSelectedRoomId('');
        setActiveTab('sidebar');
      }
      setIsDeleteRoomModalOpen(false);
      setRoomToDelete(null);
    } catch (err) {
      console.error('Failed to delete room:', err);
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    try {
      await leaveRoom(roomId);
      if (selectedRoomId === roomId) {
        setSelectedRoomId('');
        setActiveTab('sidebar');
      }
    } catch (err) {
      console.error('Failed to leave room:', err);
    }
  };

  const handleJoinDirect = async (roomId: string) => {
    try {
      setJoinError('');
      const room = await joinRoom(roomId);
      setSelectedRoomId(room.id || roomId);
      setIsDiscoverModalOpen(false);
      setIsJoinModalOpen(false);
      setJoinInputId('');
      setActiveTab('chat');
    } catch (err: any) {
      setJoinError(err.response?.data?.detail || 'Failed to join room. Please check the Room ID.');
    }
  };

  const handleCopyRoomId = () => {
    if (!selectedRoomId) return;
    navigator.clipboard.writeText(selectedRoomId);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
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

  const isCurrentRoomOwner = activeRoom?.created_by === user?.id || activeRoom?.role === 'owner';

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden transition-colors duration-300 relative">
      
      {/* Ambient background glow mesh spheres */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* 1. LEFT PANEL: SIDEBAR */}
      <aside className={`h-full w-full lg:w-80 flex flex-col border-r border-card-border/60 bg-card/40 backdrop-blur-xl relative z-10 ${activeTab === 'sidebar' ? 'flex' : 'hidden lg:flex'}`}>
        
        {/* User profile & Settings header */}
        <header className="p-4 border-b border-card-border flex items-center justify-between">
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {user?.avatar_url ? (
              <img
                src={getFileUrl(user.avatar_url)}
                alt="Profile Avatar"
                className="h-10 w-10 rounded-xl object-cover shadow-md border border-primary/30 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md neon-glow group-hover:scale-105 transition-transform">
                {user?.username[0].toUpperCase()}
              </div>
            )}

            <div>
              <span className="block text-sm font-semibold truncate max-w-[120px] group-hover:text-primary transition-colors">{user?.username}</span>
              <span className="block text-xs text-muted truncate max-w-[120px]">{user?.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-2 rounded-xl border border-card-border bg-card-border/10 hover:bg-card-border/30 text-muted hover:text-foreground focus-ring transition-all cursor-pointer"
              title="Edit Profile & Photo"
            >
              <Settings className="h-4 w-4" />
            </button>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl border border-card-border bg-card-border/10 hover:bg-error/20 text-muted hover:text-error transition-all focus-ring cursor-pointer"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Channels action header */}
        <div className="p-4 border-b border-card-border/50 space-y-2">
          <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase tracking-wider">
            <span>Your Channels ({rooms.length})</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  refetchPublic();
                  setIsDiscoverModalOpen(true);
                }}
                className="p-1.5 rounded-md hover:bg-card-border text-muted hover:text-foreground transition-colors focus-ring cursor-pointer flex items-center gap-1 text-xs font-normal normal-case"
                title="Discover Public Rooms"
              >
                <Compass className="h-3.5 w-3.5 text-primary" />
                <span>Explore</span>
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="p-1.5 rounded-md hover:bg-card-border text-muted hover:text-foreground transition-colors focus-ring cursor-pointer"
                title="Create Room"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="w-full py-2 px-3 rounded-lg border border-dashed border-card-border hover:border-primary/50 text-xs font-medium text-muted hover:text-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Join Room via Code / ID</span>
          </button>
        </div>

        {/* Channels listing area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {isLoadingRooms ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-xs text-muted">You haven't joined any rooms yet.</p>
              <button
                onClick={() => {
                  refetchPublic();
                  setIsDiscoverModalOpen(true);
                }}
                className="mt-3 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Compass className="h-3.5 w-3.5" />
                Browse Public Rooms
              </button>
            </div>
          ) : (
            <nav className="space-y-1" aria-label="Room navigation list">
              {rooms.map((room: any) => {
                const isOwner = room.created_by === user?.id || room.role === 'owner';
                return (
                  <div
                    key={room.id}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      selectedRoomId === room.id
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'hover:bg-card-border/50 text-muted hover:text-foreground'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedRoomId(room.id);
                        setActiveTab('chat');
                        setSearchQuery('');
                      }}
                      className="flex-1 flex items-center gap-2.5 truncate text-left cursor-pointer py-1"
                    >
                      {room.is_private ? (
                        <Lock className="h-4 w-4 flex-shrink-0 opacity-80" />
                      ) : (
                        <Hash className="h-4 w-4 flex-shrink-0 opacity-80" />
                      )}
                      <span className="truncate">{room.name}</span>
                    </button>

                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      {isOwner ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoomToDelete({ id: room.id, name: room.name });
                            setIsDeleteRoomModalOpen(true);
                          }}
                          className="p-1 rounded hover:bg-error/20 hover:text-error transition-colors cursor-pointer"
                          title="Delete Channel"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeaveRoom(room.id);
                          }}
                          className="p-1 rounded hover:bg-warning/20 hover:text-warning transition-colors cursor-pointer"
                          title="Leave Channel"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </nav>
          )}
        </div>
      </aside>

      {/* 2. MIDDLE PANEL: ACTIVE CHAT VIEW */}
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
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-display font-semibold flex items-center gap-1.5">
                      <Hash className="h-4 w-4 text-primary" />
                      {activeRoom.name}
                    </h2>
                    <button
                      onClick={handleCopyRoomId}
                      className="p-1 rounded hover:bg-card-border/50 text-muted hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 text-xs"
                      title="Copy Room ID to invite friends"
                    >
                      {copiedToast ? (
                        <span className="text-success flex items-center gap-1 text-[11px] font-semibold">
                          <Check className="h-3 w-3" /> Copied ID!
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-muted">
                          <Copy className="h-3 w-3" /> Share Code
                        </span>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted truncate max-w-[200px] sm:max-w-md">
                    {activeRoom.description || 'No description provided.'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Search Toggle Button */}
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className={`p-2 rounded-lg hover:bg-card-border/50 transition-colors focus-ring cursor-pointer ${isSearchOpen ? 'text-primary' : 'text-muted'}`}
                  title="Search Messages"
                >
                  <Search className="h-4 w-4" />
                </button>

                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-success' : 'bg-warning animate-pulse'}`} />
                <span className="text-xs text-muted mr-3 hidden sm:inline">{isConnected ? 'connected' : 'connecting'}</span>
                
                {isCurrentRoomOwner ? (
                  <button
                    onClick={() => {
                      setRoomToDelete({ id: activeRoom.id, name: activeRoom.name });
                      setIsDeleteRoomModalOpen(true);
                    }}
                    className="p-2 rounded-lg hover:bg-error/20 text-muted hover:text-error transition-colors cursor-pointer"
                    title="Delete Channel"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleLeaveRoom(activeRoom.id)}
                    className="p-2 rounded-lg hover:bg-warning/20 text-muted hover:text-warning transition-colors cursor-pointer"
                    title="Leave Channel"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className={`p-2 rounded-lg hover:bg-card-border/50 transition-colors focus-ring cursor-pointer ${showInfoPanel ? 'text-primary' : 'text-muted'}`}
                  aria-label="Room Information"
                >
                  <Info className="h-5 w-5" />
                </button>
              </div>
            </header>

            {/* In-Chat Message Search Bar */}
            {isSearchOpen && (
              <div className="p-3 bg-card/30 border-b border-card-border flex items-center gap-2 transition-all">
                <Search className="h-4 w-4 text-primary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages in this channel..."
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted/60"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-xs text-muted hover:text-foreground">
                    Clear
                  </button>
                )}
                <button onClick={() => setIsSearchOpen(false)} className="p-1 rounded text-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

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
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Sparkles className="h-8 w-8 text-primary/40 mb-2" />
                  <p className="text-sm text-muted">
                    {searchQuery ? `No messages found matching "${searchQuery}"` : 'No messages yet. Send a message to start the conversation!'}
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg: any) => {
                  const isSelf = msg.sender_id === user?.id;
                  const canDeleteMessage = isSelf || isCurrentRoomOwner;
                  const reactions = msg.reactions || [];

                  return (
                    <div
                      key={msg.id || `${msg.sender_id}-${msg.created_at}`}
                      className={`group flex items-start gap-2.5 ${isSelf ? 'flex-row-reverse' : 'flex-row'} relative`}
                    >
                      {/* User Avatar */}
                      <div 
                        onClick={() => setSelectedProfileUser({ id: msg.sender_id, username: msg.sender_name, avatar_url: msg.sender_avatar })}
                        className="cursor-pointer group/avatar flex-shrink-0"
                      >
                        {msg.sender_avatar ? (
                          <img
                            src={getFileUrl(msg.sender_avatar)}
                            alt="Avatar"
                            className="h-8 w-8 rounded-lg object-cover shadow-sm group-hover/avatar:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-xs font-bold shadow-sm group-hover/avatar:scale-105 transition-transform">
                            {msg.sender_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>

                      <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        <div className="text-[11px] text-muted mb-1 px-1 font-medium flex items-center gap-2">
                          <button
                            onClick={() => setSelectedProfileUser({ id: msg.sender_id, username: msg.sender_name, avatar_url: msg.sender_avatar })}
                            className="hover:text-primary hover:underline transition-colors cursor-pointer"
                          >
                            {msg.sender_name || 'User'}
                          </button>
                        </div>
                        
                        <div className="relative group">
                          {/* Hover Action Bar */}
                          <div className={`absolute -top-7 ${isSelf ? 'left-0' : 'right-0'} opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-card border border-card-border p-1 rounded-lg shadow-lg z-10 transition-opacity`}>
                            {QUICK_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleEmojiReaction(msg.id, emoji)}
                                className="hover:scale-125 transition-transform text-xs p-0.5 cursor-pointer"
                                title={`React ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            {canDeleteMessage && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1 rounded hover:bg-error/20 text-muted hover:text-error transition-all cursor-pointer ml-1"
                                title="Delete Message"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {/* Message content box */}
                          <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                            isSelf 
                              ? 'bg-primary text-primary-foreground rounded-tr-none' 
                              : 'bg-card border border-card-border text-foreground rounded-tl-none'
                          }`}>
                            {msg.message_type === 'image' && msg.file_url ? (
                              <div className="space-y-2">
                                <div className="relative group/img">
                                  <img
                                    src={getFileUrl(msg.file_url)}
                                    alt="Attachment"
                                    onClick={() => setPreviewImageUrl(getFileUrl(msg.file_url))}
                                    className="max-h-64 rounded-lg object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                  />
                                  <button
                                    onClick={() => setPreviewImageUrl(getFileUrl(msg.file_url))}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                                    title="Enlarge Image"
                                  >
                                    <Maximize2 className="h-4 w-4" />
                                  </button>
                                </div>
                                {msg.content && msg.content !== 'Attachment' && (
                                  <p className="text-xs opacity-90">{msg.content}</p>
                                )}
                              </div>
                            ) : msg.message_type === 'file' && msg.file_url ? (
                              <a
                                href={getFileUrl(msg.file_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 font-medium hover:underline text-xs"
                              >
                                <FileText className="h-4 w-4 flex-shrink-0" />
                                <span className="break-all">{msg.content || 'Download Attachment'}</span>
                              </a>
                            ) : (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}
                          </div>

                          {/* Emoji Reactions List Bar */}
                          {reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5 px-1">
                              {reactions.map((r: any) => {
                                const hasReacted = r.user_ids?.includes(user?.id);
                                return (
                                  <button
                                    key={r.emoji}
                                    onClick={() => handleToggleEmojiReaction(msg.id, r.emoji)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                      hasReacted
                                        ? 'bg-primary/20 border-primary text-primary'
                                        : 'bg-card/60 border-card-border text-muted hover:border-foreground/30'
                                    }`}
                                  >
                                    <span>{r.emoji}</span>
                                    <span className="text-[10px]">{r.count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <span className="text-[10px] text-muted mt-0.5 px-1">
                          {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card/5 relative z-10">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 text-white flex items-center justify-center mb-6 shadow-2xl neon-glow animate-bounce">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-display font-bold text-foreground">Welcome to Chat World v2</h2>
            <p className="text-muted text-sm mt-2 max-w-sm">
              Explore public channels or create a new room to start chatting with friends.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => {
                  refetchPublic();
                  setIsDiscoverModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-lg border border-card-border bg-card-border/10 hover:bg-card-border/30 text-foreground font-semibold text-sm transition-all focus-ring cursor-pointer flex items-center gap-2"
              >
                <Compass className="h-4 w-4 text-primary" />
                Discover Public Channels
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all duration-150 focus-ring cursor-pointer flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Room
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. RIGHT PANEL: ROOM INFORMATION */}
      {activeRoom && showInfoPanel && (
        <aside className="h-full w-80 border-l border-card-border bg-card/30 backdrop-blur-md p-6 space-y-6 hidden xl:block">
          <div>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Info className="h-4 w-4" />
              Room Details
            </h3>
            <p className="text-sm text-foreground mt-2 font-medium">
              {activeRoom.description || 'No description provided.'}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Shareable Room ID
            </h3>
            <div className="flex items-center gap-2 bg-card-border/30 p-2 rounded-lg border border-card-border text-xs font-mono break-all">
              <span className="flex-1 truncate">{activeRoom.id}</span>
              <button
                onClick={handleCopyRoomId}
                className="p-1 rounded hover:bg-card-border text-muted hover:text-foreground cursor-pointer"
                title="Copy ID"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-card-border">
            {isCurrentRoomOwner ? (
              <button
                onClick={() => {
                  setRoomToDelete({ id: activeRoom.id, name: activeRoom.name });
                  setIsDeleteRoomModalOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-error/10 border border-error/30 text-error hover:bg-error/20 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Delete Channel Permanently
              </button>
            ) : (
              <button
                onClick={() => handleLeaveRoom(activeRoom.id)}
                className="w-full py-2.5 px-4 rounded-lg bg-warning/10 border border-warning/30 text-warning hover:bg-warning/20 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserMinus className="h-4 w-4" />
                Leave Channel
              </button>
            )}
          </div>
        </aside>
      )}

      {/* --- EDIT PROFILE & PHOTO MODAL --- */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md p-6 rounded-3xl glass-panel shadow-2xl relative border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Edit Profile & Photo
              </h2>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-muted hover:text-foreground text-sm cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Photo Upload Section */}
              <div className="flex flex-col items-center justify-center my-4">
                <div className="relative group/avatar cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  {profileAvatarUrl ? (
                    <img
                      src={getFileUrl(profileAvatarUrl)}
                      alt="Avatar Preview"
                      className="h-24 w-24 rounded-2xl object-cover border-2 border-primary shadow-xl"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 text-white font-bold text-3xl flex items-center justify-center shadow-xl neon-glow">
                      {user?.username?.[0]?.toUpperCase()}
                    </div>
                  )}

                  <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                    {isUploadingAvatar ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <Camera className="h-6 w-6" />
                        <span className="text-[10px] font-semibold mt-1">Change</span>
                      </>
                    )}
                  </div>
                </div>

                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {isUploadingAvatar ? 'Uploading...' : 'Upload Profile Photo'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Status Statement
                </label>
                <input
                  type="text"
                  value={profileStatusMsg}
                  onChange={(e) => setProfileStatusMsg(e.target.value)}
                  placeholder="e.g. Coding something awesome..."
                  className="block w-full px-4 py-2.5 rounded-xl border border-card-border bg-card-border/10 text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Bio / About Me
                </label>
                <textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="Tell others a bit about yourself..."
                  className="block w-full px-4 py-2.5 rounded-xl border border-card-border bg-card-border/10 text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm focus-ring h-20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-card-border bg-card-border/10 text-foreground hover:bg-card-border/30 text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile || isUploadingAvatar}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg neon-glow"
                >
                  {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DISCOVER PUBLIC CHANNELS MODAL --- */}
      {isDiscoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl glass-panel shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                Discover Public Channels
              </h2>
              <button
                onClick={() => setIsDiscoverModalOpen(false)}
                className="text-muted hover:text-foreground text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted mb-4">
              Browse public channels created on Chat World and join with one click.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoadingPublic ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : publicRooms.length === 0 ? (
                <div className="text-center py-8 text-muted text-sm">
                  No public rooms found. Create the first one!
                </div>
              ) : (
                publicRooms.map((room: any) => (
                  <div
                    key={room.id}
                    className="p-3.5 rounded-xl border border-card-border bg-card/20 hover:bg-card/40 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-primary" />
                        {room.name}
                      </h4>
                      <p className="text-xs text-muted truncate max-w-xs mt-0.5">
                        {room.description || 'No description'}
                      </p>
                    </div>

                    {room.is_member ? (
                      <button
                        onClick={() => {
                          setSelectedRoomId(room.id);
                          setIsDiscoverModalOpen(false);
                          setActiveTab('chat');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-card-border/50 text-foreground text-xs font-medium hover:bg-card-border cursor-pointer"
                      >
                        Open
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinDirect(room.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Join
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-card-border flex justify-end">
              <button
                onClick={() => setIsDiscoverModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-card-border bg-card-border/10 text-foreground hover:bg-card-border/30 text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- USER PROFILE MODAL --- */}
      {selectedProfileUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm p-6 rounded-3xl glass-panel shadow-2xl relative text-center border border-white/10">
            <button
              onClick={() => setSelectedProfileUser(null)}
              className="absolute top-4 right-4 text-muted hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {selectedProfileUser.avatar_url ? (
              <img
                src={getFileUrl(selectedProfileUser.avatar_url)}
                alt="Profile Avatar"
                className="h-24 w-24 rounded-2xl object-cover border-2 border-primary mx-auto mb-3 shadow-xl"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 text-white font-bold text-3xl flex items-center justify-center mx-auto mb-3 shadow-lg neon-glow">
                {selectedProfileUser.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}

            <h3 className="text-lg font-bold text-foreground flex items-center justify-center gap-1.5">
              {selectedProfileUser.username}
              {selectedProfileUser.role === 'admin' && (
                <span title="Admin User">
                  <Shield className="h-4 w-4 text-warning" />
                </span>
              )}
            </h3>

            <p className="text-xs text-muted mt-1">
              Member of Chat World v2
            </p>

            <div className="mt-4 p-3 rounded-xl bg-card-border/20 border border-card-border text-left space-y-2 text-xs">
              <div>
                <span className="text-muted block font-semibold">User Status</span>
                <span className="text-foreground flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-success"></span> Online
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedProfileUser(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 cursor-pointer shadow-md"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

      {/* --- IMAGE LIGHTBOX PREVIEW MODAL --- */}
      {previewImageUrl && (
        <div 
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] p-2">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-sm font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="h-6 w-6" /> Close
            </button>
            <img
              src={previewImageUrl}
              alt="Enlarged Preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* --- JOIN BY ROOM ID MODAL --- */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel shadow-2xl relative">
            <h2 className="text-xl font-display font-bold text-foreground mb-2">Join Channel via Code</h2>
            <p className="text-xs text-muted mb-4">Paste the Room ID shared by a friend to join the conversation.</p>

            {joinError && (
              <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs">
                {joinError}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleJoinDirect(joinInputId); }} className="space-y-4">
              <div>
                <label htmlFor="join-code" className="block text-sm font-medium text-foreground mb-2">
                  Room ID / Invite Code
                </label>
                <input
                  id="join-code"
                  type="text"
                  required
                  value={joinInputId}
                  onChange={(e) => setJoinInputId(e.target.value)}
                  placeholder="e.g. 5bee-df70-dded..."
                  className="block w-full px-4 py-2.5 rounded-lg border border-card-border bg-card-border/20 text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm focus-ring font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsJoinModalOpen(false); setJoinError(''); }}
                  className="px-4 py-2 rounded-lg border border-card-border bg-card-border/10 text-foreground hover:bg-card-border/30 text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!joinInputId.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
                >
                  Join Channel
                </button>
              </div>
            </form>
          </div>
        </div>
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

      {/* --- DELETE ROOM CONFIRMATION MODAL --- */}
      {isDeleteRoomModalOpen && roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel shadow-2xl relative">
            <h2 className="text-xl font-display font-bold text-foreground mb-2 flex items-center gap-2 text-error">
              <Trash2 className="h-5 w-5" />
              Delete Channel?
            </h2>
            <p className="text-sm text-muted mb-6">
              Are you sure you want to delete <strong className="text-foreground">#{roomToDelete.name}</strong>? All messages, attachments, and membership records will be permanently deleted. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsDeleteRoomModalOpen(false); setRoomToDelete(null); }}
                className="px-4 py-2 rounded-lg border border-card-border bg-card-border/10 text-foreground hover:bg-card-border/30 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRoom}
                className="px-4 py-2 rounded-lg bg-error text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
