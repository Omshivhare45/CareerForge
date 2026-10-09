import { useState } from 'react';
import { FiChevronDown, FiPlay, FiCheckCircle, FiCircle, FiFolder } from 'react-icons/fi';
import { getDsaVideoList } from '../utils/dsaVideoCatalog';

// Accordion sidebar for the unified DSA learning workspace.
// Lists every phase → topic → video for the DSA domain fetched from /domains/:id
// and /topics/phase/:phaseId, so the whole roadmap is one contiguous list.
// Progress comes from the persisted completion state + per-video localStorage.
const videoDone = (topicId, videoKey) => {
  try {
    return localStorage.getItem(`dsa_video_done_${topicId}_${videoKey}`) === 'true';
  } catch {
    return false;
  }
};

export const WorkspaceSidebar = ({
  course,
  courseTopics,
  activeTopicId,
  activeVideoKey,
  completedTopicIds = [],
  onSelectTopic,
  onSelectVideo,
  isMobile,
  open,
  onClose
}) => {
  const phases = course?.phases || [];
  const [expandedPhases, setExpandedPhases] = useState({});
  const [expandedTopic, setExpandedTopic] = useState(activeTopicId);
  const [prevActiveId, setPrevActiveId] = useState(activeTopicId);

  // Adjust accordion state as the active topic changes (during render, per the
  // "derive state from props" pattern) so no cascade-render effects are needed.
  if (activeTopicId !== prevActiveId) {
    setPrevActiveId(activeTopicId);
    if (activeTopicId) {
      const topicPhase = phases.find((p) => (courseTopics[p._id] || []).some((t) => t._id === activeTopicId));
      if (topicPhase) {
        setExpandedPhases((prev) => ({ ...prev, [topicPhase._id]: true }));
      }
      setExpandedTopic(activeTopicId);
    }
  }

  const togglePhase = (phaseId) => {
    setExpandedPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const handleTopicClick = (topicId) => {
    if (topicId === activeTopicId) {
      setExpandedTopic(expandedTopic === topicId ? null : topicId);
    } else {
      onSelectTopic(topicId);
      setExpandedTopic(topicId);
    }
  };

  const handleVideoClick = (topicId, videoKey) => {
    onSelectVideo(topicId, videoKey);
    onClose?.();
  };

  const totalTopics = phases.reduce((acc, p) => acc + (courseTopics[p._id]?.length || 0), 0);
  const doneTopics = completedTopicIds.filter((t) => {
    return phases.some((p) => (courseTopics[p._id] || []).some((tp) => tp._id === t));
  }).length;

  return (
    <aside
      className={`bg-[var(--bg-card)] flex flex-col h-full overflow-hidden shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isMobile
          ? `absolute top-0 left-0 bottom-0 z-50 shadow-2xl ${open ? 'w-80 translate-x-0' : 'w-80 -translate-x-full'}`
          : `${open ? 'w-80 border-r border-[var(--border)]' : 'w-0 border-r-0'}`
        }`}
    >
      {open && (
        <>
          {/* Header */}
          <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-card)] shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-lg shadow-inner">🗺️</div>
              <div>
                <div className="font-black text-[var(--text-main)] text-sm leading-tight">DSA Workspace</div>
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">Learning Roadmap</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[var(--bg-sub)] rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full bg-gradient-to-r from-[var(--primary)] to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: totalTopics > 0 ? `${Math.round((doneTopics / totalTopics) * 100)}%` : '0%' }}
                />
              </div>
              <span className="text-[9px] font-black text-[var(--text-light)] shrink-0">{doneTopics}/{totalTopics}</span>
            </div>
          </div>

          {/* Scrollable accordion */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {phases.length === 0 && (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--primary)] border-t-transparent mx-auto" />
              </div>
            )}

            {phases.map((phase) => {
              const phaseId = phase._id;
              const topics = courseTopics[phaseId] || [];
              const isOpen = !!expandedPhases[phaseId];
              const phaseDone = topics.filter((topic) => completedTopicIds.some((ct) => ct === topic._id)).length;

              return (
                <div key={phaseId} className="border-b border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => togglePhase(phaseId)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-sub)] transition-colors cursor-pointer text-left"
                  >
                    <FiChevronDown className={`text-[var(--text-light)] transition-transform duration-300 ${isOpen ? 'rotate-0' : '-rotate-90'}`} size={14} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-[var(--primary)] tracking-widest uppercase">Lvl {phase.phaseNumber ?? 0}</span>
                        <FiFolder size={11} className="text-[var(--text-light)]" />
                      </div>
                      <div className="text-[11px] font-black text-[var(--text-main)] leading-tight truncate mt-0.5">{phase.name}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {phaseDone > 0 && (
                        <span className={`text-[8px] font-black ${phaseDone === topics.length ? 'text-emerald-500' : 'text-[var(--text-light)]'}`}>
                          {phaseDone}/{topics.length}
                        </span>
                      )}
                      <span className="text-[8px] font-black text-[var(--text-light)]">{topics.length} topics</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="pb-2">
                      {topics.map((topic) => {
                        const topicId = topic._id;
                        const videos = getDsaVideoList(topic);
                        const isActiveTopic = topicId === activeTopicId;
                        const isExpanded = expandedTopic === topicId || isActiveTopic;
                        const isDone = completedTopicIds.some((ct) => ct === topicId);
                        const doneCount = videos.filter((v) => videoDone(topicId, v.key)).length;
                        const allVideosDone = videos.length > 0 && doneCount === videos.length;

                        return (
                          <div key={topicId} className={`ml-3 mr-2 border-l border-[var(--border)] ${isExpanded ? '' : ''}`}>
                            <button
                              type="button"
                              onClick={() => handleTopicClick(topicId)}
                              className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer text-left ${
                                isActiveTopic
                                  ? 'bg-[var(--primary-light)] border-[var(--primary)]/20 ml-2 mr-1'
                                  : 'border-transparent hover:bg-[var(--bg-sub)] ml-2 mr-1'
                              }`}
                            >
                              <span className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-black transition-all ${
                                isDone
                                  ? 'bg-emerald-500 text-[var(--text-main)]'
                                  : isActiveTopic
                                    ? 'bg-[var(--primary)] text-[var(--text-main)]'
                                    : 'bg-[var(--bg-sub)] text-[var(--text-light)]'
                              }`}>
                                {isDone ? <FiCheckCircle size={11} /> : allVideosDone ? '✓' : <FiCircle size={9} />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={`text-[11px] font-black leading-tight block ${isActiveTopic ? 'text-[var(--primary)]' : isDone ? 'text-[var(--text-main)]' : 'text-[var(--text-light)]'}`}>
                                  {topic.title}
                                </span>
                                <span className="text-[8px] font-bold text-[var(--text-light)] uppercase tracking-tighter block mt-0.5">
                                  {topic.isCheckpointModule ? 'Checkpoint Module' : topic.difficulty || 'Beginner'} • {videos.length} videos
                                </span>
                              </span>
                              <span className="text-[8px] font-black text-[var(--text-light)] shrink-0">{doneCount}/{videos.length}</span>
                            </button>

                            {isExpanded && (
                              <div className="ml-6 pl-1 pr-2 pb-1 space-y-0.5">
                                {videos.map((v) => {
                                  const isActive = isActiveTopic && v.key === activeVideoKey;
                                  const done = videoDone(topicId, v.key);
                                  return (
                                    <button
                                      key={`${topicId}-${v.key}`}
                                      type="button"
                                      onClick={() => handleVideoClick(topicId, v.key)}
                                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer text-left ${
                                        isActive ? 'bg-[var(--bg-sub)] border border-[var(--primary)]/20' : 'hover:bg-[var(--bg-sub)] border border-transparent'
                                      }`}
                                    >
                                      {done ? (
                                        <FiCheckCircle size={10} className="text-emerald-500 shrink-0" />
                                      ) : isActive ? (
                                        <FiPlay size={10} className="text-[var(--primary)] shrink-0" />
                                      ) : (
                                        <FiCircle size={9} className="text-[var(--border-light)] shrink-0" />
                                      )}
                                      <span className={`text-[10px] font-semibold leading-snug truncate ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                                        {v.title}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
};

export default WorkspaceSidebar;