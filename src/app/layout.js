import "../styles/globals.css";

export const metadata = {
  title: "Daymark — Event Tracker & Countdown",
  description: "Self-hosted mobile-friendly event countdown and count-up tracker with Telegram reminders.",
  manifest: "/manifest.json",
  themeColor: "#0b0c16",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Daymark"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="glowing-orb orb-1"></div>
        <div className="glowing-orb orb-2"></div>
        {children}
      </body>
    </html>
  );
}
