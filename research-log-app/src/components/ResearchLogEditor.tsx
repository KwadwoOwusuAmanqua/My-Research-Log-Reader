'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Project, ComposerState, Entry } from '@/lib/types';
import { INITIAL_PROJECTS } from '@/lib/data';
import {
  fullDate, monthLabel, weekday, dayNum, renderMd,
  genRef, genProjectRef, todayISO, currentTime, editStamp, projectInitial,
} from '@/lib/helpers';
import {
  BookIcon, ChevronDownIcon, CheckIcon, PlusIcon, SearchIcon,
  SidebarIcon, DownloadIcon, PrinterIcon,
  CodeBracketsIcon, PaperclipIcon, TagIcon, XIcon, FileIcon,
  CopyIcon, CopiedCheckIcon, EditPenIcon, TrashIcon, EmptySearchIcon,
} from './icons';

const EMPTY_COMPOSER: ComposerState = {
  decision: '', justification: '', tags: [], tagInput: '', attachments: [], editingId: null,
};

export default function ResearchLogEditor() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const decisionRef = useRef<HTMLTextAreaElement>(null);
  const justRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [newProjectMode, setNewProjectMode] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeField, setActiveField] = useState<'decision' | 'justification'>('decision');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [decisionShake, setDecisionShake] = useState(false);
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProjectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [projectMenuOpen]);

  const patchComposer = useCallback((patch: Partial<ComposerState>) => {
    setComposer(c => ({ ...c, ...patch }));
  }, []);

  const wrap = useCallback((marker: string) => {
    const ref = activeField === 'justification' ? justRef : decisionRef;
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd, val = el.value;
    const sel = val.slice(start, end) || 'text';
    const next = val.slice(0, start) + marker + sel + marker + val.slice(end);
    patchComposer({ [activeField]: next });
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + marker.length;
      el.selectionEnd = start + marker.length + sel.length;
    });
  }, [activeField, patchComposer]);

  const handleTagKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = composer.tagInput.trim().replace(/^#/, '').replace(/\s+/g, '-').toLowerCase();
      if (v && !composer.tags.includes(v)) {
        patchComposer({ tags: [...composer.tags, v], tagInput: '' });
      } else {
        patchComposer({ tagInput: '' });
      }
    } else if (e.key === 'Backspace' && !composer.tagInput && composer.tags.length) {
      patchComposer({ tags: composer.tags.slice(0, -1) });
    }
  }, [composer.tagInput, composer.tags, patchComposer]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).map(f => f.name);
    if (files.length) patchComposer({ attachments: [...composer.attachments, ...files] });
    e.target.value = '';
  }, [composer.attachments, patchComposer]);

  const submit = useCallback(() => {
    if (!composer.decision.trim()) {
      decisionRef.current?.focus();
      setDecisionShake(true);
      setTimeout(() => setDecisionShake(false), 500);
      return;
    }
    const date = todayISO();
    const time = currentTime();
    const stamp = editStamp(date, time);

    setProjects(prev => prev.map((p, i) => {
      if (i !== activeIdx) return p;
      let entries: Entry[];
      if (composer.editingId) {
        entries = p.entries.map(e =>
          e.id === composer.editingId
            ? { ...e, decision: composer.decision, justification: composer.justification, tags: composer.tags, attachments: composer.attachments, edited: true, editedAt: stamp }
            : e
        );
      } else {
        const newEntry: Entry = {
          id: 'e' + Date.now(), ref: genRef(), date, time,
          decision: composer.decision, justification: composer.justification,
          tags: composer.tags, attachments: composer.attachments, edited: false, editedAt: '',
        };
        entries = [newEntry, ...p.entries];
      }
      return { ...p, entries };
    }));
    setComposer(EMPTY_COMPOSER);
  }, [composer, activeIdx]);

  const startEdit = useCallback((id: string) => {
    const entry = projects[activeIdx]?.entries.find(e => e.id === id);
    if (!entry) return;
    setComposer({
      decision: entry.decision, justification: entry.justification,
      tags: [...entry.tags], attachments: [...entry.attachments],
      tagInput: '', editingId: id,
    });
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [projects, activeIdx]);

  const cancelEdit = useCallback(() => setComposer(EMPTY_COMPOSER), []);

  const deleteEntry = useCallback((id: string) => {
    setProjects(prev => prev.map((p, i) =>
      i !== activeIdx ? p : { ...p, entries: p.entries.filter(e => e.id !== id) }
    ));
    if (composer.editingId === id) setComposer(EMPTY_COMPOSER);
  }, [activeIdx, composer.editingId]);

  const fallbackCopy = (text: string) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
  };

  const copyRefToClipboard = useCallback((ref: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(ref).catch(() => fallbackCopy(ref));
    } else {
      fallbackCopy(ref);
    }
    setCopiedRef(ref);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedRef(null), 1300);
  }, []);

  const createProject = useCallback(() => {
    const name = newProjectName.trim();
    if (!name) return;
    const ref = genProjectRef();
    const initial = projectInitial(name);
    const newIdx = projects.length;
    setProjects(prev => [...prev, { name, ref, initial, entries: [] }]);
    setActiveIdx(newIdx);
    setProjectMenuOpen(false);
    setNewProjectMode(false);
    setNewProjectName('');
    setSearch('');
    setTagFilter(null);
    setDateFrom('');
    setDateTo('');
  }, [newProjectName, projects.length]);

  const switchProject = useCallback((i: number) => {
    setActiveIdx(i);
    setProjectMenuOpen(false);
    setNewProjectMode(false);
    setNewProjectName('');
    setSearch('');
    setTagFilter(null);
    setDateFrom('');
    setDateTo('');
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setTagFilter(null);
    setDateFrom('');
    setDateTo('');
  }, []);

  const jumpTo = useCallback((groupId: string) => {
    clearFilters();
    setTimeout(() => {
      const container = scrollRef.current;
      const el = document.getElementById(groupId);
      if (container && el) {
        container.scrollTo({
          top: el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 8,
          behavior: 'smooth',
        });
      }
    }, 70);
  }, [clearFilters]);

  const exportMd = useCallback(() => {
    const p = projects[activeIdx];
    let md = '# ' + p.name + '\n\nResearch Log — ' + p.ref + '\n\n';
    const sorted = [...p.entries].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    let last = '';
    sorted.forEach(e => {
      if (e.date !== last) { md += '\n## ' + fullDate(e.date) + '\n'; last = e.date; }
      md += '\n### ' + e.decision.replace(/[*`]/g, '').split('\n')[0] + '\n';
      md += '`' + e.ref + '` · ' + e.time + (e.edited ? ' · edited' : '') + (e.tags.length ? ' · ' + e.tags.map(t => '#' + t).join(' ') : '') + '\n\n';
      md += '**Decision:** ' + e.decision + '\n\n';
      if (e.justification.trim()) md += '**Justification:** ' + e.justification + '\n';
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = p.name.replace(/\s+/g, '_') + '.md';
    a.click();
    URL.revokeObjectURL(a.href);
  }, [projects, activeIdx]);

  const handleRenameSubmit = useCallback((i: number) => {
    const name = renameValue.trim();
    if (name) {
      setProjects(prev => prev.map((pr, idx) =>
        idx !== i ? pr : { ...pr, name, initial: projectInitial(name) }
      ));
    }
    setRenamingIdx(null);
    setRenameValue('');
  }, [renameValue]);

  const exportPdf = useCallback(() => {
    const p = projects[activeIdx];
    const sorted = [...p.entries].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const groupMap: Record<string, typeof sorted> = {};
    sorted.forEach(e => { (groupMap[e.date] = groupMap[e.date] || []).push(e); });

    const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const entryHtml = Object.keys(groupMap).sort().reverse().map(date => {
      const cards = groupMap[date].map(e => `
        <div class="rl-pdf-card">
          <div class="rl-pdf-meta">
            <span class="rl-pdf-ref">${esc(e.ref)}</span>
            <span class="rl-pdf-dot">·</span>
            <span class="rl-pdf-time">${esc(e.time)}</span>
            ${e.edited ? '<span class="rl-pdf-dot">·</span><span class="rl-pdf-edited">edited</span>' : ''}
            ${e.tags.length ? '<span class="rl-pdf-dot">·</span>' + e.tags.map(t => `<span class="rl-pdf-tag">#${esc(t)}</span>`).join('') : ''}
          </div>
          <div class="rl-pdf-field-label">Decision</div>
          <div class="rl-pdf-field-body rl-pdf-decision">${esc(e.decision)}</div>
          ${e.justification.trim() ? `
            <div class="rl-pdf-field-label" style="margin-top:14px">Justification</div>
            <div class="rl-pdf-field-body rl-pdf-just">${esc(e.justification)}</div>
          ` : ''}
          ${e.attachments.length ? `<div class="rl-pdf-attachments">${e.attachments.map(a => `<span class="rl-pdf-attach">&#128206; ${esc(a)}</span>`).join('')}</div>` : ''}
        </div>`).join('');
      return `
        <div class="rl-pdf-group">
          <div class="rl-pdf-date-header">
            <span class="rl-pdf-date-dot"></span>
            <span class="rl-pdf-date-label">${fullDate(date)}</span>
            <span class="rl-pdf-date-count">${groupMap[date].length} ${groupMap[date].length === 1 ? 'entry' : 'entries'}</span>
          </div>
          ${cards}
        </div>`;
    }).join('');

    const css = `
      #rl-print-root {
        font-family: -apple-system,'Helvetica Neue',Arial,sans-serif;
        font-size: 13.5px; line-height: 1.6; color: #111827;
        max-width: 780px; margin: 0 auto; padding: 48px 0;
      }
      #rl-print-root * { box-sizing: border-box; }
      .rl-pdf-cover {
        display: flex; align-items: flex-start; justify-content: space-between;
        padding-bottom: 24px; margin-bottom: 36px;
        border-bottom: 2.5px solid #4F46E5;
      }
      .rl-pdf-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
      .rl-pdf-brand-icon {
        width: 30px; height: 30px; background: #4F46E5; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
      }
      .rl-pdf-brand-name { font-size: 12px; font-weight: 700; color: #4F46E5; letter-spacing: -0.01em; }
      .rl-pdf-project-name { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; color: #111827; line-height: 1.1; }
      .rl-pdf-project-ref { font-size: 11px; color: #9CA3AF; font-family: monospace; margin-top: 6px; }
      .rl-pdf-cover-right { text-align: right; }
      .rl-pdf-stat-num { font-size: 28px; font-weight: 800; color: #111827; font-family: monospace; letter-spacing: -0.03em; display: block; }
      .rl-pdf-stat-label { font-size: 11px; color: #9CA3AF; }
      .rl-pdf-export-date { font-size: 11px; color: #C4C4CE; margin-top: 10px; }
      .rl-pdf-group { margin-bottom: 30px; page-break-inside: avoid; }
      .rl-pdf-date-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
      .rl-pdf-date-dot { width: 8px; height: 8px; background: #4F46E5; border-radius: 50%; flex-shrink: 0; }
      .rl-pdf-date-label { font-size: 13px; font-weight: 700; color: #374151; letter-spacing: -0.01em; }
      .rl-pdf-date-count { font-size: 10px; color: #9CA3AF; background: #F3F4F6; border-radius: 20px; padding: 2px 9px; font-family: monospace; }
      .rl-pdf-card {
        background: #fff; border: 1px solid #E5E7EB; border-radius: 12px;
        padding: 18px 20px; margin-bottom: 12px; page-break-inside: avoid;
      }
      .rl-pdf-meta {
        display: flex; align-items: center; flex-wrap: wrap; gap: 5px;
        margin-bottom: 13px; font-size: 11px; font-family: monospace; color: #6B7280;
      }
      .rl-pdf-ref { background: #EEF0FB; color: #4338CA; border-radius: 5px; padding: 2px 8px; font-weight: 700; }
      .rl-pdf-time { color: #9CA3AF; }
      .rl-pdf-edited { color: #C4C4CE; font-style: italic; }
      .rl-pdf-dot { color: #D1D5DB; padding: 0 1px; }
      .rl-pdf-tag { background: #F3F4F6; color: #4B5563; border-radius: 20px; padding: 1px 7px; margin-left: 2px; }
      .rl-pdf-field-label {
        font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
        text-transform: uppercase; color: #9CA3AF; margin-bottom: 5px;
      }
      .rl-pdf-field-body { font-size: 13.5px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
      .rl-pdf-decision { color: #1F2937; }
      .rl-pdf-just { color: #4B5563; }
      .rl-pdf-attachments { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
      .rl-pdf-attach { font-size: 11px; color: #6B7280; background: #F3F4F6; border-radius: 6px; padding: 2px 9px; font-family: monospace; }
      .rl-pdf-empty { text-align: center; padding: 60px 20px; color: #9CA3AF; font-size: 14px; }
      .rl-pdf-footer {
        margin-top: 40px; padding-top: 16px; border-top: 1px solid #E5E7EB;
        display: flex; justify-content: space-between;
        font-size: 10.5px; color: #C4C4CE; font-family: monospace;
      }
    `;

    const content = `
      <div class="rl-pdf-cover">
        <div>
          <div class="rl-pdf-brand">
            <div class="rl-pdf-brand-icon">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9Z" stroke="white" stroke-width="1.3"/>
                <path d="M5 5.5h6M5 8h6M5 10.5h3.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="rl-pdf-brand-name">Research Log</span>
          </div>
          <div class="rl-pdf-project-name">${esc(p.name)}</div>
          <div class="rl-pdf-project-ref">${esc(p.ref)}</div>
        </div>
        <div class="rl-pdf-cover-right">
          <span class="rl-pdf-stat-num">${p.entries.length}</span>
          <span class="rl-pdf-stat-label">${p.entries.length === 1 ? 'entry' : 'entries'}</span>
          <div class="rl-pdf-export-date">Exported ${today}</div>
        </div>
      </div>
      ${entryHtml || '<div class="rl-pdf-empty">No entries to export.</div>'}
      <div class="rl-pdf-footer">
        <span>${esc(p.name)} &nbsp;·&nbsp; ${esc(p.ref)}</span>
        <span>Research Log &nbsp;·&nbsp; ${today}</span>
      </div>
    `;

    const printRoot = document.createElement('div');
    printRoot.id = 'rl-print-root';
    printRoot.innerHTML = content;
    document.body.appendChild(printRoot);

    const styleEl = document.createElement('style');
    styleEl.id = 'rl-print-inject';
    styleEl.textContent = css + `@media print{body>*:not(#rl-print-root){display:none!important}#rl-print-root{display:block!important;position:static!important;padding:24px 32px!important}}`;
    document.head.appendChild(styleEl);

    const cleanup = () => {
      if (document.getElementById('rl-print-root')) document.body.removeChild(printRoot);
      if (document.getElementById('rl-print-inject')) document.head.removeChild(styleEl);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    window.print();
  }, [projects, activeIdx]);

  // --- derived state ---
  const p = projects[activeIdx];
  const q = search.trim().toLowerCase();
  const hasActiveFilters = !!(q || tagFilter || dateFrom || dateTo);

  let filteredList = p.entries.filter(e => {
    if (tagFilter && !e.tags.includes(tagFilter)) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    if (q) {
      const hay = (e.decision + ' ' + e.justification + ' ' + e.tags.join(' ') + ' ' + e.ref).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  filteredList = [...filteredList].sort((a, b) => -(a.date + a.time).localeCompare(b.date + b.time));

  const gmap: Record<string, Entry[]> = {};
  filteredList.forEach(e => { (gmap[e.date] = gmap[e.date] || []).push(e); });
  const dateKeys = Object.keys(gmap).sort().reverse();

  const tagset: Record<string, number> = {};
  p.entries.forEach(e => e.tags.forEach(t => { tagset[t] = (tagset[t] || 0) + 1; }));

  const monthMap: Record<string, Record<string, number>> = {};
  p.entries.forEach(e => {
    const mk = e.date.slice(0, 7);
    monthMap[mk] = monthMap[mk] || {};
    monthMap[mk][e.date] = (monthMap[mk][e.date] || 0) + 1;
  });
  const months = Object.keys(monthMap).sort().reverse();

  const editingEntry = composer.editingId ? p.entries.find(e => e.id === composer.editingId) : null;
  const entryCountLabel = hasActiveFilters
    ? filteredList.length + ' of ' + p.entries.length + ' entries shown'
    : p.entries.length + (p.entries.length === 1 ? ' entry' : ' entries') + ' · single running document';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: '#FAFAFA', color: '#111827', fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", overflow: 'hidden' }}>

      {/* SIDEBAR */}
      {!collapsed && (
        <aside style={{ width: 312, flex: '0 0 312px', height: '100%', background: '#FFFFFF', borderRight: '1px solid #ECECEF', display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '20px 20px 14px 20px', display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 34px' }}>
              <BookIcon />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', lineHeight: 1 }}>Research Log</div>
              <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 3 }}>Decision journal</div>
            </div>
          </div>

          <div ref={menuRef} style={{ padding: '0 16px 12px 16px', position: 'relative' }}>
            <button
              className="rl-btn rl-btn-project"
              onClick={() => { setProjectMenuOpen(v => !v); setNewProjectMode(false); setNewProjectName(''); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: '#F7F7F9', border: '1px solid #ECECEF', borderRadius: 12, padding: '10px 12px', textAlign: 'left' }}
            >
              <span style={{ width: 26, height: 26, borderRadius: 7, background: '#EEF0FB', color: '#4338CA', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 26px', fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600 }}>{p.initial}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                <span style={{ display: 'block', fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 10.5, color: '#9CA3AF' }}>{p.ref}</span>
              </span>
              <ChevronDownIcon />
            </button>

            {projectMenuOpen && (
              <div style={{ position: 'absolute', left: 16, right: 16, top: 54, zIndex: 30, background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, boxShadow: '0 16px 40px rgba(17,24,39,0.14)', padding: 6 }}>
                {projects.map((pr, i) => (
                  renamingIdx === i ? (
                    <div key={i} style={{ padding: '6px 4px 4px 4px' }}>
                      <input
                        autoFocus
                        className="rl-input"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameSubmit(i);
                          if (e.key === 'Escape') { setRenamingIdx(null); setRenameValue(''); }
                        }}
                        onBlur={() => handleRenameSubmit(i)}
                        placeholder="New name…"
                        style={{ width: '100%', background: '#F7F7F9', border: '1px solid #4F46E5', borderRadius: 9, padding: '9px 11px', fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 13, color: '#111827', outline: 'none', boxShadow: '0 0 0 3px rgba(79,70,229,0.12)' }}
                      />
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, paddingLeft: 2 }}>Enter to save · Esc to cancel</div>
                    </div>
                  ) : (
                    <div key={i} className="rl-pitem-row" style={{ display: 'flex', alignItems: 'center', borderRadius: 9 }}>
                      <button className="rl-btn rl-btn-pitem" onClick={() => switchProject(i)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', borderRadius: 9, padding: '9px 10px', textAlign: 'left' }}>
                        <span style={{ width: 24, height: 24, borderRadius: 7, background: '#EEF0FB', color: '#4338CA', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 24px', fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600 }}>{pr.initial}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pr.name}</span>
                          <span style={{ display: 'block', fontSize: 11, color: '#9CA3AF' }}>{pr.ref} · {pr.entries.length} {pr.entries.length === 1 ? 'entry' : 'entries'}</span>
                        </span>
                        {i === activeIdx && <CheckIcon />}
                      </button>
                      <button
                        className="rl-btn rl-btn-rename"
                        title="Rename"
                        onClick={e => { e.stopPropagation(); setRenamingIdx(i); setRenameValue(pr.name); }}
                        style={{ width: 28, height: 28, flex: '0 0 28px', border: 'none', background: 'transparent', borderRadius: 7, color: '#C4C4CE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 4 }}
                      >
                        <EditPenIcon size={13} />
                      </button>
                    </div>
                  )
                ))}
                <div style={{ height: 1, background: '#ECECEF', margin: '4px 2px' }} />
                {newProjectMode ? (
                  <div style={{ padding: '6px 4px 4px 4px' }}>
                    <input
                      autoFocus
                      className="rl-input"
                      value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') createProject();
                        if (e.key === 'Escape') { setNewProjectMode(false); setNewProjectName(''); }
                      }}
                      placeholder="Topic name…"
                      style={{ width: '100%', background: '#F7F7F9', border: '1px solid #ECECEF', borderRadius: 9, padding: '9px 11px', fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 13, color: '#111827', outline: 'none', marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button className="rl-btn rl-btn-cancel" onClick={() => { setNewProjectMode(false); setNewProjectName(''); }} style={{ flex: 1, height: 34, border: '1px solid #ECECEF', background: '#fff', borderRadius: 8, fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#6B7280' }}>Cancel</button>
                      <button className="rl-btn rl-btn-primary" onClick={createProject} style={{ flex: 1, height: 34, border: 'none', background: '#4F46E5', borderRadius: 8, fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#fff' }}>Create</button>
                    </div>
                  </div>
                ) : (
                  <button className="rl-btn rl-btn-new-proj" onClick={() => setNewProjectMode(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 'none', borderRadius: 9, padding: '9px 10px', textAlign: 'left' }}>
                    <span style={{ width: 24, height: 24, borderRadius: 7, border: '1.5px dashed #C7C5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 24px', color: '#4F46E5' }}>
                      <PlusIcon />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>New research topic</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ padding: '0 16px 14px 16px' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
                <SearchIcon />
              </span>
              <input
                className="rl-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search decisions, tags, IDs…"
                style={{ width: '100%', background: '#F7F7F9', border: '1px solid #ECECEF', borderRadius: 11, padding: '10px 12px 10px 36px', fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 13.5, color: '#111827', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 2px 10px 2px' }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Filters</span>
              {hasActiveFilters && (
                <button className="rl-btn rl-btn-clear" onClick={clearFilters} style={{ background: 'none', border: 'none', fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#4F46E5', padding: 0 }}>Clear</button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <label style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 10.5, color: '#9CA3AF', marginBottom: 4, paddingLeft: 2 }}>From</span>
                <input className="rl-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '100%', background: '#F7F7F9', border: '1px solid #ECECEF', borderRadius: 9, padding: '7px 9px', fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 12, color: '#374151', outline: 'none' }} />
              </label>
              <label style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 10.5, color: '#9CA3AF', marginBottom: 4, paddingLeft: 2 }}>To</span>
                <input className="rl-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '100%', background: '#F7F7F9', border: '1px solid #ECECEF', borderRadius: 9, padding: '7px 9px', fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 12, color: '#374151', outline: 'none' }} />
              </label>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 22 }}>
              {Object.keys(tagset).sort().map(t => {
                const active = tagFilter === t;
                return (
                  <button key={t} className="rl-btn rl-btn-tag" onClick={() => setTagFilter(prev => prev === t ? null : t)} style={{ border: `1px solid ${active ? '#4F46E5' : '#ECECEF'}`, background: active ? '#4F46E5' : '#F7F7F9', color: active ? '#fff' : '#4B5563', borderRadius: 999, padding: '4px 11px', fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500 }}>
                    #{t}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 2px 12px 2px' }}>Timeline</div>

            {months.map(mk => {
              const days = Object.keys(monthMap[mk]).sort().reverse();
              return (
                <div key={mk} style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 13, color: '#374151', letterSpacing: '-0.01em', margin: '0 2px 7px 2px' }}>{monthLabel(mk)}</div>
                  {days.map(date => (
                    <button key={date} className="rl-btn rl-btn-timeline" onClick={() => jumpTo('grp-' + date)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, background: 'transparent', border: 'none', borderRadius: 9, padding: '7px 9px', textAlign: 'left', marginBottom: 1 }}>
                      <span style={{ fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#4F46E5', width: 22, textAlign: 'right', flex: '0 0 22px' }}>{dayNum(date)}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{weekday(date)}</span>
                      <span style={{ fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 10.5, color: '#B9B9C2', background: '#F3F4F6', borderRadius: 6, padding: '1px 6px' }}>{monthMap[mk][date]}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* MAIN */}
      <main style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', background: '#FAFAFA' }}>

        <header style={{ flex: '0 0 auto', height: 66, borderBottom: '1px solid #ECECEF', background: 'rgba(250,250,250,0.86)', backdropFilter: 'saturate(140%) blur(8px)', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px' }}>
          <button className="rl-btn rl-btn-sidebar" onClick={() => setCollapsed(v => !v)} title="Toggle sidebar" style={{ width: 36, height: 36, flex: '0 0 36px', borderRadius: 10, border: '1px solid #ECECEF', background: '#fff', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SidebarIcon />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '-0.025em', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h1>
            <div style={{ fontSize: 12.5, color: '#9CA3AF', marginTop: 2 }}>{entryCountLabel}</div>
          </div>
          <button className="rl-btn rl-btn-export" onClick={exportMd} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 14px', borderRadius: 10, border: '1px solid #ECECEF', background: '#fff', color: '#374151', fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 }}>
            <DownloadIcon /> Markdown
          </button>
          <button className="rl-btn rl-btn-primary" onClick={exportPdf} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 999, border: 'none', background: '#4F46E5', color: '#fff', fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 }}>
            <PrinterIcon /> Export PDF
          </button>
        </header>

        <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 24px 80px 24px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 24 }}>

            {/* Composer */}
            <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 16, boxShadow: '0 4px 18px rgba(17,24,39,0.05)', padding: '18px 20px 16px 20px', marginBottom: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: '#4F46E5' }} />
                  <h2 style={{ margin: 0, fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>{editingEntry ? 'Edit entry' : 'New log entry'}</h2>
                </div>
                {editingEntry && (
                  <span style={{ fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 600, color: '#4338CA', background: '#EEF0FB', padding: '3px 9px', borderRadius: 6 }}>{editingEntry.ref}</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 5, background: '#F7F7F9', border: '1px solid #ECECEF', borderRadius: 10, marginBottom: 14 }}>
                <button className="rl-btn rl-btn-toolbar" onMouseDown={e => e.preventDefault()} onClick={() => wrap('**')} title="Bold" style={{ width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 7, color: '#4B5563', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>B</button>
                <button className="rl-btn rl-btn-toolbar" onMouseDown={e => e.preventDefault()} onClick={() => wrap('*')} title="Italic" style={{ width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 7, color: '#4B5563', fontStyle: 'italic', fontFamily: "'DM Sans'", fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>i</button>
                <button className="rl-btn rl-btn-toolbar" onMouseDown={e => e.preventDefault()} onClick={() => wrap('`')} title="Inline code" style={{ width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 7, color: '#4B5563', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CodeBracketsIcon />
                </button>
                <span style={{ width: 1, height: 18, background: '#E5E7EB', margin: '0 4px' }} />
                <button className="rl-btn rl-btn-toolbar" onMouseDown={e => e.preventDefault()} onClick={() => fileRef.current?.click()} title="Attach file" style={{ width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 7, color: '#4B5563', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PaperclipIcon />
                </button>
                <input type="file" multiple ref={fileRef} onChange={handleFile} style={{ display: 'none' }} />
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: '#B9B9C2', paddingRight: 4 }}>Markdown supported</span>
              </div>

              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>The decision</label>
              <textarea
                className={`rl-textarea${decisionShake ? ' rl-shake' : ''}`}
                ref={decisionRef}
                value={composer.decision}
                onChange={e => patchComposer({ decision: e.target.value })}
                onFocus={() => setActiveField('decision')}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); } }}
                placeholder="What did you decide?"
                style={{ width: '100%', minHeight: 54, resize: 'vertical', background: '#fff', border: `1px solid ${decisionShake ? '#DC4C4C' : '#E5E7EB'}`, borderRadius: 11, padding: '11px 13px', fontSize: 15, lineHeight: 1.55, color: '#111827', outline: 'none', marginBottom: 16, fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif" }}
              />

              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>The justification / why</label>
              <textarea
                className="rl-textarea"
                ref={justRef}
                value={composer.justification}
                onChange={e => patchComposer({ justification: e.target.value })}
                onFocus={() => setActiveField('justification')}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); } }}
                placeholder="Why this call? Constraints, evidence, trade-offs…"
                style={{ width: '100%', minHeight: 76, resize: 'vertical', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 11, padding: '11px 13px', fontSize: 14.5, lineHeight: 1.6, color: '#374151', outline: 'none', marginBottom: 14, fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif" }}
              />

              {composer.attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
                  {composer.attachments.map((a, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F3F4F6', borderRadius: 8, padding: '4px 8px 4px 9px' }}>
                      <FileIcon />
                      <span style={{ fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 11.5, color: '#4B5563' }}>{a}</span>
                      <button className="rl-btn rl-btn-rm" onClick={() => patchComposer({ attachments: composer.attachments.filter((_, j) => j !== i) })} style={{ border: 'none', background: 'none', color: '#9CA3AF', display: 'flex', padding: 0 }}>
                        <XIcon size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, minHeight: 38, background: '#F7F7F9', border: '1px solid #ECECEF', borderRadius: 10, padding: '5px 10px' }}>
                  <TagIcon />
                  {composer.tags.map((t, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EEF0FB', color: '#4338CA', borderRadius: 999, padding: '3px 5px 3px 9px', fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500 }}>
                      #{t}
                      <button className="rl-btn rl-btn-rm" onClick={() => patchComposer({ tags: composer.tags.filter((_, j) => j !== i) })} style={{ border: 'none', background: 'none', color: '#8b87d4', display: 'flex', padding: 0 }}>
                        <XIcon size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    value={composer.tagInput}
                    onChange={e => patchComposer({ tagInput: e.target.value })}
                    onKeyDown={handleTagKey}
                    placeholder="Add tag…"
                    style={{ flex: 1, minWidth: 80, border: 'none', background: 'transparent', outline: 'none', fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 13, color: '#111827', padding: '3px 0' }}
                  />
                </div>
                {editingEntry && (
                  <button className="rl-btn rl-btn-cancel" onClick={cancelEdit} style={{ height: 42, padding: '0 16px', borderRadius: 999, border: '1px solid #ECECEF', background: '#fff', color: '#6B7280', fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 600 }}>Cancel</button>
                )}
                <button className="rl-btn rl-btn-primary" onClick={submit} style={{ height: 42, padding: '0 22px', borderRadius: 999, border: 'none', background: '#4F46E5', color: '#fff', fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {editingEntry ? 'Save changes' : 'Log entry'}
                </button>
              </div>
            </section>

            {/* Empty state */}
            {dateKeys.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 20px', color: '#9CA3AF' }}>
                <div style={{ width: 54, height: 54, borderRadius: 14, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <EmptySearchIcon />
                </div>
                <div style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 17, color: '#374151', letterSpacing: '-0.02em' }}>
                  {hasActiveFilters ? 'No matching entries' : 'No entries yet'}
                </div>
                <div style={{ fontSize: 13.5, marginTop: 5 }}>
                  {hasActiveFilters ? 'Try clearing your filters or search.' : 'Log your first decision above.'}
                </div>
              </div>
            )}

            {/* Entry groups */}
            {dateKeys.map(date => (
              <div key={date} id={'grp-' + date} style={{ position: 'relative', marginBottom: 8 }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 6, padding: '10px 0 12px 0', background: 'linear-gradient(180deg,#FAFAFA 62%,rgba(250,250,250,0))' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #ECECEF', borderRadius: 999, padding: '6px 8px 6px 15px', boxShadow: '0 2px 8px rgba(17,24,39,0.05)' }}>
                    <span style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em', color: '#111827' }}>{fullDate(date)}</span>
                    <span style={{ fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 10.5, color: '#9CA3AF', background: '#F3F4F6', borderRadius: 999, padding: '2px 8px' }}>{gmap[date].length} {gmap[date].length === 1 ? 'entry' : 'entries'}</span>
                  </div>
                </div>

                {gmap[date].map(e => (
                  <article key={e.id} style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '20px 22px', marginBottom: 14, boxShadow: '0 1px 2px rgba(17,24,39,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <button className="rl-btn rl-btn-ref" onClick={() => copyRefToClipboard(e.ref)} title="Copy reference ID" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: '#4338CA', background: '#EEF0FB', padding: '4px 9px', borderRadius: 7 }}>
                        {e.ref}
                        {copiedRef === e.ref ? <CopiedCheckIcon /> : <CopyIcon />}
                      </button>
                      <span style={{ fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 12, color: '#9CA3AF' }}>{e.time}</span>
                      {e.edited && (
                        <span title={'Last edited ' + e.editedAt} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontStyle: 'italic', color: '#B9B9C2' }}>
                          <EditPenIcon size={11} /> edited
                        </span>
                      )}
                      <span style={{ flex: 1 }} />
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button className="rl-btn rl-btn-edit" onClick={() => startEdit(e.id)} title="Edit" style={{ width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 8, color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <EditPenIcon />
                        </button>
                        <button className="rl-btn rl-btn-delete" onClick={() => deleteEntry(e.id)} title="Delete" style={{ width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 8, color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>The decision</div>
                    <div style={{ fontSize: 15, lineHeight: 1.6, color: '#1F2937' }} dangerouslySetInnerHTML={{ __html: renderMd(e.decision) }} />

                    {e.justification.trim() && (
                      <div style={{ marginTop: 16, paddingTop: 15, borderTop: '1px solid #F1F1F4' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>Justification</div>
                        <div style={{ fontSize: 14.5, lineHeight: 1.65, color: '#4B5563' }} dangerouslySetInnerHTML={{ __html: renderMd(e.justification) }} />
                      </div>
                    )}

                    {(e.tags.length > 0 || e.attachments.length > 0) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 16 }}>
                        {e.tags.map(t => (
                          <span key={t} style={{ fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 11, color: '#4B5563', background: '#F3F4F6', borderRadius: 999, padding: '3px 10px' }}>#{t}</span>
                        ))}
                        {e.attachments.map(a => (
                          <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace", fontSize: 11, color: '#6B7280', background: '#F3F4F6', borderRadius: 8, padding: '3px 9px' }}>
                            <FileIcon size={12} /> {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ))}

          </div>
        </div>
      </main>
    </div>
  );
}
