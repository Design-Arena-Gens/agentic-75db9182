export const metadata = {
  title: 'YouTube Shorts Generator',
  description: 'Turn any video into vertical YouTube Shorts in your browser.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-neutral-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
