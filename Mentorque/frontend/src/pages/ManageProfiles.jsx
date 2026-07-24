import { useEffect, useState } from "react";
import * as adminApi from "../api/admin";
import MqSelect from "../components/MqSelect";
import { useToast } from "../context/ToastContext";
import { SkeletonList } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

function TagInput({ value, onChange, allTags }) {
  const [draft, setDraft] = useState("");

  function addTag(name) {
    const trimmed = name.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft("");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 text-primary-300 text-xs px-2.5 py-1">
            {t}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} className="hover:text-primary-100">
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(draft);
            }
          }}
          placeholder="Add a tag and press Enter"
          list="known-tags"
          className="flex-1 px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-600 text-white text-sm placeholder-slate-500"
        />
        <datalist id="known-tags">
          {allTags.map((t) => (
            <option key={t.id} value={t.name} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

function ProfileEditor({ person, allTags, onSave, saving }) {
  const [description, setDescription] = useState(person.description || "");
  const [tags, setTags] = useState((person.tags || []).map((t) => t.name));
  const [company, setCompany] = useState(person.company || "");
  const [isBigTech, setIsBigTech] = useState(!!person.isBigTech);
  const [domain, setDomain] = useState(person.domain || "");
  const [yearsExperience, setYearsExperience] = useState(person.yearsExperience ?? "");
  const [communicationScore, setCommunicationScore] = useState(person.communicationScore ?? "");
  const [dirty, setDirty] = useState(false);

  const isMentor = person.role === "MENTOR";

  function mark(setter) {
    return (v) => {
      setter(v);
      setDirty(true);
    };
  }

  async function handleSave() {
    await onSave(person.id, {
      description,
      tags,
      ...(isMentor && {
        company,
        isBigTech,
        domain,
        yearsExperience: yearsExperience === "" ? null : Number(yearsExperience),
        communicationScore: communicationScore === "" ? null : Number(communicationScore),
      }),
    });
    setDirty(false);
  }

  return (
    <div className="rounded-xl border border-white/[0.1] bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink-50">{person.name}</h3>
          <p className="text-xs text-ink-500">{person.email}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-ink-500 border border-white/[0.1] rounded-full px-2 py-0.5">
          {person.role}
        </span>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => mark(setDescription)(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-navy-800 border border-navy-600 text-white text-sm placeholder-slate-500"
          placeholder="Used by the recommendation engine for semantic matching…"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Tags</label>
        <TagInput value={tags} onChange={mark(setTags)} allTags={allTags} />
      </div>

      {isMentor && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Company</label>
            <input
              value={company}
              onChange={(e) => mark(setCompany)(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-600 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Domain</label>
            <input
              value={domain}
              onChange={(e) => mark(setDomain)(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-600 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Years experience</label>
            <input
              type="number"
              min="0"
              value={yearsExperience}
              onChange={(e) => mark(setYearsExperience)(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-600 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Communication score (0-100)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={communicationScore}
              onChange={(e) => mark(setCommunicationScore)(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-600 text-white text-sm"
            />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={isBigTech} onChange={(e) => mark(setIsBigTech)(e.target.checked)} />
            Big Tech mentor
          </label>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!dirty || saving}
        className="w-full py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-navy-950 text-sm font-medium transition disabled:opacity-40"
      >
        {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
      </button>
    </div>
  );
}

export default function ManageProfiles() {
  const [users, setUsers] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [tags, setTags] = useState([]);
  const [filter, setFilter] = useState("MENTOR");
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const [u, m, t] = await Promise.all([adminApi.listUsers(), adminApi.listMentors(), adminApi.listTags()]);
      setUsers(u);
      setMentors(m);
      setTags(t);
    } catch (err) {
      setError(err.message || "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(id, data) {
    setSavingId(id);
    setError("");
    try {
      await adminApi.updateProfile(id, data);
      await load();
      toast.success("Profile saved.");
    } catch (err) {
      setError(err.message || "Failed to save");
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSavingId(null);
    }
  }

  const people = filter === "MENTOR" ? mentors : users;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">Profiles &amp; Tags</h1>
          <p className="text-ink-400 text-sm mt-1">
            Admin-managed descriptions and tags feed the mentor recommendation engine.
          </p>
        </div>
        <MqSelect
          id="profile-filter"
          value={filter}
          onChange={setFilter}
          options={[{ value: "MENTOR", label: "Mentors" }, { value: "USER", label: "Users" }]}
        />
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonList rows={5} />
          <SkeletonList rows={5} />
        </div>
      ) : people.length === 0 ? (
        <EmptyState
          title={`No ${filter === "MENTOR" ? "mentors" : "users"} yet`}
          description="Seeded accounts will show up here automatically once created."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {people.map((p) => (
            <ProfileEditor key={p.id} person={p} allTags={tags} onSave={handleSave} saving={savingId === p.id} />
          ))}
        </div>
      )}
    </div>
  );
}
