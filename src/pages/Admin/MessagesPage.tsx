import React, { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { MailIcon, TrashIcon } from '../../components/Icons';
import ConfirmDialog from '../../components/ConfirmDialog';

const MessagesPage: React.FC = () => {
  const { userMessages, addUserMessage, deleteUserMessage } = useStore();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    messageId?: number;
  }>({ isOpen: false });

  // Filter messages according to search + read state
  const filteredMessages = useMemo(() => {
    return userMessages.filter(message => {
      const matchesSearch = !searchQuery || 
        message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.body.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRead = filterRead === 'all' ||
        (filterRead === 'read' && message.isRead) ||
        (filterRead === 'unread' && !message.isRead);
      
      return matchesSearch && matchesRead;
    });
  }, [userMessages, searchQuery, filterRead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    addUserMessage(subject.trim(), body.trim(), 'general');
    setSubject('');
    setBody('');
  };

  const handleDeleteClick = (messageId: number) => {
    setConfirmDialog({ isOpen: true, messageId });
  };

  const confirmDelete = () => {
    if (confirmDialog.messageId) {
      deleteUserMessage(confirmDialog.messageId);
    }
    setConfirmDialog({ isOpen: false });
  };

  return (
    <div className="space-y-10">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false })}
      />
      <section className="border-4 border-black bg-white p-6 space-y-4">
        <header className="border-b-2 border-dashed border-black/30 pb-3 flex items-center gap-3">
          <div className="w-12 h-12 border-4 border-black flex items-center justify-center bg-[#FFD700] text-black">
            <MailIcon className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-display uppercase text-black">Create Message</h2>
            <p className="text-xs font-semibold text-black/60">Deliver inbox updates to every user</p>
          </div>
        </header>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold text-sm mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border-2 border-black p-3 bg-white"
              placeholder="Weekly Deals Inside"
            />
          </div>
          <div>
            <label className="block font-bold text-sm mb-1">Message Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border-2 border-black p-3 bg-white min-h-[160px]"
              placeholder="Tell your community about sales, updates or events."
            />
          </div>
          <button
            type="submit"
            className="bg-[#FFD700] text-black font-bold py-3 px-6 border-4 border-black btn-pop w-full sm:w-auto"
          >
            Send to Inbox
          </button>
        </form>
      </section>

      <section className="border-4 border-black bg-white p-6 space-y-4">
        <header className="border-b-2 border-dashed border-black/30 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display uppercase text-black">Messages Log</h2>
            <p className="text-xs font-semibold text-black/60">Latest appears at the top</p>
          </div>
          <span className="text-sm font-bold text-black/60">
            {filteredMessages.length} of {userMessages.length} messages
          </span>
        </header>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block font-bold text-sm mb-2">Search Messages</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject or body..."
              className="w-full border-2 border-black p-2"
            />
          </div>
          <div>
            <label className="block font-bold text-sm mb-2">Filter by Status</label>
            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value as 'all' | 'read' | 'unread')}
              className="w-full border-2 border-black p-2 bg-white"
            >
              <option value="all">All Messages</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>
          </div>
        </div>

        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
          {filteredMessages.length ? (
            filteredMessages.map(message => (
              <div key={message.id} className={`border-2 border-black p-4 flex flex-col gap-2 ${
                message.isRead ? 'bg-gray-50' : 'bg-yellow-50'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs uppercase tracking-[0.3em] text-black/50">#{message.id}</p>
                      {!message.isRead && (
                        <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 uppercase">New</span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-black">{message.subject}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-black/60">{new Date(message.createdAt).toLocaleString()}</span>
                    <button
                      onClick={() => handleDeleteClick(message.id)}
                      className="w-10 h-10 flex items-center justify-center border-2 border-black bg-white hover:bg-red-500 hover:text-white transition-colors"
                      aria-label="Delete message"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-black/80 whitespace-pre-line">{message.body}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-black/30">
              <p className="text-lg text-black/70 mb-2">
                {searchQuery || filterRead !== 'all' 
                  ? 'No messages match your filters.' 
                  : 'No messages yet.'}
              </p>
              <p className="text-sm text-black/50">
                {searchQuery || filterRead !== 'all' 
                  ? 'Try adjusting your search or filters.' 
                  : 'Create your first announcement above.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MessagesPage;

