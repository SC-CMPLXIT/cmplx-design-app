import { Navigate, Route, Routes } from "react-router-dom";
import { BriefEditor } from "./components/BriefEditor";
import { CableFillCalculator } from "./components/CableFillCalculator";
import { Gate } from "./components/Gate";
import { ToolsIndex } from "./components/ToolsIndex";
import { UpsCalculator } from "./components/UpsCalculator";
import { ProjectDetail } from "./components/ProjectDetail";
import { ProjectForm } from "./components/ProjectForm";
import { ProjectList } from "./components/ProjectList";
import { AuthProvider } from "./lib/auth";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Gate />}>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/new" element={<ProjectForm />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/projects/:projectId/brief" element={<BriefEditor />} />
          <Route path="/tools" element={<ToolsIndex />} />
          <Route path="/tools/cable-fill" element={<CableFillCalculator />} />
          <Route path="/tools/ups" element={<UpsCalculator />} />
        </Route>
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </AuthProvider>
  );
}
