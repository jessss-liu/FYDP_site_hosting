import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, Clock3, ImagePlus, Layers3, LoaderCircle, Plus, Search, Sparkles, Trash2, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type MemberColor = 'blue' | 'coral' | 'green' | 'yellow';

type Entry = {
  id: string;
  title: string;
  description: string;
  member_name: string;
  member_color: MemberColor;
  category: string;
  image_url: string | null;
  created_at: string;
};

const memberStyles: Record<MemberColor, { dot: string; soft: string; text: string }> = {
  blue: { dot: 'dot-blue', soft: 'tag-blue', text: 'text-blue' },
  coral: { dot: 'dot-coral', soft: 'tag-coral', text: 'text-coral' },
  green: { dot: 'dot-green', soft: 'tag-green', text: 'text-green' },
  yellow: { dot: 'dot-yellow', soft: 'tag-yellow', text: 'text-yellow' },
};

const fallbackColors: MemberColor[] = ['blue', 'coral', 'green', 'yellow'];
const categories = ['Progress', 'Research', 'Design', 'Setup', 'Writing', 'Review'];

function getRelativeTime(date: string) {
  const difference = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(difference / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeMember, setActiveMember] = useState('All updates');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMonth, setActiveMonth] = useState('All time');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState({ title: '', description: '', member: '', category: 'Progress' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function loadEntries() {
      const { data, error } = await supabase
        .from('design_log_entries')
        .select('id, title, description, member_name, member_color, category, image_url, created_at')
        .order('created_at', { ascending: false });
      if (error) setErrorMessage('The shared log could not be loaded. Refresh to try again.');
      else setEntries((data ?? []) as Entry[]);
      setIsLoading(false);
    }
    void loadEntries();
  }, []);

  const members = useMemo(() => Array.from(new Set(entries.map((entry) => entry.member_name))), [entries]);
  const months = useMemo(() => {
    const monthSet = new Set<string>();
    const monthOrder: { key: string; label: string }[] = [];
    for (const entry of entries) {
      const date = new Date(entry.created_at);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      if (!monthSet.has(key)) {
        monthSet.add(key);
        const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthOrder.push({ key, label });
      }
    }
    monthOrder.sort((a, b) => a.key.localeCompare(b.key));
    return monthOrder;
  }, [entries]);
  const visibleEntries = useMemo(() => entries.filter((entry) => {
    const matchesMember = activeMember === 'All updates' || entry.member_name === activeMember;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || `${entry.title} ${entry.description} ${entry.category}`.toLowerCase().includes(query);
    let matchesMonth = activeMonth === 'All time';
    if (!matchesMonth) {
      const date = new Date(entry.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      matchesMonth = key === activeMonth;
    }
    return matchesMember && matchesSearch && matchesMonth;
  }), [activeMember, activeMonth, entries, searchQuery]);
  const entryCountForMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      const date = new Date(entry.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const latestEntry = entries[0];
  const activeMemberCount = members.length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.member.trim()) return;
    setIsSaving(true);
    setErrorMessage('');
    const memberIndex = members.indexOf(form.member);
    const color = memberIndex >= 0 ? fallbackColors[memberIndex % fallbackColors.length] : fallbackColors[members.length % fallbackColors.length];

    let imageUrl: string | null = null;
    if (imageFile) {
      setIsUploading(true);
      const fileExt = imageFile.name.split('.').pop() ?? 'png';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('entry-images')
        .upload(fileName, imageFile, { cacheControl: '3600', upsert: false });
      setIsUploading(false);
      if (uploadError) {
        setErrorMessage('The photo could not be uploaded. Please try again.');
        setIsSaving(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('entry-images').getPublicUrl(fileName);
      imageUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('design_log_entries')
      .insert({
        title: form.title.trim(),
        description: form.description.trim(),
        member_name: form.member.trim(),
        member_color: color,
        category: form.category,
        image_url: imageUrl,
      })
      .select('id, title, description, member_name, member_color, category, image_url, created_at')
      .maybeSingle();

    if (error || !data) {
      setErrorMessage('Your update could not be saved. Please try again.');
    } else {
      setEntries((current) => [data as Entry, ...current]);
      setForm({ title: '', description: '', member: form.member, category: 'Progress' });
      setImageFile(null);
      setImagePreview('');
      setIsComposerOpen(false);
    }
    setIsSaving(false);
  }

  async function removeEntry(id: string) {
    const { error } = await supabase.from('design_log_entries').delete().eq('id', id);
    if (error) setErrorMessage('That update could not be removed.');
    else setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('That image is larger than 5 MB. Please choose a smaller one.');
      return;
    }
    setErrorMessage('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview('');
  }

  return (
    <main className="app-shell">
      <nav className="topbar">
        <a className="brand" href="#top" aria-label="Fieldnotes home">
          <span className="brand-mark"><Sparkles size={15} strokeWidth={2.5} /></span>
          <span>fieldnotes<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-meta">
          <span className="live-indicator"><span /> Live workspace</span>
          <button className="avatar avatar-small" onClick={() => setIsComposerOpen(true)} aria-label="Log an update">+</button>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> Group 50</p>
          <h1>INTELLIGENT<br />BOXING BOT<br />FYDP <em>design log.</em></h1>
          <p className="hero-description">One shared space for the ideas, decisions, and small wins moving our project forward.</p>
          <button className="primary-button" onClick={() => setIsComposerOpen(true)}><Plus size={18} /> Log an update <ArrowUpRight size={16} /></button>
        </div>
        <div className="hero-card hero-card-photo">
          <div className="card-scribble">✦</div>
          <img src={`${import.meta.env.BASE_URL}boxing-figure.png`} alt="Boxer standing in a boxing ring" className="hero-photo" loading="eager" />
          <div className="hero-photo-overlay">
            <p className="hero-card-label">Design Log</p>
            <p className="hero-photo-tagline">All work progress and updates will be made on this site.</p>
          </div>
        </div>
      </section>

      <section className="stats-strip" aria-label="Workspace summary">
        <div className="stat"><span className="stat-icon"><Layers3 size={18} /></span><span><strong>{entries.length}</strong> updates logged</span></div>
        <div className="stat"><span className="stat-icon"><Users size={18} /></span><span><strong>{activeMemberCount}</strong> contributors</span></div>
        <div className="stat"><span className="stat-icon"><Clock3 size={18} /></span><span>Last active <strong>{latestEntry ? getRelativeTime(latestEntry.created_at) : 'today'}</strong></span></div>
        <div className="stat-note">A little progress,<br /><em>every day.</em></div>
      </section>

      <section className="feed-section">
        <div className="feed-heading">
          <div><p className="eyebrow"><span className="eyebrow-line" /> The timeline</p><h2>What's been happening</h2></div>
          <div className="search-wrap"><Search size={17} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search updates" aria-label="Search updates" /></div>
        </div>

        <div className="month-row">
          <span className="month-row-label"><CalendarDays size={15} /> Sort by timeline</span>
          <div className="month-filters">
            <button className={`month-button ${activeMonth === 'All time' ? 'active' : ''}`} onClick={() => setActiveMonth('All time')}>All time</button>
            {months.map((month) => <button key={month.key} className={`month-button ${activeMonth === month.key ? 'active' : ''}`} onClick={() => setActiveMonth(month.key)}>{month.label} <span>{entryCountForMonth[month.key] ?? 0}</span></button>)}
          </div>
        </div>

        <div className="filter-row">
          <div className="member-filters"><button className={`filter-button ${activeMember === 'All updates' ? 'active' : ''}`} onClick={() => setActiveMember('All updates')}>All updates <span>{entries.length}</span></button>{members.map((member, index) => <button key={member} className={`filter-button ${activeMember === member ? 'active' : ''}`} onClick={() => setActiveMember(member)}><span className={`member-dot ${memberStyles[fallbackColors[index % fallbackColors.length]].dot}`} />{member}</button>)}</div>
        </div>

        {errorMessage && <div className="error-banner">{errorMessage}</div>}
        {isLoading ? <div className="loading-state"><LoaderCircle className="spin" size={22} /> Loading the shared log…</div> : visibleEntries.length === 0 ? <div className="empty-state"><div className="empty-icon"><Check size={22} /></div><h3>No updates here yet</h3><p>Try another filter or be the first to add a note.</p><button className="text-button" onClick={() => setIsComposerOpen(true)}>Write the first one <ArrowUpRight size={15} /></button></div> : <div className="timeline">{visibleEntries.map((entry, index) => {
          const color = memberStyles[entry.member_color] ?? memberStyles.blue;
          return <article className="timeline-item" key={entry.id}><div className="timeline-rail"><span className={`timeline-dot ${color.dot}`} />{index < visibleEntries.length - 1 && <span className="timeline-line" />}</div><div className="entry-card"><div className="entry-topline"><span className={`entry-tag ${color.soft}`}><span className={`member-dot ${color.dot}`} />{entry.member_name}</span><span className="entry-category">{entry.category}</span><span className="entry-time">{getRelativeTime(entry.created_at)}</span></div><h3>{entry.title}</h3><p>{entry.description}</p>{entry.image_url && <div className="entry-image-wrap"><img src={entry.image_url} alt={entry.title} className="entry-image" loading="lazy" /></div>}<div className="entry-footer"><span className={`entry-initial ${color.soft}`}>{entry.member_name.charAt(0).toUpperCase()}</span><span>Added by {entry.member_name}</span><button className="delete-button" onClick={() => void removeEntry(entry.id)} aria-label={`Remove ${entry.title}`}><Trash2 size={14} /></button></div></div></article>;
        })}</div>}
      </section>

      <footer><span>Group 50 / Intelligent Boxing Training System</span><span>Built together, one note at a time <span className="footer-star">✦</span></span></footer>

      {isComposerOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsComposerOpen(false); }}><section className="composer" role="dialog" aria-modal="true" aria-labelledby="composer-title"><div className="composer-header"><div><p className="eyebrow"><span className="eyebrow-line" /> New entry</p><h2 id="composer-title">What did you move forward?</h2></div><button className="close-button" onClick={() => setIsComposerOpen(false)} aria-label="Close">×</button></div><form onSubmit={handleSubmit}><label>Headline<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Chose our visual direction" /></label><label>Tell the story<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="A sentence or two about what happened…" rows={4} /></label><div className="upload-field">{imagePreview ? <div className="upload-preview"><img src={imagePreview} alt="Selected preview" /><button type="button" className="upload-remove" onClick={clearImage} aria-label="Remove image"><X size={14} /></button></div> : <label className="upload-dropzone"><ImagePlus size={22} /><span>Add a photo</span><input type="file" accept="image/*" capture="environment" onChange={handleImageSelect} style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }} /></label>}</div><div className="form-grid"><label>Your name<input value={form.member} onChange={(event) => setForm({ ...form, member: event.target.value })} placeholder="e.g. Maya" /></label><label>Type<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label></div><div className="composer-actions"><button type="button" className="secondary-button" onClick={() => setIsComposerOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={isSaving || isUploading}>{isSaving || isUploading ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} {isUploading ? 'Uploading photo…' : isSaving ? 'Saving…' : 'Add to timeline'}</button></div></form></section></div>}
    </main>
  );
}

export default App;
