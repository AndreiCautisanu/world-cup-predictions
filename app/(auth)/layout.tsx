export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-8 text-center">⚽ Cupa Mondiala</h1>
        {children}
      </div>
    </div>
  );
}
