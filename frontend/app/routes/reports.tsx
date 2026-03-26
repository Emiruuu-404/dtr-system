import { useState, useEffect, useRef } from 'react';
import { FileText, Eye, PieChart, Upload } from 'lucide-react';
import { API_URL } from '../config';

export default function Reports() {
  const [status, setStatus] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [dayType, setDayType] = useState('Regular');
  const [period, setPeriod] = useState('full');
  const [supervisor, setSupervisor] = useState('');
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // New state for uploading
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ihiwalay ang fetch function para pwedeng i-call ulit pagkatapos mag-upload
  const fetchReportData = () => {
    const student_id = localStorage.getItem('student_id');
    if (!student_id) return;

    Promise.all([
      fetch(`${API_URL}/api/status/?student_id=${student_id}`).then(res => res.json()),
      new Promise(resolve => setTimeout(resolve, 800))
    ]).then(([data]) => {
      setReportData(data);
    });
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Function para sa File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const student_id = localStorage.getItem('student_id');
    if (!student_id) {
      setStatus('Error: Missing Student ID');
      setTimeout(() => setStatus(null), 3000);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('student_id', student_id);

    setIsUploading(true);
    setStatus('Uploading and processing document...');

    try {
      const response = await fetch(`${API_URL}/api/upload-dtr/`, {
        method: 'POST',
        body: formData,
        // Note: Don't set Content-Type header; fetch sets it automatically for FormData
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errData = await response.json();
          throw new Error(errData.error || 'Upload failed');
        }
        throw new Error(
          `Server Error: ${response.status} ${response.statusText}`
        );
      }

      setStatus('Document uploaded & processed successfully!');
      await fetchReportData(); // Await this to ensure state syncs up
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setStatus(errorMessage);
      console.error('Upload Error:', err);
    } finally {
      setIsUploading(false);
      setTimeout(() => setStatus(null), 4000);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    const student_id = localStorage.getItem('student_id');
    if (!student_id) return;

    setIsDownloadModalOpen(false);
    setStatus('Generating DTR Document...');

    try {
      const downloadUrl = `${API_URL}/api/download-dtr/?student_id=${student_id}&day_type=${encodeURIComponent(dayType)}&supervisor=${encodeURIComponent(supervisor)}&period=${encodeURIComponent(period)}`;
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        const errData = await response.json();
        setStatus(errData.error || 'Download failed');
        setTimeout(() => setStatus(null), 3000);
        return;
      }

      const disposition = response.headers.get('Content-Disposition');
      let filename = 'DTR_Report.pdf';
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setStatus('DTR Generated Successfully!');
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus('Download failed. Please try again.');
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const openPreview = () => {
    setIsDownloadModalOpen(true);
    const student_id = localStorage.getItem('student_id');
    if (!student_id) return;

    setIsPreviewLoading(true);
    fetch(`${API_URL}/api/history/?student_id=${student_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.records) {
          setHistoryRecords(data.records);
        }
        setIsPreviewLoading(false);
      })
      .catch(() => setIsPreviewLoading(false));
  };



  const totalHours = reportData?.total_hours || 0;
  const totalRequired = reportData?.total_required || 486;
  const progressPercent = Math.min(
    100,
    Math.max(0, (totalHours / totalRequired) * 100)
  );
  const currentMonthYear = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-6 max-w-md mx-auto">
      <header className="mb-8 mt-4 text-center border-b-2 border-green-900 pb-6">
        <div className="w-20 h-20 bg-green-200 border-2 border-green-900 flex items-center justify-center mx-auto mb-5 rotate-3 relative hover:rotate-0 transition-transform">
          <div className="absolute inset-0 bg-green-400 -z-10 translate-x-1 translate-y-1 border-2 border-green-900 hidden"></div>
          <FileText size={36} strokeWidth={3} className="text-green-900" />
        </div>
        <h1 className="text-3xl font-black text-green-900 mb-2 uppercase tracking-tight">
          Reports
        </h1>
        <p className="text-green-800 font-bold uppercase tracking-widest text-xs">
          Daily Time Record
        </p>
      </header>

      {status && (
        <div className="mb-4 p-4 border-2 border-green-900 bg-green-100 text-green-900 font-bold text-center uppercase tracking-wider text-sm transition-all">
          {status}
        </div>
      )}

      <div className="grid gap-4 mt-4">
        {!reportData ? (
          <div className="bg-white p-7 border-2 border-green-900 relative shadow-[4px_4px_0px_0px_rgba(20,83,45,1)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 bg-gray-200 animate-pulse rounded-full shrink-0"></div>
              <div className="h-6 w-40 bg-gray-200 animate-pulse"></div>
            </div>

            <div className="flex items-end justify-between mb-3 border-b-2 border-dashed border-gray-200 pb-2">
              <div className="h-3 w-24 bg-gray-200 animate-pulse mb-1"></div>
              <div className="h-8 w-28 bg-gray-200 animate-pulse"></div>
            </div>

            <div className="w-full bg-green-50 border-2 border-green-200 h-6 mb-8 relative animate-pulse"></div>

            <div className="space-y-4">
              <div className="w-full h-[56px] border-2 border-green-100 bg-gray-200 animate-pulse"></div>
              <div className="w-full h-[56px] border-2 border-green-100 bg-gray-200 animate-pulse"></div>
              <div className="w-full h-[56px] border-2 border-green-100 bg-gray-200 animate-pulse"></div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-7 border-2 border-green-900 relative">
            <div className="absolute inset-0 bg-green-900 -z-10 translate-x-1 translate-y-1"></div>

            <h3 className="font-black text-gray-900 text-xl mb-6 flex items-center gap-3 uppercase tracking-wide">
              <PieChart className="text-green-700" strokeWidth={3} size={24} />
              {currentMonthYear}
            </h3>

            <div className="flex items-end justify-between mb-3 border-b-2 border-dashed border-gray-300 pb-2">
              <p className="font-black text-gray-600 text-xs uppercase tracking-widest">
                Total Progress
              </p>
              <p className="font-black text-green-700 text-2xl">
                {totalHours}{' '}
                <span className="text-sm text-gray-500">
                  / {totalRequired} Hrs
                </span>
              </p>
            </div>

            <div className="w-full bg-green-100 border-2 border-green-900 h-6 mb-8 overflow-hidden relative">
              <div
                className="bg-green-600 h-full border-r-2 border-green-900 relative transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,1) 5px, rgba(0,0,0,1) 10px)',
                  }}
                ></div>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx"
              className="hidden"
            />

            <div className="space-y-4">
              <button
                onClick={openPreview}
                className="w-full bg-green-700 border-2 border-green-900 text-white p-4 hover:bg-green-800 transition-colors flex items-center justify-center gap-3 font-black text-lg uppercase tracking-widest active:translate-x-1 active:translate-y-1 relative"
              >
                <Eye size={24} strokeWidth={3} />
                View DTR
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full bg-green-100 text-green-900 p-4 border-2 border-green-900 hover:bg-green-200 transition-colors flex items-center justify-center gap-3 font-black text-lg uppercase tracking-widest active:translate-x-1 active:translate-y-1 relative disabled:opacity-50"
              >
                {isUploading ? (
                  <div className="w-6 h-6 border-4 border-green-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Upload size={24} strokeWidth={3} />
                )}
                {isUploading ? 'Uploading...' : 'Upload DTR'}
              </button>


            </div>
          </div>
        )}
      </div>

      {/* Modal remains the same */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          {/* Your existing modal code */}
          <div className="bg-white p-6 w-full max-w-4xl border-4 border-green-900 shadow-[8px_8px_0px_0px_rgba(20,83,45,1)] my-auto max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b-2 border-green-900 pb-3">
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-wide">
                  DTR Preview
                </h3>
                <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
                  {currentMonthYear}
                </p>
              </div>
              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="text-rose-600 hover:bg-rose-100 p-2 font-black uppercase text-sm border-2 border-transparent hover:border-rose-900 transition-colors"
              >
                X CLOSE
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border-2 border-green-900 mb-6 bg-white hidden-scrollbar">
              <table className="w-full text-center text-xs font-bold uppercase border-collapse">
                <thead className="bg-green-900 text-white sticky top-0 z-10 shadow-md">
                  <tr>
                    <th className="py-3 px-2 border-r-2 border-green-800">
                      Day
                    </th>
                    <th className="py-3 px-2 border-r-2 border-green-800">
                      AM IN
                    </th>
                    <th className="py-3 px-2 border-r-2 border-green-800">
                      AM OUT
                    </th>
                    <th className="py-3 px-2 border-r-2 border-green-800">
                      PM IN
                    </th>
                    <th className="py-3 px-2">PM OUT</th>
                  </tr>
                </thead>
                <tbody>
                  {isPreviewLoading ? (
                    <tr>
                      <td colSpan={5} className="py-20">
                        <div className="flex justify-center flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-green-900 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-green-900 text-[10px] tracking-widest">
                            LOADING PREVIEW
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const now = new Date();
                      const daysInMonth = new Date(
                        now.getFullYear(),
                        now.getMonth() + 1,
                        0
                      ).getDate();
                      const monthName = now.toLocaleString('default', {
                        month: 'short',
                      });
                      const year = now.getFullYear();

                      return Array.from(
                        { length: daysInMonth },
                        (_, i) => i + 1
                      ).map((day) => {
                        const dayStr = day.toString().padStart(2, '0');
                        const targetDateStr = `${monthName} ${dayStr}, ${year}`;
                        const record = historyRecords.find(
                          (r) => r.date === targetDateStr
                        );

                        return (
                          <tr
                            key={day}
                            className="border-b-2 border-gray-200 hover:bg-green-50 transition-colors"
                          >
                            <td className="py-2 px-2 border-r-2 border-gray-200 text-green-900 bg-green-100/50">
                              {day}
                            </td>
                            <td className="py-2 px-2 border-r-2 border-gray-200 text-green-800">
                              {record?.am_in && record.am_in !== '--:--'
                                ? record.am_in
                                : ''}
                            </td>
                            <td className="py-2 px-2 border-r-2 border-gray-200 text-rose-800">
                              {record?.am_out && record.am_out !== '--:--'
                                ? record.am_out
                                : ''}
                            </td>
                            <td className="py-2 px-2 border-r-2 border-gray-200 text-green-800">
                              {record?.pm_in && record.pm_in !== '--:--'
                                ? record.pm_in
                                : ''}
                            </td>
                            <td className="py-2 px-2 text-rose-800">
                              {record?.pm_out && record.pm_out !== '--:--'
                                ? record.pm_out
                                : ''}
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>

            <form
              onSubmit={triggerDownload}
              className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-green-50 p-4 border-2 border-green-900"
            >
              <div className="md:col-span-1">
                <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                  Period
                </label>
                <select
                  name="period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full p-3 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-white uppercase text-xs"
                >
                  <option value="full">Full DTR</option>
                  <option value="1st_half">1st to 15th</option>
                  <option value="2nd_half">16th to End</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                  Check Mark
                </label>
                <select
                  name="day_type"
                  value={dayType}
                  onChange={(e) => setDayType(e.target.value)}
                  className="w-full p-3 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-white uppercase text-xs"
                >
                  <option value="Regular">Regular Days</option>
                  <option value="Saturdays">Saturdays</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black tracking-widest uppercase text-gray-500 mb-2">
                  Supervisor In-Charge{' '}
                  <span className="text-gray-400 font-normal lowercase">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  name="supervisor"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  placeholder="Enter Name"
                  className="w-full p-3 font-bold text-gray-900 border-2 border-green-900 focus:outline-none focus:bg-white uppercase text-xs"
                />
              </div>
              <div className="md:col-span-1">
                <button
                  type="submit"
                  disabled={isPreviewLoading}
                  className="w-full bg-green-700 text-white p-3 border-2 border-green-900 hover:bg-green-800 font-black uppercase tracking-wider flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  <FileText
                    size={18}
                    className="group-hover:scale-110 transition-transform"
                  />{' '}
                  <span className="text-sm">DOWNLOAD</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
