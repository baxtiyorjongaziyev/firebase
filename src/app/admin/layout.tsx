export const metadata = {
  title: 'Sanity Studio | Jon.Branding Admin',
  description: 'Manage content for Jon.Branding website',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-white">
          {children}
        </div>
      </body>
    </html>
  );
}
