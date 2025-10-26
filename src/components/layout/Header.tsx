// src/components/layout/Header.tsx
export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 h-16 fixed top-0 left-64 right-0 z-10">
      <div className="flex items-center justify-between h-full px-6">
        <h2 className="text-xl font-semibold text-gray-800">Employee Management</h2>
        <div className="text-sm text-gray-600">Super Admin</div>
      </div>
    </header>
  );
}
