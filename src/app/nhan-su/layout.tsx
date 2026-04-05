import AdminSidebar from "@/components/AdminSidebar";

export default function NhanSuLayout({
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
