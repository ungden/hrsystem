import EmployeeSidebar from "@/components/EmployeeSidebar";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <EmployeeSidebar />
      <main className="ml-[260px] min-h-screen">
        {children}
      </main>
    </>
  );
}
