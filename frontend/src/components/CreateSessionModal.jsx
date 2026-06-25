import { Code2Icon, LoaderIcon, PlusIcon, BookOpenIcon, Edit3Icon } from "lucide-react";
import { PROBLEMS } from "../data/problems";
import { useState } from "react";
import CustomProblemForm from "./CustomProblemForm";

function CreateSessionModal({
  isOpen,
  onClose,
  roomConfig,
  setRoomConfig,
  onCreateRoom,
  isCreating,
}) {
  const problems = Object.values(PROBLEMS);
  const [activeTab, setActiveTab] = useState("library"); // 'library' or 'custom'

  if (!isOpen) return null;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "library") {
      setRoomConfig({ ...roomConfig, customProblem: null, problem: "", difficulty: "" });
    } else {
      setRoomConfig({ 
        ...roomConfig, 
        problem: "", 
        difficulty: "",
        customProblem: {
          title: "",
          difficulty: "medium",
          description: { text: "" },
          examples: []
        }
      });
    }
  };

  const handleCustomProblemChange = (newCustomProblem) => {
    setRoomConfig({ ...roomConfig, customProblem: newCustomProblem });
  };

  const getSummaryTitle = () => {
    if (activeTab === "custom") {
      return roomConfig.customProblem?.title || "Chưa nhập tiêu đề";
    }
    return roomConfig.problem || "Chưa chọn (Phỏng vấn trước)";
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-2xl mb-6">Tạo Session mới</h3>

        {/* TABS */}
        <div className="tabs tabs-boxed mb-6">
          <button 
            className={`tab gap-2 flex-1 ${activeTab === 'library' ? 'tab-active' : ''}`}
            onClick={() => handleTabChange("library")}
          >
            <BookOpenIcon className="size-4" /> Từ thư viện
          </button>
          <button 
            className={`tab gap-2 flex-1 ${activeTab === 'custom' ? 'tab-active' : ''}`}
            onClick={() => handleTabChange("custom")}
          >
            <Edit3Icon className="size-4" /> Tự soạn đề
          </button>
        </div>

        <div className="space-y-6">
          {activeTab === "library" ? (
            <div className="space-y-2">
              <label className="label">
                <span className="label-text font-semibold">Chọn bài tập (Tuỳ chọn)</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={roomConfig.problem}
                onChange={(e) => {
                  if (e.target.value === "") {
                    setRoomConfig({ ...roomConfig, problem: "", difficulty: "" });
                    return;
                  }
                  const selectedProblem = problems.find((p) => p.title === e.target.value);
                  setRoomConfig({
                    ...roomConfig,
                    difficulty: selectedProblem.difficulty,
                    problem: e.target.value,
                  });
                }}
              >
                <option value="">
                  Chưa chọn (Phỏng vấn trước)
                </option>

                {problems.map((problem) => (
                  <option key={problem.id} value={problem.title}>
                    {problem.title} ({problem.difficulty})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <CustomProblemForm 
              customProblem={roomConfig.customProblem} 
              setCustomProblem={handleCustomProblemChange} 
            />
          )}

          {/* ROOM SUMMARY */}
          <div className="alert alert-success mt-4">
            <Code2Icon className="size-5" />
            <div>
              <p className="font-semibold">Tóm tắt Session:</p>
              <p>
                Bài tập: <span className="font-medium">{getSummaryTitle()}</span>
              </p>
              <p>
                Số người tham gia tối đa: <span className="font-medium">2 (1-kèm-1)</span>
              </p>
            </div>
          </div>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>

          <button
            className="btn btn-primary gap-2"
            onClick={onCreateRoom}
            disabled={isCreating || (activeTab === "custom" && !roomConfig.customProblem?.title)}
          >
            {isCreating ? (
              <LoaderIcon className="size-5 animate-spin" />
            ) : (
              <PlusIcon className="size-5" />
            )}

            {isCreating ? "Đang tạo..." : "Tạo mới"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
export default CreateSessionModal;