import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useEndSession, useJoinSession, useSessionById, useStartCodeTest } from "../hooks/useSessions";
import { PROBLEMS } from "../data/problems";
import { executeCode } from "../lib/piston";
import Navbar from "../components/Navbar";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { getDifficultyBadgeClass } from "../lib/utils";
import { Loader2Icon, LogOutIcon, PhoneOffIcon, Code2Icon, BookOpenIcon, Edit3Icon } from "lucide-react";
import CodeEditorPanel from "../components/CodeEditorPanel";
import OutputPanel from "../components/OutputPanel";

import useStreamClient from "../hooks/useStreamClient";
import { StreamCall, StreamVideo } from "@stream-io/video-react-sdk";
import VideoCallUI from "../components/VideoCallUI";
import CustomProblemForm from "../components/CustomProblemForm";
import toast from "react-hot-toast";
import { socket } from "../lib/socket";

function SessionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUser();
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const { data: sessionData, isLoading: loadingSession, refetch } = useSessionById(id);

  const joinSessionMutation = useJoinSession();
  const endSessionMutation = useEndSession();
  const startCodeTestMutation = useStartCodeTest();

  const [showCodeTestModal, setShowCodeTestModal] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState("");
  const [activeTab, setActiveTab] = useState("library");
  const [customProblem, setCustomProblem] = useState({
    title: "",
    difficulty: "medium",
    description: { text: "" },
    examples: [],
  });

  const session = sessionData?.session;
  const isHost = session?.host?.clerkId === user?.id;
  const isParticipant = session?.participant?.clerkId === user?.id;

  const { call, channel, chatClient, isInitializingCall, streamClient } = useStreamClient(
    session,
    loadingSession,
    isHost,
    isParticipant
  );

  // find the problem data based on session problem title
  const problemData = session?.customProblem
    ? session.customProblem
    : session?.problem
    ? Object.values(PROBLEMS).find((p) => p.title === session.problem)
    : null;

  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState(problemData?.starterCode?.[selectedLanguage] || "");

  // auto-join session if user is not already a participant and not the host
  useEffect(() => {
    if (!session || !user || loadingSession) return;
    if (isHost || isParticipant) return;

    joinSessionMutation.mutate(id, { onSuccess: refetch });

    // remove the joinSessionMutation, refetch from dependencies to avoid infinite loop
  }, [session, user, loadingSession, isHost, isParticipant, id]);

  // redirect the "participant" when session ends
  useEffect(() => {
    if (!session || loadingSession) return;

    if (session.status === "completed") navigate("/dashboard");
  }, [session, loadingSession, navigate]);

  // update code when problem loads or changes
  useEffect(() => {
    if (problemData?.starterCode?.[selectedLanguage]) {
      setCode(problemData.starterCode[selectedLanguage]);
    }
  }, [problemData, selectedLanguage]);

  // --- ANTI-CHEAT LOGIC ---
  const handleCandidateViolation = async (type) => {
    if (!isParticipant || !channel) return;

    const messageText =
      type === "tab_switch"
        ? "⚠️ [Hệ thống cảnh báo] Ứng viên vừa chuyển sang tab/cửa sổ khác!"
        : "⚠️ [Hệ thống cảnh báo] Ứng viên vừa thực hiện hành vi Dán (Paste) code vào trình soạn thảo!";

    try {
      await channel.sendMessage({
        text: messageText,
      });
      toast.error(
        type === "tab_switch"
          ? "Cảnh báo: Không chuyển sang tab/cửa sổ khác!"
          : "Cảnh báo: Hành vi dán (paste) code đã bị ghi nhận!",
        { duration: 5000 }
      );
    } catch (e) {
      console.log("Failed to send violation message", e);
    }
  };

  useEffect(() => {
    if (!isParticipant || !channel) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleCandidateViolation("tab_switch");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isParticipant, channel]);

  // --- SOCKET.IO REAL-TIME COLLABORATION ---
  useEffect(() => {
    if (!session || !user || !id) return;

    socket.connect();
    socket.emit("join_room", id);

    socket.on("code_update", ({ code: newCode }) => {
      setCode(newCode);
    });

    socket.on("language_update", ({ language: newLanguage }) => {
      setSelectedLanguage(newLanguage);
    });

    return () => {
      socket.off("code_update");
      socket.off("language_update");
      socket.disconnect();
    };
  }, [id, session, user]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    socket.emit("language_change", { sessionId: id, language: newLang });

    // use problem-specific starter code
    const starterCode = problemData?.starterCode?.[newLang] || "";
    setCode(starterCode);
    socket.emit("code_change", { sessionId: id, code: starterCode });
    setOutput(null);
  };

  const handleCodeChange = (value) => {
    setCode(value);
    socket.emit("code_change", { sessionId: id, code: value });
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput(null);

    const result = await executeCode(selectedLanguage, code);
    setOutput(result);
    setIsRunning(false);
  };

  const handleEndSession = () => {
    if (confirm("Bạn có chắc chắn muốn kết thúc Session này? Tất cả người tham gia sẽ được thông báo.")) {
      // this will navigate the HOST to dashboard
      endSessionMutation.mutate(id, { onSuccess: () => navigate("/dashboard") });
    }
  };

  const handleStartCodeTest = () => {
    let payloadData = {};
    if (activeTab === "library") {
      if (!selectedProblem) return;
      const problemObj = Object.values(PROBLEMS).find((p) => p.title === selectedProblem);
      if (!problemObj) return;
      payloadData = { problem: problemObj.title, difficulty: problemObj.difficulty.toLowerCase() };
    } else {
      if (!customProblem.title) return;
      payloadData = { customProblem };
    }

    startCodeTestMutation.mutate(
      {
        id,
        data: payloadData,
      },
      {
        onSuccess: () => {
          setShowCodeTestModal(false);
          refetch(); // Ensure immediate update
        },
      }
    );
  };

  const renderVideoCall = () => (
    <div className="h-full bg-base-200 p-4 overflow-auto">
      {isInitializingCall ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Loader2Icon className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
            <p className="text-lg">Đang kết nối Video Call...</p>
          </div>
        </div>
      ) : !streamClient || !call ? (
        <div className="h-full flex items-center justify-center">
          <div className="card bg-base-100 shadow-xl max-w-md">
            <div className="card-body items-center text-center">
              <div className="w-24 h-24 bg-error/10 rounded-full flex items-center justify-center mb-4">
                <PhoneOffIcon className="w-12 h-12 text-error" />
              </div>
              <h2 className="card-title text-2xl">Kết nối thất bại</h2>
              <p className="text-base-content/70">Không thể kết nối vào Video Call</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full">
          <StreamVideo client={streamClient}>
            <StreamCall call={call}>
              <VideoCallUI chatClient={chatClient} channel={channel} />
            </StreamCall>
          </StreamVideo>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col">
        {!session?.isCodeTestMode ? (
          <div className="h-full flex flex-col">
            {/* TOOLBAR FOR INTERVIEW MODE */}
            <div className="bg-base-100 border-b border-base-300 p-4 flex justify-between items-center shadow-sm z-10">
               <div>
                  <h1 className="text-xl font-bold">Chế độ phỏng vấn</h1>
                  <p className="text-sm text-base-content/60">Giao tiếp với ứng viên trước khi làm bài</p>
               </div>
               <div className="flex items-center gap-3">
                 {isHost && session?.status === "active" && (
                   <>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowCodeTestModal(true)}
                    >
                      <Code2Icon className="size-5" /> Bắt đầu Test Code
                    </button>
                    <button
                      onClick={handleEndSession}
                      disabled={endSessionMutation.isPending}
                      className="btn btn-error gap-2"
                    >
                      {endSessionMutation.isPending ? (
                        <Loader2Icon className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOutIcon className="w-4 h-4" />
                      )}
                      Kết thúc Session
                    </button>
                   </>
                 )}
                 {session?.status === "completed" && (
                   <span className="badge badge-ghost badge-lg">Đã hoàn thành</span>
                 )}
               </div>
            </div>
            
            {/* VIDEO CALL CONTAINER */}
            <div className="flex-1 overflow-hidden">
              {renderVideoCall()}
            </div>
          </div>
        ) : (
          <PanelGroup direction="horizontal">
          {/* LEFT PANEL - CODE EDITOR & PROBLEM DETAILS */}
          <Panel defaultSize={50} minSize={30}>
            <PanelGroup direction="vertical">
              {/* PROBLEM DSC PANEL */}
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full overflow-y-auto bg-base-200">
                  {/* HEADER SECTION */}
                  <div className="p-6 bg-base-100 border-b border-base-300">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h1 className="text-3xl font-bold text-base-content">
                          {session?.problem || "Đang tải..."}
                        </h1>
                        {problemData?.category && (
                          <p className="text-base-content/60 mt-1">{problemData.category}</p>
                        )}
                        <p className="text-base-content/60 mt-2">
                          Host: {session?.host?.name || "Đang tải..."} •{" "}
                          {session?.participant ? 2 : 1}/2 người tham gia
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`badge badge-lg ${getDifficultyBadgeClass(
                            session?.difficulty
                          )}`}
                        >
                          {session?.difficulty.slice(0, 1).toUpperCase() +
                            session?.difficulty.slice(1) || "Easy"}
                        </span>
                        {isHost && session?.status === "active" && (
                          <button
                            onClick={handleEndSession}
                            disabled={endSessionMutation.isPending}
                            className="btn btn-error btn-sm gap-2"
                          >
                            {endSessionMutation.isPending ? (
                              <Loader2Icon className="w-4 h-4 animate-spin" />
                            ) : (
                              <LogOutIcon className="w-4 h-4" />
                            )}
                            Kết thúc Session
                          </button>
                        )}
                        {session?.status === "completed" && (
                          <span className="badge badge-ghost badge-lg">Đã hoàn thành</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* problem desc */}
                    {problemData?.description && (
                      <div className="bg-base-100 rounded-xl shadow-sm p-5 border border-base-300">
                        <h2 className="text-xl font-bold mb-4 text-base-content">Mô tả</h2>
                        <div className="space-y-3 text-base leading-relaxed">
                          <p className="text-base-content/90">{problemData.description.text}</p>
                          {problemData.description.notes?.map((note, idx) => (
                            <p key={idx} className="text-base-content/90">
                              {note}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* examples section */}
                    {problemData?.examples && problemData.examples.length > 0 && (
                      <div className="bg-base-100 rounded-xl shadow-sm p-5 border border-base-300">
                        <h2 className="text-xl font-bold mb-4 text-base-content">Ví dụ</h2>

                        <div className="space-y-4">
                          {problemData.examples.map((example, idx) => (
                            <div key={idx}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="badge badge-sm">{idx + 1}</span>
                                <p className="font-semibold text-base-content">Ví dụ {idx + 1}</p>
                              </div>
                              <div className="bg-base-200 rounded-lg p-4 font-mono text-sm space-y-1.5">
                                <div className="flex gap-2">
                                  <span className="text-primary font-bold min-w-[70px]">
                                    Input:
                                  </span>
                                  <span>{example.input}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-secondary font-bold min-w-[70px]">
                                    Output:
                                  </span>
                                  <span>{example.output}</span>
                                </div>
                                {example.explanation && (
                                  <div className="pt-2 border-t border-base-300 mt-2">
                                    <span className="text-base-content/60 font-sans text-xs">
                                      <span className="font-semibold">Giải thích:</span>{" "}
                                      {example.explanation}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Constraints */}
                    {problemData?.constraints && problemData.constraints.length > 0 && (
                      <div className="bg-base-100 rounded-xl shadow-sm p-5 border border-base-300">
                        <h2 className="text-xl font-bold mb-4 text-base-content">Ràng buộc</h2>
                        <ul className="space-y-2 text-base-content/90">
                          {problemData.constraints.map((constraint, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-primary">•</span>
                              <code className="text-sm">{constraint}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle className="h-2 bg-base-300 hover:bg-primary transition-colors cursor-row-resize" />

              <Panel defaultSize={50} minSize={20}>
                <PanelGroup direction="vertical">
                  <Panel defaultSize={70} minSize={30}>
                    <CodeEditorPanel
                      selectedLanguage={selectedLanguage}
                      code={code}
                      isRunning={isRunning}
                      onLanguageChange={handleLanguageChange}
                      onCodeChange={handleCodeChange}
                      onRunCode={handleRunCode}
                      onPasteCode={() => handleCandidateViolation("paste")}
                    />
                  </Panel>

                  <PanelResizeHandle className="h-2 bg-base-300 hover:bg-primary transition-colors cursor-row-resize" />

                  <Panel defaultSize={30} minSize={15}>
                    <OutputPanel output={output} />
                  </Panel>
                </PanelGroup>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-2 bg-base-300 hover:bg-primary transition-colors cursor-col-resize" />

          {/* RIGHT PANEL - VIDEO CALLS & CHAT */}
          <Panel defaultSize={50} minSize={30}>
            {renderVideoCall()}
          </Panel>
        </PanelGroup>
        )}
      </div>

      {/* CODE TEST MODAL */}
      {showCodeTestModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Bắt đầu Test Code</h3>

            {/* TABS */}
            <div className="tabs tabs-boxed mb-6">
              <button 
                className={`tab gap-2 flex-1 ${activeTab === 'library' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab("library")}
              >
                <BookOpenIcon className="size-4" /> Từ thư viện
              </button>
              <button 
                className={`tab gap-2 flex-1 ${activeTab === 'custom' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab("custom")}
              >
                <Edit3Icon className="size-4" /> Tự soạn đề
              </button>
            </div>

            <div className="space-y-6">
              {activeTab === "library" ? (
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Chọn bài tập cho ứng viên</span>
                  </label>
                  <select 
                    className="select select-bordered w-full"
                    value={selectedProblem}
                    onChange={(e) => setSelectedProblem(e.target.value)}
                  >
                    <option value="" disabled>Chọn một bài tập...</option>
                    {Object.values(PROBLEMS).map((p) => (
                      <option key={p.id} value={p.title}>{p.title} ({p.difficulty})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <CustomProblemForm 
                  customProblem={customProblem} 
                  setCustomProblem={setCustomProblem} 
                />
              )}
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowCodeTestModal(false)}>Hủy</button>
              <button 
                className="btn btn-primary" 
                disabled={
                  startCodeTestMutation.isPending || 
                  (activeTab === "library" ? !selectedProblem : !customProblem.title)
                }
                onClick={handleStartCodeTest}
              >
                {startCodeTestMutation.isPending ? <Loader2Icon className="size-5 animate-spin" /> : <Code2Icon className="size-5" />}
                Xác nhận
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCodeTestModal(false)}></div>
        </div>
      )}
    </div>
  );
}

export default SessionPage;