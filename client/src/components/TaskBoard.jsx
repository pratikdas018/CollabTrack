import { useState, useEffect, useRef, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { playUndoSound } from './soundUtils';

const TaskBoard = ({ tasks = [], projectId, onTaskUpdate, members = [], commits = [], isLoading = false }) => {
  const { user } = useAuth();
  const [columns, setColumns] = useState({ 'At Risk': [], todo: [], doing: [], done: [] });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTask, setExpandedTask] = useState(null);
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'comments'
  const [commentText, setCommentText] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [showEmptyColumns, setShowEmptyColumns] = useState(false);
  const [showLinkedOnly, setShowLinkedOnly] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  
  // Swipe Logic Refs
  const touchStartRef = useRef(null);
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  };

  const handleTouchEnd = (e, taskId, currentColumn) => {
    if (!touchStartRef.current) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchStartRef.current.x - touchEndX;
    const deltaY = touchStartRef.current.y - touchEndY;
    
    touchStartRef.current = null;

    // Ignore if vertical scroll is dominant
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (Math.abs(deltaX) > minSwipeDistance) {
      const direction = deltaX > 0 ? 'left' : 'right';
      handleSwipe(taskId, currentColumn, direction);
    }
  };

  const handleSwipe = (taskId, currentColumn, direction) => {
    const statusOrder = ['todo', 'doing', 'done'];
    let nextStatus = null;

    if (currentColumn === 'At Risk') {
      if (direction === 'right') nextStatus = 'todo';
    } else {
      const currentIndex = statusOrder.indexOf(currentColumn);
      if (currentIndex === -1) return;

      if (direction === 'right') {
        if (currentIndex < statusOrder.length - 1) nextStatus = statusOrder[currentIndex + 1];
      } else {
        if (currentIndex > 0) nextStatus = statusOrder[currentIndex - 1];
        else if (currentIndex === 0) nextStatus = 'At Risk';
      }
    }

    if (nextStatus) {
      const newColumns = { ...columns };
      const sourceList = [...newColumns[currentColumn]];
      const destList = [...newColumns[nextStatus]];
      
      const taskIndex = sourceList.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      const [movedTask] = sourceList.splice(taskIndex, 1);
      destList.push(movedTask);
      
      setColumns({
        ...newColumns,
        [currentColumn]: sourceList,
        [nextStatus]: destList
      });

      if (navigator.vibrate) navigator.vibrate(50);
      const statusLabels = { 'todo': 'To Do', 'doing': 'Doing', 'done': 'Done', 'At Risk': 'At Risk' };
      toast.success(`Moved to ${statusLabels[nextStatus]}`, {
        position: "bottom-center",
        autoClose: 1000,
        hideProgressBar: true
      });

      api.put(`/projects/${projectId}/tasks/${taskId}`, { status: nextStatus })
        .then(res => onTaskUpdate(res.data))
        .catch(err => {
          console.error("Swipe update failed", err);
          toast.error("Failed to update task status");
        });
    }
  };

  useEffect(() => {
    // Group tasks by status
    const newColumns = { 'At Risk': [], todo: [], doing: [], done: [] };
    
    let filteredTasks = tasks;

    if (memberFilter === 'mine') {
      filteredTasks = filteredTasks.filter(task => task.assignees?.some(a => a._id === user?._id));
    } else if (memberFilter !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.assignees?.some(a => a._id === memberFilter));
    }

    if (searchQuery) {
      filteredTasks = filteredTasks.filter(task => task.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (showLinkedOnly) {
      filteredTasks = filteredTasks.filter(task => task.linkedCommits && task.linkedCommits.length > 0);
    }

    filteredTasks.forEach(task => {
      if (newColumns[task.status]) {
        newColumns[task.status].push({
          id: task._id,
          readableId: task.readableId,
          linkedCommits: task.linkedCommits || [],
          content: task.title,
          assignees: task.assignees || [],
          history: task.history || [],
          comments: task.comments || [],
          deadline: task.deadline,
          deadlineColor: task.deadlineColor
        });
      }
    });
    setColumns(newColumns);
  }, [tasks, memberFilter, user, searchQuery, showLinkedOnly]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const res = await api.post(`/projects/${projectId}/tasks`, { title: newTaskTitle, deadline: newTaskDeadline });
      setNewTaskTitle('');
      setNewTaskDeadline('');
      onTaskUpdate(res.data); // Notify parent to refresh or add to list
    } catch (err) {
      if (err.response && err.response.status === 401) {
        alert('Session expired. Please log in again.');
        window.location.href = '/';
      } else {
        alert('Failed to add task');
      }
    }
  };

  const handleAssign = async (taskId, userId) => {
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}/assign`, { userId });
      onTaskUpdate(res.data);
    } catch (err) {
      alert('Failed to update assignment');
    }
  };

  const handlePostComment = async (e, taskId) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await api.post(`/projects/${projectId}/tasks/${taskId}/comments`, { text: commentText });
      setCommentText('');
      onTaskUpdate(res.data);
    } catch (err) {
      alert('Failed to post comment');
    }
  };

  const handleLinkCommit = async (taskId, commitUrl) => {
    try {
      const res = await api.post(`/projects/${projectId}/tasks/${taskId}/link-commit`, { commitUrl });
      onTaskUpdate(res.data);
      toast.success('Commit linked successfully');
    } catch (err) {
      if (err.response && err.response.status === 404 && !err.response.data?.msg) {
        toast.error('Feature not available (Endpoint 404). Please update server.');
      } else {
        toast.error(err.response?.data?.msg || 'Failed to link commit');
      }
    }
  };

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setCommentText(value);
    
    const cursor = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];
    
    if (lastWord.startsWith('@')) {
      setMentionQuery(lastWord.slice(1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleSelectMember = (username) => {
    const input = document.getElementById(`comment-input-${expandedTask}`);
    if (!input) return;
    
    const cursor = input.selectionStart;
    const textBeforeCursor = commentText.slice(0, cursor);
    const textAfterCursor = commentText.slice(cursor);
    
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    if (lastAtPos !== -1) {
      const newText = textBeforeCursor.slice(0, lastAtPos) + `@${username} ` + textAfterCursor;
      setCommentText(newText);
      setShowMentions(false);
      setTimeout(() => input.focus(), 0);
    }
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;

    const sourceItems = [...columns[sourceCol]];
    const destItems = [...columns[destCol]];
    const [removed] = sourceItems.splice(source.index, 1);

    if (sourceCol === destCol) {
      sourceItems.splice(destination.index, 0, removed);
      setColumns({ ...columns, [sourceCol]: sourceItems });
    } else {
      destItems.splice(destination.index, 0, removed);
      setColumns({
        ...columns,
        [sourceCol]: sourceItems,
        [destCol]: destItems
      });
    }
    
    // Call API to update status
    api.put(`/projects/${projectId}/tasks/${result.draggableId}`, {
      status: destCol
    }).catch(err => console.error("Failed to update task status", err));
  };

  const filteredMembers = members.filter(m => 
    m.user.username.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const getUnlinkedCommits = (task) => {
    const linkedUrls = new Set(task.linkedCommits?.map(c => c.url) || []);
    return commits.filter(c => !linkedUrls.has(c.url) && (
      c.message.toLowerCase().includes(linkSearch.toLowerCase()) || 
      c.committerName.toLowerCase().includes(linkSearch.toLowerCase())
    )).slice(0, 10);
  };

  const renderCommentText = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.match(/^@\w+$/)) {
        return <span key={index} className="text-blue-600 font-semibold">{part}</span>;
      }
      return part;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800/50 h-full relative z-10 animate-pulse">
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-8 w-10 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-2xl min-h-[400px] border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-white/20 dark:border-slate-800/50">
                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
                    <div className="space-y-2 mb-6">
                      <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded"></div>
                      <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                      <div className="flex gap-1">
                        <div className="h-6 w-6 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                        <div className="h-6 w-6 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800/50 h-full relative z-10 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold dark:text-white mr-2">Tasks</h2>
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800/50 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select 
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800/50 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          >
            <option value="all">All Tasks</option>
            <option value="mine">My Tasks</option>
            {members.map(m => (
              <option key={m.user._id} value={m.user._id}>{m.user.username}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={showEmptyColumns} 
              onChange={(e) => setShowEmptyColumns(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
            Show Empty Columns
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={showLinkedOnly} 
              onChange={(e) => setShowLinkedOnly(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
            Has Commits
          </label>
          {(searchQuery || memberFilter !== 'all' || showLinkedOnly) && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setMemberFilter('all');
                setShowLinkedOnly(false);
              }}
              className="text-sm text-red-500 hover:text-red-700 underline"
            >
              Clear Filters
            </button>
          )}
        </div>
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input 
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800/50 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            placeholder="New Task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <input 
            type="date"
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800/50 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={newTaskDeadline}
            onChange={(e) => setNewTaskDeadline(e.target.value)}
          />
          <button type="submit" className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-sm">+</button>
        </form>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className={`grid grid-cols-1 md:grid-cols-2 ${(!showEmptyColumns && columns['At Risk']?.length === 0) ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-4`}>
          {Object.entries(columns).map(([columnId, tasks]) => {
            if (!showEmptyColumns && columnId === 'At Risk' && tasks.length === 0) return null;
            return (
            <div key={columnId} className={`p-4 rounded-2xl min-h-[400px] border ${columnId === 'At Risk' ? 'bg-red-50/30 border-red-100 dark:bg-red-950/10 dark:border-red-900/20' : 'bg-slate-100/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800/30'} backdrop-blur-sm`}>
              <h3 className={`font-black text-xs uppercase tracking-widest mb-4 flex items-center justify-between ${columnId === 'At Risk' ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {columnId}
                <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-[10px]">{tasks.length}</span>
              </h3>
              <Droppable droppableId={columnId}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onTouchStart={(e) => {
                              provided.dragHandleProps?.onTouchStart?.(e);
                              handleTouchStart(e);
                            }}
                            onTouchEnd={(e) => {
                              provided.dragHandleProps?.onTouchEnd?.(e);
                              handleTouchEnd(e, task.id, columnId);
                            }}
                            className="bg-white dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-900 transition-all duration-300 hover:scale-[1.02] hover:shadow-md group"
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={columnId === 'done'}
                                onChange={(e) => {
                                  const newStatus = e.target.checked ? 'done' : 'todo';
                                  handleStatusChange(task.id, columnId, newStatus);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 dark:bg-slate-700 cursor-pointer"
                                title={columnId === 'done' ? "Mark as Undone" : "Mark as Done"}
                              />
                              <div className={`font-bold text-slate-800 dark:text-slate-100 leading-snug ${columnId === 'done' ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                                {task.readableId && <span className="text-xs text-gray-400 mr-1">#{task.readableId}</span>}
                                {task.content}
                              </div>
                            </div>
                            
                            {/* Assignees & Actions */}
                            <div className="mt-3">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Assigned to:</p>
                                <select
                                  className="text-[10px] uppercase font-bold border rounded bg-slate-100 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 px-1.5 py-0.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                  value={columnId}
                                  onChange={(e) => handleStatusChange(task.id, columnId, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  title="Change Status"
                                >
                                  {Object.keys(columns).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {task.assignees.length > 0 ? (
                                    <>
                                      <div className="flex -space-x-2 overflow-hidden">
                                        {task.assignees.map((u) => (
                                          <img 
                                            key={u._id}
                                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white"
                                            src={u.avatarUrl || `https://github.com/${u.username}.png`}
                                            alt={u.username}
                                            title={u.username}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-xs font-medium dark:text-gray-300 truncate max-w-[100px]">
                                        {task.assignees[0].username} {task.assignees.length > 1 && `+${task.assignees.length - 1}`}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">Unassigned</span>
                                  )}
                                </div>
                                
                                <select 
                                  className="text-xs border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 w-5"
                                  onChange={(e) => handleAssign(task.id, e.target.value)}
                                  value=""
                                  title="Assign Member"
                                >
                                  <option value="" disabled>+</option>
                                  {members.map(m => (
                                    <option key={m.user._id} value={m.user._id}>
                                      {m.user.username}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Last Commit Message */}
                            {task.linkedCommits && task.linkedCommits.length > 0 && (
                              <div className="mt-3 px-2 py-1.5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded border border-indigo-100 dark:border-indigo-900/30">
                                <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400">
                                  <img 
                                    src={(() => {
                                      const committer = task.linkedCommits[task.linkedCommits.length - 1].committerName;
                                      const member = members.find(m => m.user.username === committer);
                                      return member?.user?.avatarUrl || `https://github.com/${committer}.png`;
                                    })()}
                                    alt={task.linkedCommits[task.linkedCommits.length - 1].committerName}
                                    title={`Committed by ${task.linkedCommits[task.linkedCommits.length - 1].committerName}`}
                                    className="w-3.5 h-3.5 rounded-full border border-indigo-200 dark:border-indigo-800"
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                  <span className="text-xs">🔨</span>
                                  <a 
                                    href={task.linkedCommits[task.linkedCommits.length - 1].url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium truncate hover:underline"
                                    title={task.linkedCommits[task.linkedCommits.length - 1].message}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {task.linkedCommits[task.linkedCommits.length - 1].message || "Latest commit linked"}
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Footer: Deadline & History Toggle */}
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                              {task.deadline && (
                                <span className={`px-2 py-0.5 rounded border ${
                                  task.deadlineColor === 'red' ? 'bg-red-100 text-red-700 border-red-200' :
                                  task.deadlineColor === 'yellow' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                  'bg-green-100 text-green-700 border-green-200'
                                }`}>
                                  {new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                              {task.linkedCommits.length > 0 && (
                                <span className="text-xs text-purple-600 flex items-center gap-1 ml-2" title={`${task.linkedCommits.length} commits linked`}>
                                  🔗 {task.linkedCommits.length}
                                </span>
                              )}
                              <div className="flex gap-2 ml-auto">
                                <button 
                                  onClick={() => {
                                    if (expandedTask === task.id && activeTab === 'comments') {
                                      setExpandedTask(null);
                                    } else {
                                      setExpandedTask(task.id);
                                      setActiveTab('comments');
                                    }
                                  }}
                                  className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                                  title="Comments"
                                >
                                  💬 {task.comments.length}
                                </button>
                                <button 
                                  onClick={() => {
                                    if (expandedTask === task.id && activeTab === 'commits') {
                                      setExpandedTask(null);
                                    } else {
                                      setExpandedTask(task.id);
                                      setActiveTab('commits');
                                    }
                                  }}
                                  className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                  title="Link Commits"
                                >
                                  🔗
                                </button>
                                <button 
                                  onClick={() => {
                                    if (expandedTask === task.id && activeTab === 'history') {
                                      setExpandedTask(null);
                                    } else {
                                      setExpandedTask(task.id);
                                      setActiveTab('history');
                                    }
                                  }}
                                  className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                  title="History"
                                >
                                  🕒
                                </button>
                              </div>
                            </div>

                            {/* Expanded Section: History or Comments */}
                            {expandedTask === task.id && (
                              <div className="mt-2 bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs space-y-1 max-h-32 overflow-y-auto">
                                {activeTab === 'comments' && (
                                  <div className="space-y-2">
                                    {task.comments.map((c, i) => (
                                      <div key={i} className="bg-white dark:bg-gray-800 p-1 rounded border dark:border-gray-600">
                                        <div className="font-bold text-blue-600 dark:text-blue-400">{c.user?.username}</div>
                                        <div className="dark:text-gray-300">{renderCommentText(c.text)}</div>
                                      </div>
                                    ))}
                                    <form onSubmit={(e) => handlePostComment(e, task.id)} className="flex gap-1 mt-2 relative">
                                      {showMentions && filteredMembers.length > 0 && (
                                        <div className="absolute bottom-full left-0 bg-white dark:bg-gray-800 border dark:border-gray-600 shadow-lg rounded w-48 mb-1 z-10 max-h-40 overflow-y-auto">
                                          {filteredMembers.map(m => (
                                            <div 
                                              key={m.user._id} 
                                              className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2"
                                              onClick={() => handleSelectMember(m.user.username)}
                                            >
                                              <img src={m.user.avatarUrl || `https://github.com/${m.user.username}.png`} alt={m.user.username} className="w-6 h-6 rounded-full"/>
                                              <span className="text-sm font-medium dark:text-gray-200">{m.user.username}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <input 
                                        id={`comment-input-${task.id}`}
                                        className="flex-1 border rounded px-1 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                        placeholder="Write a comment... (@user to mention)"
                                        value={commentText}
                                        onChange={handleCommentChange}
                                        autoComplete="off"
                                      />
                                      <button type="submit" className="bg-blue-500 text-white px-2 rounded"></button>
                                    </form>
                                  </div>
                                )}
                                
                                {activeTab === 'history' && (
                                  // History View
                                  <div className="space-y-2">
                                    {task.history.slice().reverse().map((h, i) => (
                                      <div key={i} className="flex flex-col border-b dark:border-gray-600 last:border-0 pb-1">
                                        <div className="text-[10px] text-gray-400">
                                          {new Date(h.timestamp).toLocaleString('en-GB', { 
                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                                          })}
                                        </div>
                                        <div className="text-gray-700 dark:text-gray-200">
                                          {h.action} <span className="text-gray-400 text-[10px]">by {h.user?.username || 'System'}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {activeTab === 'commits' && (
                                  <div className="space-y-2">
                                    <div className="font-bold text-gray-500 dark:text-gray-400 mb-1">Linked Commits</div>
                                    {task.linkedCommits.map((c, i) => (
                                      <div key={i} className="bg-white dark:bg-gray-800 p-1.5 rounded border dark:border-gray-600 flex justify-between items-start">
                                          <div className="overflow-hidden">
                                              <div className="font-bold text-indigo-600 dark:text-indigo-400 text-[10px]">{c.committerName}</div>
                                              <div className="dark:text-gray-300 truncate">{c.message}</div>
                                          </div>
                                          <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline ml-2">↗</a>
                                      </div>
                                    ))}
                                    
                                    <div className="mt-3 pt-2 border-t dark:border-gray-600">
                                        <input 
                                            placeholder="Search commits to link..." 
                                            className="w-full p-1.5 rounded border dark:bg-gray-600 dark:border-gray-500 dark:text-white mb-2"
                                            value={linkSearch}
                                            onChange={e => setLinkSearch(e.target.value)}
                                        />
                                        <div className="space-y-1">
                                            {getUnlinkedCommits(task).map(c => (
                                                <div key={c.url} className="flex justify-between items-center bg-white dark:bg-gray-800 p-1 rounded border dark:border-gray-600">
                                                    <div className="truncate flex-1 mr-2">
                                                        <span className="font-bold text-[10px]">{c.committerName}:</span> {c.message}
                                                    </div>
                                                    <button onClick={() => handleLinkCommit(task.id, c.url)} className="bg-green-500 text-white px-1.5 py-0.5 rounded text-[10px] hover:bg-green-600">Link</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default TaskBoard;
