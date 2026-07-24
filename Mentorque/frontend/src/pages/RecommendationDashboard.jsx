import { useEffect, useState } from "react";
import * as adminApi from "../api/admin";
import MqSelect from "../components/MqSelect";
import { useToast } from "../context/ToastContext";

function ScoreBar({ label, value }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-ink-400 mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MentorResultCard({ result, index, onCheckOverlap, overlap, overlapLoading, onBook }) {
  return (
    <div className="rounded-xl border border-white/[0.1] bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-xs font-semibold text-primary-400">#{index + 1} match</span>
          <h3 className="text-lg font-semibold text-ink-50">{result.name}</h3>
        </div>
      </div>
      <p className="text-sm text-ink-300 mb-4">{result.reasoning}</p>
      <div className="space-y-2 mb-4">
        <ScoreBar label="Match score" value={result.score} />
        <ScoreBar label="Confidence" value={result.confidence} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCheckOverlap(result.mentorId)}
          disabled={overlapLoading}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/[0.06] text-ink-200 hover:bg-white/[0.1] transition disabled:opacity-50"
        >
          {overlapLoading ? "Checking…" : "Check availability overlap"}
        </button>
      </div>
      {overlap && (
        <div className="mt-4 border-t border-white/[0.08] pt-4">
          {overlap.length === 0 ? (
            <p className="text-sm text-ink-500">No overlapping availability in the next 3 weeks.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-ink-500 mb-1">{overlap.length} overlapping slot{overlap.length !== 1 ? "s" : ""}:</p>
              {overlap.map((slot) => (
                <div
                  key={slot.start}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm"
                >
                  <span className="text-ink-200">
                    {new Date(slot.start).toLocaleString(undefined, {
                      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                    {" – "}
                    {new Date(slot.end).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <button
                    onClick={() => onBook(result.mentorId, result.name, slot)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary-600 hover:bg-primary-500 text-navy-950 transition"
                  >
                    Book this slot
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecommendationDashboard() {
  const [users, setUsers] = useState([]);
  const [callTypes, setCallTypes] = useState([]);
  const [userId, setUserId] = useState("");
  const [callType, setCallType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [overlaps, setOverlaps] = useState({});
  const [overlapLoadingId, setOverlapLoadingId] = useState(null);
  const [bookingSlot, setBookingSlot] = useState(null); // { mentorId, mentorName, slot }
  const [bookTitle, setBookTitle] = useState("");
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState("");
  const [bookSuccess, setBookSuccess] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const [u, ct] = await Promise.all([adminApi.listUsers(), adminApi.listCallTypes()]);
      setUsers(u);
      setCallTypes(ct);
      if (ct[0]) setCallType(ct[0].key);
    })();
  }, []);

  const selectedUser = users.find((u) => u.id === userId);

  async function runRecommendation(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setOverlaps({});
    if (!userId || !callType) return;
    setLoading(true);
    try {
      const res = await adminApi.getRecommendations(userId, callType);
      setResult(res);
    } catch (err) {
      setError(err.message || "Failed to get recommendations");
    } finally {
      setLoading(false);
    }
  }

  async function checkOverlap(mentorId) {
    setOverlapLoadingId(mentorId);
    try {
      const res = await adminApi.getOverlappingSlots(userId, mentorId, 21);
      setOverlaps((prev) => ({ ...prev, [mentorId]: res.overlap }));
    } catch (err) {
      setError(err.message || "Failed to check overlap");
    } finally {
      setOverlapLoadingId(null);
    }
  }

  function openBooking(mentorId, mentorName, slot) {
    setBookError("");
    setBookSuccess(false);
    setBookTitle(`${callTypes.find((c) => c.key === callType)?.label || "Mentoring"} — ${selectedUser?.name} × ${mentorName}`);
    setBookingSlot({ mentorId, mentorName, slot });
  }

  async function confirmBooking() {
    if (!bookingSlot) return;
    setBookLoading(true);
    setBookError("");
    try {
      await adminApi.scheduleMeeting({
        title: bookTitle,
        startTime: bookingSlot.slot.start,
        endTime: bookingSlot.slot.end,
        userId,
        mentorId: bookingSlot.mentorId,
        callType,
        participantEmails: [selectedUser?.email, users.find((u) => u.id === bookingSlot.mentorId)?.email].filter(Boolean),
      });
      setBookSuccess(true);
      toast.success("Meeting booked!");
      setTimeout(() => setBookingSlot(null), 1200);
    } catch (err) {
      setBookError(err.message || "Failed to book meeting");
      toast.error(err.message || "Failed to book meeting");
    } finally {
      setBookLoading(false);
    }
  }

  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));
  const callTypeOptions = callTypes.map((c) => ({ value: c.key, label: c.label }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Mentor Recommendations</h1>
        <p className="text-ink-400 text-sm mt-1">
          Pick a user and a call type — the matching engine ranks mentors by semantic fit, tags, and call-type priorities.
        </p>
      </div>

      <form onSubmit={runRecommendation} className="flex flex-wrap items-end gap-4 rounded-xl border border-white/[0.1] bg-white/[0.02] p-5">
        <MqSelect id="rec-user" label="User" value={userId} onChange={setUserId} options={userOptions} placeholder="Select a user…" />
        <MqSelect id="rec-calltype" label="Call type" value={callType} onChange={setCallType} options={callTypeOptions} placeholder="Select a call type…" />
        <button
          type="submit"
          disabled={loading || !userId || !callType}
          className="px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-navy-950 font-medium transition disabled:opacity-50"
        >
          {loading ? "Matching…" : "Get recommendations"}
        </button>
      </form>

      {selectedUser?.description && (
        <p className="text-sm text-ink-500 italic">&ldquo;{selectedUser.description}&rdquo;</p>
      )}

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {result.results.length === 0 ? (
            <p className="text-ink-500">No mentors available to recommend.</p>
          ) : (
            result.results.map((r, i) => (
              <MentorResultCard
                key={r.mentorId}
                result={r}
                index={i}
                onCheckOverlap={checkOverlap}
                overlap={overlaps[r.mentorId]}
                overlapLoading={overlapLoadingId === r.mentorId}
                onBook={openBooking}
              />
            ))
          )}
          <p className="text-xs text-ink-600">Ranked by: {result.model}</p>
        </div>
      )}

      {bookingSlot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/80 backdrop-blur-sm p-4" onClick={() => setBookingSlot(null)}>
          <div
            className="bg-navy-900 border border-white/[0.1] rounded-2xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-ink-50 mb-4">Confirm booking</h3>
            {bookError && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">{bookError}</div>
            )}
            {bookSuccess ? (
              <p className="text-green-400 text-sm">Meeting booked!</p>
            ) : (
              <>
                <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                <input
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-navy-800 border border-navy-600 text-white mb-4"
                />
                <p className="text-sm text-ink-400 mb-4">
                  {new Date(bookingSlot.slot.start).toLocaleString(undefined, {
                    weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                  {" – "}
                  {new Date(bookingSlot.slot.end).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setBookingSlot(null)} className="px-3 py-2 rounded-lg text-sm text-ink-300 hover:bg-white/[0.06]">
                    Cancel
                  </button>
                  <button
                    onClick={confirmBooking}
                    disabled={bookLoading}
                    className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-navy-950 font-medium disabled:opacity-50"
                  >
                    {bookLoading ? "Booking…" : "Confirm"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
