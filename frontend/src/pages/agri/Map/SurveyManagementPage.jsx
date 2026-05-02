import { useState, useMemo } from "react";
import { useHogSurveys } from "/src/hooks/useHogSurveys";
import { useGetMaps } from "/src/hooks/useMaps";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Activity,
  Calendar,
  MapPin,
  BarChart2,
  X,
  Check,
} from "lucide-react";
import DateFormatter from "/src/components/DateFormatter";
import Pagination from "/src/components/Pagination";

const SurveyManagementPage = () => {
  // Pagination state
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);

  // Hook for survey data
  const { useGetSurveys, useCreateSurvey, useUpdateSurvey, useDeleteSurvey } =
    useHogSurveys();
  const { data, isLoading: surveysLoading } = useGetSurveys(limit, offset);
  const { data: barangays } = useGetMaps();

  // Mutations
  const createSurvey = useCreateSurvey();
  const updateSurvey = useUpdateSurvey();
  const deleteSurvey = useDeleteSurvey();

  // Component state
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [formData, setFormData] = useState({
    barangay: "",
    survey_date: new Date().toISOString().split("T")[0],
    inahin: 0,
    barako: 0,
    fattener: 0,
    grower: 0,
    bulaw: 0,
    starter: 0,
  });

  const surveys = data?.results || [];
  const count = data?.count || 0;

  // Filter surveys based on search term
  const filteredSurveys = useMemo(() => {
    if (!surveys) return [];
    return surveys.filter((s) =>
      s.barangay_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [surveys, searchTerm]);

  // Handle opening the registration/edit modal
  const handleOpenModal = (survey = null) => {
    if (survey) {
      setEditingSurvey(survey);
      // Find the barangay ID by name for the select input
      const b = barangays?.find((bg) => bg.name === survey.barangay_name);
      setFormData({
        barangay: b?.id || "",
        survey_date: survey.survey_date,
        inahin: survey.inahin,
        barako: survey.barako,
        fattener: survey.fattener,
        grower: survey.grower,
        bulaw: survey.bulaw,
        starter: survey.starter,
      });
    } else {
      setEditingSurvey(null);
      setFormData({
        barangay: "",
        survey_date: new Date().toISOString().split("T")[0],
        inahin: 0,
        barako: 0,
        fattener: 0,
        grower: 0,
        bulaw: 0,
        starter: 0,
      });
    }
    setIsModalOpen(true);
  };

  // Handle form field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "barangay" || name === "survey_date"
          ? value
          : parseInt(value) || 0,
    }));
  };

  // Submit the survey record to the backend
  const handleSubmit = (e) => {
    e.preventDefault();
    // Calculate total_pigs before sending
    const total_pigs =
      formData.inahin +
      formData.barako +
      formData.fattener +
      formData.grower +
      formData.bulaw +
      formData.starter;
    const payload = { ...formData, total_pigs };

    if (editingSurvey) {
      updateSurvey.mutate(
        { id: editingSurvey.id, data: payload },
        { onSuccess: () => setIsModalOpen(false) }
      );
    } else {
      createSurvey.mutate(payload, { onSuccess: () => setIsModalOpen(false) });
    }
  };

  // Handle record deletion
  const handleDelete = (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this survey record? This will affect the Geospatial Map analytics."
      )
    ) {
      deleteSurvey.mutate(id);
    }
  };

  // Loading state view
  if (surveysLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <span className="loading loading-spinner loading-lg text-green-600"></span>
        <p className="text-gray-500 font-black uppercase text-[10px] animate-pulse">
          Synchronizing Survey Database...
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header section with page title and action button */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-gray-200 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="text-green-600" size={20} />
            <h1 className="text-3xl font-black text-gray-900 uppercase">
              Survey Management
            </h1>
          </div>
          <p className="text-gray-500 text-sm font-medium">
            Maintain Municipal Hog Population Data & Geospatial Insights
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-xs font-black uppercase flex items-center gap-2 rounded-none transition-all shadow-sm active:scale-95"
        >
          <Plus size={16} /> Register New Survey
        </button>
      </div>

      {/* Search and filtering controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by Barangay..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-none focus:outline-none focus:border-green-600 font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main survey data table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">
                Date
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">
                Barangay
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">
                Total Hogs
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">
                Type Distribution
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSurveys.map((survey) => (
              <tr
                key={survey.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-900 font-mono text-xs font-bold">
                    <Calendar size={14} className="text-gray-400" />
                    <DateFormatter dateString={survey.survey_date} />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-900 font-black uppercase text-xs">
                    <MapPin size={14} className="text-green-600" />
                    {survey.barangay_name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-gray-900 font-mono">
                      {survey.total_pigs}
                    </span>
                    <span className="text-[10px] font-black uppercase text-gray-400">
                      Heads
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-black uppercase">
                      In:{survey.inahin}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[9px] font-black uppercase">
                      Ba:{survey.barako}
                    </span>
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-[9px] font-black uppercase">
                      Fa:{survey.fattener}
                    </span>
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[9px] font-black uppercase">
                      Gr:{survey.grower}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleOpenModal(survey)}
                    className="p-2 hover:bg-gray-100 text-gray-600 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(survey.id)}
                    className="p-2 hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state view */}
        {filteredSurveys.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-2">
            <BarChart2 size={40} className="text-gray-200" />
            <p className="text-gray-400 text-xs font-black uppercase">
              No matching survey records found
            </p>
          </div>
        )}

        {/* Server-side pagination component */}
        <Pagination
          count={count}
          limit={limit}
          offset={offset}
          onPageChange={setOffset}
        />
      </div>

      {/* Create/Edit Survey Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-none shadow-2xl border border-gray-900 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-900 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-white text-xl font-black uppercase">
                  {editingSurvey
                    ? "Update Survey Record"
                    : "New Survey Registration"}
                </h2>
                <p className="text-gray-400 text-[10px] font-black uppercase">
                  GIS Data Entry Protocol
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">
                    Target Barangay
                  </label>
                  <select
                    name="barangay"
                    required
                    className="w-full p-3 bg-white border border-gray-200 rounded-none focus:outline-none focus:border-green-600 font-bold text-xs uppercase"
                    value={formData.barangay}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Barangay...</option>
                    {barangays?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">
                    Survey Date
                  </label>
                  <input
                    type="date"
                    name="survey_date"
                    required
                    className="w-full p-3 bg-white border border-gray-200 rounded-none focus:outline-none focus:border-green-600 font-mono text-xs font-bold"
                    value={formData.survey_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-gray-400 border-b border-gray-100 pb-2">
                  Population Breakdown (Heads)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Inahin", name: "inahin" },
                    { label: "Barako", name: "barako" },
                    { label: "Fattener", name: "fattener" },
                    { label: "Grower", name: "grower" },
                    { label: "Bulaw", name: "bulaw" },
                    { label: "Starter", name: "starter" },
                  ].map((field) => (
                    <div key={field.name} className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-500">
                        {field.label}
                      </label>
                      <input
                        type="number"
                        name={field.name}
                        min="0"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-none focus:outline-none focus:border-green-600 font-mono text-sm font-bold"
                        value={formData[field.name]}
                        onChange={handleInputChange}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 border border-gray-200 text-[10px] font-black uppercase hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSurvey.isPending || updateSurvey.isPending}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {createSurvey.isPending || updateSurvey.isPending ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Check size={16} />
                  )}
                  {editingSurvey ? "Update Records" : "Commit to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyManagementPage;
