import { PlusIcon, Trash2Icon } from "lucide-react";

function CustomProblemForm({ customProblem, setCustomProblem }) {
  const handleAddExample = () => {
    setCustomProblem({
      ...customProblem,
      examples: [...customProblem.examples, { input: "", output: "", explanation: "" }],
    });
  };

  const handleRemoveExample = (index) => {
    const newExamples = [...customProblem.examples];
    newExamples.splice(index, 1);
    setCustomProblem({ ...customProblem, examples: newExamples });
  };

  const handleExampleChange = (index, field, value) => {
    const newExamples = [...customProblem.examples];
    newExamples[index][field] = value;
    setCustomProblem({ ...customProblem, examples: newExamples });
  };

  return (
    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Tiêu đề bài tập</span>
        </label>
        <input
          type="text"
          placeholder="Ví dụ: Tính tổng 2 số"
          className="input input-bordered w-full"
          value={customProblem.title}
          onChange={(e) => setCustomProblem({ ...customProblem, title: e.target.value })}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Độ khó</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={customProblem.difficulty}
          onChange={(e) => setCustomProblem({ ...customProblem, difficulty: e.target.value })}
        >
          <option value="easy">Dễ (Easy)</option>
          <option value="medium">Trung bình (Medium)</option>
          <option value="hard">Khó (Hard)</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Mô tả bài tập</span>
        </label>
        <textarea
          className="textarea textarea-bordered h-24"
          placeholder="Nhập mô tả chi tiết yêu cầu bài tập..."
          value={customProblem.description.text}
          onChange={(e) =>
            setCustomProblem({
              ...customProblem,
              description: { text: e.target.value },
            })
          }
        ></textarea>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="label">
            <span className="label-text font-semibold">Ví dụ (Test cases)</span>
          </label>
          <button
            type="button"
            className="btn btn-sm btn-outline btn-primary gap-1"
            onClick={handleAddExample}
          >
            <PlusIcon className="w-4 h-4" /> Thêm ví dụ
          </button>
        </div>

        {customProblem.examples.map((example, index) => (
          <div key={index} className="bg-base-200 p-4 rounded-lg relative space-y-3">
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost absolute top-2 right-2 text-error"
              onClick={() => handleRemoveExample(index)}
              title="Xóa ví dụ này"
            >
              <Trash2Icon className="w-4 h-4" />
            </button>
            <h4 className="font-medium text-sm">Ví dụ {index + 1}</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs">Input</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: a = 1, b = 2"
                  className="input input-sm input-bordered"
                  value={example.input}
                  onChange={(e) => handleExampleChange(index, "input", e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs">Output</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: 3"
                  className="input input-sm input-bordered"
                  value={example.output}
                  onChange={(e) => handleExampleChange(index, "output", e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">Giải thích (Không bắt buộc)</span>
              </label>
              <input
                type="text"
                placeholder="VD: Vì 1 + 2 = 3"
                className="input input-sm input-bordered"
                value={example.explanation}
                onChange={(e) => handleExampleChange(index, "explanation", e.target.value)}
              />
            </div>
          </div>
        ))}

        {customProblem.examples.length === 0 && (
          <div className="text-center p-4 border border-dashed border-base-300 rounded-lg text-base-content/50 text-sm">
            Chưa có ví dụ nào. Hãy thêm ví dụ để ứng viên dễ hiểu hơn.
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomProblemForm;
