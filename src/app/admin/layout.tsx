import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminSidebar />
      <main className="ml-[260px] min-h-screen">
        {children}
      </main>
    </>
  );
}
