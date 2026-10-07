import { Link } from "react-router-dom";
import { PageHeader } from "./ui";

const TOOLS = [
  {
    to: "/tools/cable-fill",
    title: "Cable fill",
    description: "NEC Chapter 9 conduit fill, bend radius, and jam ratio for the run in front of you.",
  },
  {
    to: "/tools/ups",
    title: "UPS",
    description: "IT watts to a VA tier, load percent against an 80% ceiling, and battery runtime.",
  },
] as const;

export function ToolsIndex() {
  return (
    <div>
      <PageHeader
        eyebrow="Session calculators"
        title="Tools"
        description="Checks you can print or copy. Nothing here is saved to a project, brief, or bill of materials."
      />
      <ul className="overflow-hidden rounded-sm border border-rule bg-white">
        {TOOLS.map((tool) => (
          <li key={tool.to} className="border-b border-rule last:border-0">
            <Link to={tool.to} className="block px-4 py-4 hover:bg-paper sm:px-5 sm:py-5">
              <p className="font-serif text-2xl tracking-tight">{tool.title}</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">{tool.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
