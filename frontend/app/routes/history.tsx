import {
  CalendarDays,
  Clock,
  Loader2,
  Trash2,
  ChevronDown,
  Info,
  Edit2,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { API_URL } from '../config';

export default function History() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingPastRecord, setIsAddingPastRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmEdit, setConfirmEdit] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'SAVE' | 'UPDATE';
    payload: any;
  } | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);

  const formatTimeForInput = (timeStr: string) => {
    if (!timeStr || timeStr === '--:--') return '';
    const match = timeStr.match(/(\d{2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      let [_, hours, mins, period] = match;
      let h = parseInt(hours, 10);
      if (period.toUpperCase() === 'PM' && h < 12) h += 12;
      if (period.toUpperCase() === 'AM' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${mins}`;
    }
    return timeStr;
  };

  const getMonthYear = (dateStr: string) => {
    if (!dateStr || dateStr === 'Unknown') return 'UNKNOWN';
    const match = dateStr.match(/([a-zA-Z]+)\s+\d+,\s+(\d{4})/);
    if (match) {
      return `${match[1].toUpperCase()} ${match[2]}`;
    }
    return dateStr.toUpperCase();
  };

  const months = useMemo(() => {
    const unique = Array.from(
      new Set(records.map((r) => getMonthYear(r.date)))
    );
    return unique.sort((a, b) => {
      if (a === 'UNKNOWN') return 1;
      if (b === 'UNKNOWN') return -1;
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });
  }, [records]);

  useEffect(() => {
    if (
      months.length > 0 &&
      (!selectedMonth || !months.includes(selectedMonth))
    ) {
      const now = new Date();
      const currentMonthYear = `${now.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${now.getFullYear()}`;
      if (months.includes(currentMonthYear)) {
        setSelectedMonth(currentMonthYear);
      } else {
        setSelectedMonth(months[0]);
      }
    }
  }, [months, selectedMonth]);

  const filteredRecords = records.filter(
    (r) => getMonthYear(r.date) === selectedMonth
  );

  const groupedByWeek = useMemo(() => {
    const groups: { [week: string]: any[] } = {};

    filteredRecords.forEach((r) => {
      const d = new Date(r.date);

      if (isNaN(d.getTime())) {
        const key = 'Unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      } else {
        const weekNum = Math.ceil(d.getDate() / 7);
        const key = `Week ${weekNum}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      }
    });

    return groups;
  }, [filteredRecords]);

  const handleDelete = (record_id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    setDeletingId(record_id);

    const student_id = localStorage.getItem('student_id');

    fetch(`${API_URL}/api/delete-record/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, record_id }),
    })
      .then((res) => res.json())
      .then((data) => {
        setDeletingId(null);
        if (data.message) {
          fetchRecords();
        } else {
          alert(data.error);
        }
      })
      .catch(() => setDeletingId(null));
  };

  const fetchRecords = () => {
    const student_id = localStorage.getItem('student_id');

    if (!student_id) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/history/?student_id=${student_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.records) {
          setRecords(data.records);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="p-6 max-w-md mx-auto">
      <header className="mb-8 mt-4 border-b-2 border-green-900 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-green-900 mb-2 uppercase tracking-tight">
            History
          </h1>
          <p className="text-green-800 font-bold uppercase tracking-widest text-xs">
            Your recent attendance
          </p>
        </div>

        <button
          onClick={() => setIsAddingPastRecord(true)}
          className="bg-green-100 text-green-900 border-2 border-green-900 px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-green-200 active:translate-y-1 transition-transform"
        >
          + ADD PAST
        </button>
      </header>

      <div className="space-y-4">
        {months.length > 0 && !loading && (
          <div className="mb-6">
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full appearance-none p-4 font-black text-green-900 bg-white border-[3px] border-green-900 focus:outline-none focus:bg-green-50 tracking-widest text-lg shadow-[6px_6px_0px_0px_rgba(20,83,45,1)] transition-colors cursor-pointer"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <ChevronDown
                className="absolute right-5 top-1/2 -translate-y-1/2 text-green-900 pointer-events-none"
                size={32}
                strokeWidth={3}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="animate-spin text-green-900" size={32} />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white border-2 border-green-900 p-8 text-center">
            <p className="font-bold text-gray-500 uppercase tracking-widest">
              {records.length === 0
                ? 'No attendance records found.'
                : `No records for ${selectedMonth}.`}
            </p>
          </div>
        ) : (
          Object.keys(groupedByWeek)
            .sort((a, b) => b.localeCompare(a))
            .map((weekKey) => {
              const weekRecords = groupedByWeek[weekKey];
              const completedCount = weekRecords.filter(
                (r: any) => r.status === 'Completed'
              ).length;

              return (
                <div key={weekKey} className="mb-6">
                  <h2 className="bg-green-900 text-white font-black text-sm uppercase tracking-widest px-4 py-2 border-2 border-green-900 mb-3 w-max select-none shadow-[2px_2px_0px_0px_rgba(34,197,94,1)] flex items-center gap-3">
                    {weekKey}
                    <span className="bg-white text-green-900 px-2 py-0.5 text-xs border border-green-900 font-black">
                      {completedCount}/7
                    </span>
                  </h2>

                  <div className="space-y-4">
                    {weekRecords.map((r: any, i: number) => (
                      <div
                        key={r.id || i}
                        className="bg-white border-2 border-green-900 relative"
                      >
                        {/* header */}
                        <div
                          onClick={() =>
                            setExpandedId(expandedId === r.id ? null : r.id)
                          }
                          className="flex justify-between items-stretch border-b-2 border-green-900 bg-green-100 cursor-pointer hover:bg-green-200"
                        >
                          <div className="flex items-center gap-3 font-black text-green-900 text-sm px-4 py-3 uppercase tracking-wide leading-none">
                            <CalendarDays size={18} />
                            {r.date}
                            <Info
                              className={`ml-2 transition-transform ${expandedId === r.id ? 'rotate-180' : 'opacity-40'}`}
                              size={16}
                            />
                          </div>

                          <div
                            className={`flex items-center px-4 py-3 border-l-2 border-green-900 ${r.status === 'Completed' ? 'bg-green-300' : 'bg-green-200'}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-xs font-black tracking-widest uppercase text-green-900">
                              {r.status}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRecord(r);
                              }}
                              className="ml-3 hover:scale-110 hover:text-green-700 transition-transform cursor-pointer"
                            >
                              <Edit2 size={16} />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete(r.id);
                              }}
                              disabled={deletingId === r.id}
                              className="ml-3 hover:scale-110 transition-transform cursor-pointer"
                            >
                              {deletingId === r.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* expanded details */}

                        {expandedId === r.id && (
                          <div className="bg-gray-50 border-b-2 border-green-900 p-4 space-y-3">
                            <div className="flex justify-between">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-500">
                                  AM IN
                                </span>
                                <p className="font-black text-green-800 text-lg">
                                  {r.am_in || '--:--'}
                                </p>
                              </div>

                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-500">
                                  AM OUT
                                </span>
                                <p className="font-black text-rose-800 text-lg">
                                  {r.am_out || '--:--'}
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-between">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-500">
                                  PM IN
                                </span>
                                <p className="font-black text-green-800 text-lg">
                                  {r.pm_in || '--:--'}
                                </p>
                              </div>

                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-500">
                                  PM OUT
                                </span>
                                <p className="font-black text-rose-800 text-lg">
                                  {r.pm_out || '--:--'}
                                </p>
                              </div>
                            </div>

                            {r.remarks && (
                              <div className="bg-blue-100 border-l-4 border-blue-500 p-4">
                                <p className="text-sm text-blue-700">
                                  {r.remarks}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* footer */}

                        <div className="flex items-stretch justify-between text-sm bg-white">
                          <div className="flex flex-col justify-center p-4 flex-1">
                            <p className="text-[10px] font-black text-gray-500 mb-1 tracking-widest uppercase flex items-center gap-1">
                              <Clock
                                size={12}
                                strokeWidth={3}
                                className="text-green-600"
                              />{' '}
                              TIME IN
                            </p>
                            <p className="font-black text-gray-900 text-xl">
                              {r.in}
                            </p>
                          </div>

                          <div className="w-[2px] bg-green-900"></div>

                          <div className="flex flex-col justify-center p-4 flex-1 items-end text-right">
                            <p className="text-[10px] font-black text-gray-500 mb-1 tracking-widest uppercase flex items-center justify-end gap-1">
                              TIME OUT{' '}
                              <Clock
                                size={12}
                                strokeWidth={3}
                                className="text-rose-600"
                              />
                            </p>
                            <p className="font-black text-gray-900 text-xl">
                              {r.out}
                            </p>
                          </div>
                        </div>

                        {r.hours !== undefined && r.hours > 0 && (
                          <div className="bg-green-50 px-4 py-3 border-t-2 border-green-900 flex justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-green-900">
                              Total Hours
                            </span>
                            <span className="font-black text-lg text-green-800 uppercase">
                              {r.formatted_hours || `${r.hours} HRS`}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </div>

      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 w-full max-w-sm border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)]">
            <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-wide border-b-2 border-green-900 pb-2">
              Edit Record
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);

                const payload = {
                  record_id: editingRecord.id,
                  student_id: localStorage.getItem('student_id'),
                  am_in: String(formData.get('am_in') || ''),
                  am_out: String(formData.get('am_out') || ''),
                  pm_in: String(formData.get('pm_in') || ''),
                  pm_out: String(formData.get('pm_out') || ''),
                };

                setConfirmEdit(payload);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                    Morning In
                  </label>
                  <input
                    type="time"
                    name="am_in"
                    defaultValue={formatTimeForInput(editingRecord.am_in)}
                    className="w-full p-2 font-bold border-2 border-green-900 focus:outline-none focus:bg-green-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                    Morning Out
                  </label>
                  <input
                    type="time"
                    name="am_out"
                    defaultValue={formatTimeForInput(editingRecord.am_out)}
                    className="w-full p-2 font-bold border-2 border-green-900 focus:outline-none focus:bg-green-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                    Afternoon In
                  </label>
                  <input
                    type="time"
                    name="pm_in"
                    defaultValue={formatTimeForInput(editingRecord.pm_in)}
                    className="w-full p-2 font-bold border-2 border-green-900 focus:outline-none focus:bg-green-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                    Afternoon Out
                  </label>
                  <input
                    type="time"
                    name="pm_out"
                    defaultValue={formatTimeForInput(editingRecord.pm_out)}
                    className="w-full p-2 font-bold border-2 border-green-900 focus:outline-none focus:bg-green-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="bg-rose-100 text-rose-700 p-3 border-2 border-rose-900 hover:bg-rose-200 font-black uppercase"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="bg-green-700 text-white p-3 border-2 border-green-900 hover:bg-green-800 font-black uppercase"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white border-4 border-green-900 p-6 w-[320px] shadow-[8px_8px_0px_0px_rgba(20,83,45,1)] animate-scaleIn">
            <h3 className="font-black text-lg uppercase text-green-900 mb-4">
              Delete Record?
            </h3>

            <p className="text-sm font-bold text-gray-600 mb-6">
              Are you sure you want to delete this record?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-200 border-2 border-gray-600 p-2 font-black uppercase"
              >
                Cancel
              </button>

              <button
                disabled={savingRecord}
                onClick={() => {
                  setSavingRecord(true);

                  fetch(`${API_URL}/api/delete-record/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      student_id: localStorage.getItem('student_id'),
                      record_id: confirmDelete,
                    }),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.message) {
                        fetchRecords();
                      } else {
                        alert(data.error);
                      }
                    })
                    .finally(() => {
                      setSavingRecord(false);
                      setConfirmDelete(null);
                    });
                }}
                className="flex-1 bg-red-600 text-white border-2 border-red-900 p-2 font-black uppercase disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingRecord ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-4 border-green-900 p-6 w-[320px] shadow-[8px_8px_0px_0px_rgba(20,83,45,1)]">
            <h3 className="font-black text-lg uppercase text-green-900 mb-4">
              Save Changes?
            </h3>

            <p className="text-sm font-bold text-gray-600 mb-6">
              Do you want to save this edit?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEdit(null)}
                className="flex-1 bg-gray-200 border-2 border-gray-600 p-2 font-black uppercase"
              >
                Cancel
              </button>

              <button
                disabled={savingRecord}
                onClick={() => {
                  setSavingRecord(true);

                  fetch(`${API_URL}/api/edit-record/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(confirmEdit),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.message) {
                        setEditingRecord(null);
                        fetchRecords();
                      } else {
                        alert(data.error);
                      }
                    })
                    .finally(() => {
                      setSavingRecord(false);
                      setConfirmEdit(null);
                    });
                }}
                className="flex-1 bg-green-700 text-white border-2 border-green-900 p-2 font-black uppercase disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingRecord ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
