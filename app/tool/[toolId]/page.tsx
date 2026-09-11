"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

import PdfToWordWorkspace from "@/components/PdfToWordWorkspace";
import PdfImageWorkspace from "@/components/PdfImageWorkspace";
import WordToPdfWorkspace from "@/components/WordToPdfWorkspace";
import CompressWorkspace from "@/components/CompressWorkspace";

// react-pdf touches browser-only globals (DOMMatrix) at module-eval time, so
// any component that renders PDF thumbnails (directly or via MergeResult)
// must be excluded from SSR.
const MergeWorkspace = dynamic(() => import("@/components/MergeWorkspace"), { ssr: false });
const SplitWorkspace = dynamic(() => import("@/components/SplitWorkspace"), { ssr: false });
const TranslateWorkspace = dynamic(() => import("@/components/TranslateWorkspace"), { ssr: false });
const ImageConvertWorkspace = dynamic(() => import("@/components/ImageConvertWorkspace"), { ssr: false });

// Tools whose workspace renders a full-bleed grid editor (toolbar + card
// grid) rather than a centered card — they get the wider background wrapper.
const GRID_WORKSPACE_TOOLS = new Set(["merge", "split", "pdf-to-image", "image-to-pdf"]);

export default function ToolPage() {
  const params = useParams();
  const toolId = params.toolId as string;

  // Every workspace owns its own upload step (dropzone shown when it has no
  // file yet) — there is no separate generic "pick a file first" screen, so
  // choosing a file is always exactly one step, the same way for every tool.
  let workspace: ReactNode;
  switch (toolId) {
    case "merge":
      workspace = <MergeWorkspace />;
      break;
    case "split":
      workspace = <SplitWorkspace />;
      break;
    case "compress":
      workspace = <CompressWorkspace />;
      break;
    case "word-to-pdf":
      workspace = <WordToPdfWorkspace />;
      break;
    case "pdf-to-image":
    case "image-to-pdf":
      workspace = <PdfImageWorkspace initialMode={toolId === "image-to-pdf" ? "image-to-pdf" : "pdf-to-image"} />;
      break;
    case "convert-image":
      workspace = <ImageConvertWorkspace mode="convert" />;
      break;
    case "compress-image":
      workspace = <ImageConvertWorkspace mode="compress" />;
      break;
    case "translate":
      workspace = <TranslateWorkspace />;
      break;
    case "pdf-to-word":
      workspace = <PdfToWordWorkspace />;
      break;
    default:
      workspace = (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <h3>Công cụ không tồn tại</h3>
        </div>
      );
  }

  return <div className={GRID_WORKSPACE_TOOLS.has(toolId) ? "merge-workspace-wrapper" : "tool-workspace"}>{workspace}</div>;
}
