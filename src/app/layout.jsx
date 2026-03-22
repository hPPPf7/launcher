import "./globals.css";

export const metadata = {
  title: "Launcher",
  description: "Desktop platform launcher",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
