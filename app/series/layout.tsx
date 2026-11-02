import type { Metadata } from "next";
import SeriesShell from "@/components/series/Shell";

export const metadata: Metadata = {
  title: "GMAT Verbal Test Series — sazzag",
  description: "Thirty-two timed GMAT Verbal tests with question and time analytics.",
};

export default function SeriesLayout({ children }: { children: React.ReactNode }) {
  return <SeriesShell>{children}</SeriesShell>;
}
