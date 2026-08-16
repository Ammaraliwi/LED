export default function AdminLoading() {
  return <div className="space-y-6"><div className="skeleton h-10 w-64 rounded-xl" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton h-32 rounded-2xl" />)}</div><div className="skeleton h-96 rounded-2xl" /></div>;
}
