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
  // Add this state at the top of your History component:
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarViewMonth, setCalendarViewMonth] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  // Replace the date input block with this:
  const MONTHS = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const firstDayOfMonth = calendarViewMonth.getDay();
  const daysInMonth = new Date(
    calendarViewMonth.getFullYear(),
    calendarViewMonth.getMonth() + 1,
    0
  ).getDate();
  const nextMonthStart = new Date(
    calendarViewMonth.getFullYear(),
    calendarViewMonth.getMonth() + 1,
    1
  );

  const formatTimeForInput = (timeStr: string, isPM = false) => {
    if (!timeStr || timeStr === '--:--') return '';

    const match = timeStr.match(/(\d{2}):(\d{2})\s*(AM|PM)?/i);

    if (match) {
      let [_, hours, mins, period] = match;
      let h = parseInt(hours, 10);

      if (period) {
        if (period.toUpperCase() === 'PM' && h < 12) h += 12;
        if (period.toUpperCase() === 'AM' && h === 12) h = 0;
      } else if (isPM && h < 12) {
        // 🔥 FORCE PM if no AM/PM
        h += 12;
      }

      return `${h.toString().padStart(2, '0')}:${mins}`;
    }

    return timeStr;
  };

  const getMonthYear = (dateStr: string) => {
    if (!dateStr || dateStr === 'Unknown') return 'UNKNOWN';

    const d = new Date(dateStr);

    if (isNaN(d.getTime())) return 'UNKNOWN';

    return `${d
      .toLocaleString('en-US', {
        month: 'long',
      })
      .toUpperCase()} ${d.getFullYear()}`;
  };

  const handleSubmitEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setConfirmEdit({
      student_id: localStorage.getItem('student_id'),
      record_id: editingRecord.id,
      am_in: formData.get('am_in'),
      am_out: formData.get('am_out'),
      pm_in: formData.get('pm_in'),
      pm_out: formData.get('pm_out'),
    });
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
      // Mas safe na paraan para i-parse ang "March 13, 2026"
      const cleanDate = r.date.replace(',', '');
      const d = new Date(cleanDate);

      if (isNaN(d.getTime())) {
        const key = 'Other'; // Imbes na "Unknown" para hindi mag-clash
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

  const [errorAlert, setErrorAlert] = useState<{
    date: string;
    isVisible: boolean;
  } | null>(null);

  const CustomDuplicateErrorAlert = () => {
    if (!errorAlert || !errorAlert.isVisible) return null;

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white border-[4px] border-green-900 p-8 shadow-[10px_10px_0px_0px_rgba(20,83,45,1)] w-full max-w-[320px] animate-in zoom-in-95 duration-200">
          {/* Header with Icon */}
          <div className="flex items-center gap-3 mb-6 border-b-2 border-green-900 pb-3">
            <div className="bg-red-100 p-2 border-2 border-red-900">
              <Trash2 className="text-red-900" size={24} strokeWidth={3} />
            </div>
            <h3 className="font-black text-xl uppercase tracking-tight text-green-900 italic">
              Entry Error
            </h3>
          </div>

          {/* Message */}
          <div className="text-center mb-6">
            <p className="font-black text-gray-800 uppercase tracking-widest text-sm mb-2">
              Record already exists!
            </p>
            <div className="bg-green-100 border-2 border-green-900 px-3 py-1.5 inline-block">
              <p className="font-black text-green-900 text-base">
                {errorAlert.date}
              </p>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase mt-4">
              A record for this date is already in your history.
            </p>
          </div>

          {/* Button */}
          <button
            onClick={() => setErrorAlert(null)}
            className="w-full bg-green-900 text-white p-4 font-black uppercase tracking-widest border-2 border-green-900 hover:bg-green-800 active:translate-y-1 transition-transform shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]"
          >
            I Understand
          </button>
        </div>
      </div>
    );
  };

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
                                  {r.am_in || r.in || r.am_time_in || '--:--'}
                                </p>
                              </div>

                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-500">
                                  AM OUT
                                </span>
                                <p className="font-black text-rose-800 text-lg">
                                  {r.am_out ||
                                    r.out ||
                                    r.am_time_out ||
                                    '--:--'}
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-between">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-500">
                                  PM IN
                                </span>
                                <p className="font-black text-green-800 text-lg">
                                  {r.pm_in || r.pm_time_in || '--:--'}
                                </p>
                              </div>

                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-500">
                                  PM OUT
                                </span>
                                <p className="font-black text-rose-800 text-lg">
                                  {r.pm_out || r.pm_time_out || '--:--'}
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
                              {r.in || r.am_time_in || '--:--'}
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
                              {r.out || r.am_time_out || '--:--'}
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

            <form onSubmit={handleSubmitEdit} className="space-y-4">
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

      {isAddingPastRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 w-full max-w-sm border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)]">
            <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-wide border-b-2 border-green-900 pb-2">
              Add Past Record
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (savingRecord) return; // Proteksyon laban sa double click

                const formData = new FormData(e.currentTarget);
                const selectedDate = String(formData.get('date'));

                const isDuplicate = records.some((r) => {
                  const rawDate = r.date?.replace(',', '').trim();
                  const recordDate = new Date(rawDate);

                  if (isNaN(recordDate.getTime())) return false;

                  // Use LOCAL time (not UTC) to avoid timezone shift
                  const year = recordDate.getFullYear();
                  const month = String(recordDate.getMonth() + 1).padStart(
                    2,
                    '0'
                  );
                  const day = String(recordDate.getDate()).padStart(2, '0');
                  const formattedRecordDate = `${year}-${month}-${day}`;

                  return formattedRecordDate === selectedDate;
                });

                if (isDuplicate) {
                  setSavingRecord(false);
                  setErrorAlert({
                    date: selectedDate,
                    isVisible: true,
                  });
                  return;
                }

                const formatDateTime = (time: string) => {
                  if (!time) return null;
                  return `${selectedDate} ${time}:00`;
                };

                const payload = {
                  student_id: localStorage.getItem('student_id'),
                  date: selectedDate,
                  am_in: formatDateTime(String(formData.get('am_in') || '')),
                  am_out: formatDateTime(String(formData.get('am_out') || '')),
                  pm_in: formatDateTime(String(formData.get('pm_in') || '')),
                  pm_out: formatDateTime(String(formData.get('pm_out') || '')),
                };

                // 3. START SAVING
                setSavingRecord(true);

                fetch(`${API_URL}/api/add-past-record/`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                })
                  .then((res) => {
                    if (!res.ok) throw new Error('Server error');
                    return res.json();
                  })
                  .then((data) => {
                    if (data.message) {
                      // I-close agad ang modal at i-refresh ang listahan
                      setIsAddingPastRecord(false);
                      fetchRecords();
                    } else {
                      alert(data.error || 'Failed to save record.');
                    }
                  })
                  .catch((err) => {
                    alert('Network Error: ' + err.message);
                  })
                  .finally(() => {
                    setSavingRecord(false);
                  });
              }}
            >
              {/* DATE — replace the existing date <div> block */}

              <div>
                <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                  Date
                </label>

                {/* Hidden input for form submission */}
                <input
                  type="hidden"
                  name="date"
                  value={toDateKey(calendarDate)}
                />

                {/* Calendar */}
                <div className="border-2 border-green-900">
                  {/* Month nav */}
                  <div className="flex items-center justify-between bg-green-900 px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarViewMonth(
                          new Date(
                            calendarViewMonth.getFullYear(),
                            calendarViewMonth.getMonth() - 1,
                            1
                          )
                        )
                      }
                      className="text-white font-black text-lg px-2 hover:bg-green-700"
                    >
                      ‹
                    </button>
                    <span className="text-white font-black text-xs tracking-widest uppercase">
                      {MONTHS[calendarViewMonth.getMonth()]}{' '}
                      {calendarViewMonth.getFullYear()}
                    </span>
                    <button
                      type="button"
                      disabled={nextMonthStart > today}
                      onClick={() => {
                        if (nextMonthStart <= today)
                          setCalendarViewMonth(nextMonthStart);
                      }}
                      className="text-white font-black text-lg px-2 hover:bg-green-700 disabled:opacity-30"
                    >
                      ›
                    </button>
                  </div>

                  {/* Day labels */}
                  <div className="grid grid-cols-7 bg-green-100 border-b-2 border-green-900">
                    {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d) => (
                      <div
                        key={d}
                        className="text-center text-[9px] font-black text-green-900 py-1"
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-[1px] bg-green-900 p-[1px]">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`blank-${i}`} className="bg-white" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const date = new Date(
                        calendarViewMonth.getFullYear(),
                        calendarViewMonth.getMonth(),
                        i + 1
                      );
                      const isFuture = date > today;
                      const isToday = toDateKey(date) === toDateKey(today);
                      const isSelected =
                        toDateKey(date) === toDateKey(calendarDate);
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={isFuture}
                          onClick={() => setCalendarDate(date)}
                          className={`
              text-xs font-black py-2 transition-colors
              ${
                isFuture
                  ? 'bg-white text-gray-300 cursor-not-allowed'
                  : isSelected
                    ? 'bg-green-900 text-white'
                    : isToday
                      ? 'bg-green-200 text-green-900'
                      : 'bg-white text-gray-900 hover:bg-green-100'
              }
            `}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected date display */}
                <div className="bg-green-100 border-2 border-t-0 border-green-900 px-3 py-2 flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                    Selected
                  </span>
                  <span className="font-black text-xs text-green-900 uppercase tracking-wide">
                    {calendarDate
                      .toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                      .toUpperCase()}
                  </span>
                </div>
              </div>

              {/* TIME GRID (same as edit) */}
              {/* TIME GRID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                    Morning In
                  </label>
                  <input
                    type="time"
                    name="am_in"
                    defaultValue="08:00"
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
                    defaultValue="12:00"
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
                    defaultValue="13:00"
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
                    defaultValue="17:00"
                    className="w-full p-2 font-bold border-2 border-green-900 focus:outline-none focus:bg-green-50"
                  />
                </div>
              </div>

              {/* BUTTONS (same style) */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingPastRecord(false)}
                  className="bg-rose-100 text-rose-700 p-3 border-2 border-rose-900 hover:bg-rose-200 font-black uppercase"
                >
                  Cancel
                </button>

                <button
                  type="submit" // Siguraduhing may type="submit"
                  disabled={savingRecord}
                  className="bg-green-700 text-white p-3 border-2 border-green-900 hover:bg-green-800 font-black uppercase flex items-center justify-center gap-2"
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
            </form>
          </div>
        </div>
      )}

      {savingRecord && !confirmEdit && !confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border-[4px] border-green-900 p-8 shadow-[10px_10px_0px_0px_rgba(20,83,45,1)] flex flex-col items-center gap-6 min-w-[280px] animate-in fade-in zoom-in duration-200">
            <div className="relative">
              {/* Custom Spinner */}
              <div className="w-16 h-16 border-[6px] border-green-100 border-t-green-900 rounded-full animate-spin"></div>
              <Clock
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-900"
                size={24}
                strokeWidth={3}
              />
            </div>

            <div className="text-center">
              <h3 className="font-black text-xl uppercase tracking-tight text-green-900 italic">
                Saving Record...
              </h3>
              <p className="text-[10px] font-black text-green-700 uppercase tracking-[0.2em] mt-2 bg-green-100 border-2 border-green-900 px-2 py-1">
                Syncing to Database
              </p>
            </div>
          </div>
        </div>
      )}
      <CustomDuplicateErrorAlert />
    </div>
  );
}
