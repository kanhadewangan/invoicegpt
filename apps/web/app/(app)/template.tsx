// Templates remount on navigation (layouts don't), so each page gets the shared entrance.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-enter">{children}</div>;
}
