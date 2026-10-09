import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiCode, FiTerminal, FiGlobe, FiArrowRight, FiBookOpen, FiTrendingUp, FiAward, FiZap, FiPlayCircle } from 'react-icons/fi';

const getProgressKey = (slug) => {
  if (!slug) return 'dsa';
  const lowercaseSlug = slug.toLowerCase();
  if (lowercaseSlug === 'web-development' || lowercaseSlug === 'webdev') return 'webdev';
  if (lowercaseSlug === 'devops') return 'devops';
  if (lowercaseSlug === 'dsa') return 'dsa';
  return 'dsa';
};

const DOMAIN_DEFS = [
  {
    key: 'dsa',
    slug: 'dsa',
    title: 'DSA',
    subtitle: 'Master Data Structures and Algorithms through structured video-based learning.',
    Icon: FiCode,
    color: '#eab308',
  },
  {
    key: 'devops',
    slug: 'devops',
    title: 'DevOps',
    subtitle: 'Learn Linux, Git, Docker, CI/CD, cloud and deployment fundamentals.',
    Icon: FiTerminal,
    color: '#ef4444',
  },
  {
    key: 'webdev',
    slug: 'web-development',
    title: 'Full Stack Development',
    subtitle: 'Build modern web applications from frontend to backend.',
    Icon: FiGlobe,
    color: '#6366f1',
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [domainsById, setDomainsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState(null);

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const res = await api.get('/progress/dashboard');
        setData(res.data.data);

        const domainsRes = await api.get('/domains');
        const byId = {};
        (domainsRes.data.data || []).forEach((d) => {
          byId[d.slug || d.name.toLowerCase()] = d;
        });
        setDomainsById(byId);
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    initDashboard();
  }, []);

  const handleSelectDomain = async (domainId) => {
    if (!domainId) {
      toast.error('Domain is not available yet');
      return;
    }

    const currentDomainId = data?.user?.activeDomain?._id || data?.user?.selectedDomain?._id;

    if (currentDomainId === domainId) {
      navigate('/roadmap');
      return;
    }

    setSelectingId(domainId);
    try {
      await api.post('/progress/select-domain', { domainId });
      await refreshUser();
      toast.success('Domain selected! Let\'s personalize your journey.');
      navigate('/setup-profile');
    } catch {
      toast.error('Failed to select domain');
    } finally {
      setSelectingId(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--primary)] border-t-transparent"></div>
      </div>
    );
  }

  if (!data || !data.user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">Something went wrong</h2>
        <p className="text-[var(--text-muted)] mb-8">We couldn't load your journey data. Try refreshing the page.</p>
        <button onClick={() => window.location.reload()} className="btn-primary px-8 py-3">Refresh Page</button>
      </div>
    );
  }

  const { user, currentPhaseData, recentActivity } = data;

  const activeDomainSlug = user.activeDomain?.slug || user.selectedDomain?.slug;
  const activeDomainKey = getProgressKey(activeDomainSlug);
  const activeDomainProgress = user.domainsProgress?.[activeDomainKey] || { overallProgress: 0 };
  const activeDomain = user.activeDomain || user.selectedDomain || null;

  const firstName = user.fullName?.split(' ')[0] || 'there';
  const avatarInitial = user.fullName?.charAt(0).toUpperCase() || 'U';
  const totalXP = user.totalXP || user.xp || 0;
  const dailyStreak =
    parseInt(localStorage.getItem('dsa_streak') || '0', 10) > 0
      ? parseInt(localStorage.getItem('dsa_streak') || '0', 10)
      : user.dailyStreak || 0;

  const getDomainProgress = (key) => {
    const prog = user.domainsProgress?.[key];
    return {
      overallProgress: prog?.overallProgress || 0,
      completedTopics: prog?.completedTopics?.length || 0,
    };
  };

  const dsaProgress = getDomainProgress('dsa');
  const devopsProgress = getDomainProgress('devops');
  const webdevProgress = getDomainProgress('webdev');

  const overallProgress = Math.round(
    (dsaProgress.overallProgress + devopsProgress.overallProgress + webdevProgress.overallProgress) / 3
  );

  const lastCompletedTopic = recentActivity?.length
    ? recentActivity[recentActivity.length - 1]
    : null;
  const lastTopicTitle = lastCompletedTopic?.topicId?.title || lastCompletedTopic?.topicId?.name || '';
  const hasLearningActivity =
    activeDomainProgress.overallProgress > 0 ||
    (user.domainsProgress?.[activeDomainKey]?.completedTopics?.length || 0) > 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 transition-colors duration-300">
      {/* Dashboard Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-[var(--text-muted)] font-semibold mt-1.5">
            Continue your learning journey. Choose a domain and keep building your skills.
          </p>
        </div>

        <div className="flex items-center gap-4 self-start md:self-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl pl-3 pr-5 py-3 shadow-sm">
          <Link
            to="/profile"
            className="w-11 h-11 rounded-full bg-[var(--primary)] text-white grid place-items-center text-base font-black shadow-sm shrink-0"
            title="Your profile"
          >
            {avatarInitial}
          </Link>
          <div className="text-center pr-4 border-r border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-light)] uppercase font-bold tracking-widest mb-0.5 flex items-center gap-1 justify-center">
              <FiAward size={12} /> XP
            </div>
            <div className="text-lg font-black text-[var(--text-main)] leading-none">{totalXP}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[var(--text-light)] uppercase font-bold tracking-widest mb-0.5 flex items-center gap-1 justify-center">
              <FiZap size={12} /> Streak
            </div>
            <div className="text-lg font-black text-[var(--text-main)] leading-none">{dailyStreak} day{dailyStreak === 1 ? '' : 's'}</div>
          </div>
        </div>
      </header>

      {/* Explore Domains */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">Explore Domains</h2>
          <p className="text-sm text-[var(--text-muted)] font-semibold mt-1">Choose what you want to learn.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DOMAIN_DEFS.map((def) => {
            const domain = domainsById[def.slug];
            const progress = getDomainProgress(def.key);
            const isActive = activeDomainKey === def.key || activeDomain?._id === domain?._id;
            const selecting = selectingId === domain?._id;

            return (
              <button
                key={def.key}
                type="button"
                onClick={() => handleSelectDomain(domain?._id)}
                disabled={selecting}
                className="text-left bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[var(--primary)]/40 transition-all duration-200 cursor-pointer h-full flex flex-col group"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-sub)] text-[var(--primary)] grid place-items-center">
                    <def.Icon size={18} strokeWidth={2} />
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] bg-[var(--primary-light)] border border-[var(--primary)]/20 rounded-full px-2.5 py-1">
                      Current Path
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-black text-[var(--text-main)] tracking-tight">{def.title}</h3>
                <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed mt-2 flex-1">
                  {def.subtitle}
                </p>

                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-[var(--text-light)]">
                      {progress.overallProgress}% Complete
                    </span>
                    {progress.completedTopics > 0 && (
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">
                        {progress.completedTopics} topic{progress.completedTopics === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${progress.overallProgress}%`, backgroundColor: def.color }}
                    ></div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[var(--border-light)] flex items-center justify-between">
                  <span className="text-xs font-black text-[var(--primary)] group-hover:gap-2 inline-flex items-center gap-1.5 transition-all">
                    {selecting
                      ? 'Selecting...'
                      : progress.overallProgress > 0
                        ? 'Continue'
                        : 'Start Learning'}
                    <FiArrowRight size={13} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Continue Learning */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">
            {hasLearningActivity ? 'Continue Learning' : 'Start Learning'}
          </h2>
        </div>

        {hasLearningActivity && activeDomain ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-sub)] text-[var(--primary)] grid place-items-center shrink-0">
              <FiBookOpen size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">
                {activeDomain.name?.toLowerCase().includes('web development')
                  ? 'Full Stack Development'
                  : activeDomain.name}
              </div>
              <div className="mt-1">
                {currentPhaseData && (
                  <span className="text-sm font-black text-[var(--text-main)]">
                    {currentPhaseData.name}
                  </span>
                )}
                {lastTopicTitle && (
                  <span className="text-sm text-[var(--text-muted)] font-semibold truncate block sm:inline mt-0.5 sm:mt-0 sm:ml-2">
                    · {lastTopicTitle}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3 max-w-md">
                <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
                    style={{ width: `${activeDomainProgress.overallProgress || 0}%` }}
                  ></div>
                </div>
                <span className="text-xs font-black text-[var(--text-main)] whitespace-nowrap">
                  {activeDomainProgress.overallProgress || 0}%
                </span>
              </div>
            </div>
            <Link
              to="/roadmap"
              className="shrink-0 inline-flex items-center gap-2 text-xs font-black text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl px-5 py-3 shadow-sm transition-colors cursor-pointer"
            >
              <FiPlayCircle size={15} /> Continue
            </Link>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-sub)] text-[var(--primary)] grid place-items-center mx-auto mb-4">
              <FiBookOpen size={20} />
            </div>
            <h3 className="text-lg font-black text-[var(--text-main)] tracking-tight">Start Learning</h3>
            <p className="text-sm text-[var(--text-muted)] font-semibold mt-1">
              Choose one of the three domains above to begin.
            </p>
          </div>
        )}
      </section>

      {/* Overall Progress */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">Your Progress</h2>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[var(--text-muted)] flex items-center gap-2">
              <FiTrendingUp size={16} className="text-[var(--primary)]" /> Overall learning progress
            </span>
            <span className="text-sm font-black text-[var(--text-main)]">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--border-light)] space-y-5">
            {[
              { label: 'DSA', progress: dsaProgress.overallProgress, color: '#eab308' },
              { label: 'DevOps', progress: devopsProgress.overallProgress, color: '#ef4444' },
              { label: 'Full Stack Development', progress: webdevProgress.overallProgress, color: '#6366f1' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-4">
                <span className="text-sm font-bold text-[var(--text-main)] w-40 shrink-0 truncate">{row.label}</span>
                <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${row.progress}%`, backgroundColor: row.color }}
                  ></div>
                </div>
                <span className="text-xs font-black text-[var(--text-muted)] w-10 text-right shrink-0">{row.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;